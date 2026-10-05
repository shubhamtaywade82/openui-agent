# frozen_string_literal: true

# Orchestrates agent retrieval or instantiation, executing synchronous or streaming requests
class AgentRunner
  # Local qwen keeps re-calling tools (or calls UI components like `root` as tools) and never
  # emits the final openui-lang text; stripping tools forces a plain-text answer.
  MAX_TOOL_ROUNDS = 3
  UNKNOWN_TOOL_ERROR = "Model tried to call unavailable tool"

  attr_reader :agent_class

  def initialize(message:, chat_id: nil, agent_class: UiAgent, options: {})
    @chat_id     = chat_id
    @message     = message.to_s
    @agent_class = agent_class
    @options     = options
  end

  def call
    agent = find_or_create_agent
    configure_llm(agent)
    limit_tool_rounds(agent)
    [ agent, agent.ask(@message) ]
  end

  def call_with_stream(on_tool_call: nil, on_tool_result: nil, &block)
    agent = find_or_create_agent
    configure_llm(agent)
    limit_tool_rounds(agent)
    report_tool_events(agent, on_tool_call, on_tool_result)
    answered = false
    track_content = proc do |chunk|
      answered ||= chunk.content.present?
      block.call(chunk)
    end
    agent.ask(@message, &track_content)
    recover_empty_reply(agent, &track_content) unless answered
    agent
  end

  def find_or_create_agent
    @find_or_create_agent ||=
      if @chat_id.present?
        @agent_class.find(@chat_id)
      else
        @agent_class.create!
      end
  end

  private

  def recover_empty_reply(agent, &block)
    answer = answer_from_thinking(agent)
    if answer.blank?
      retry_without_tools(agent, &block)
      answer = answer_from_thinking(agent)
    end
    block.call(RubyLLM::Chunk.new(role: :assistant, content: answer)) if answer.present?
  end

  # qwen3.5 often writes the finished openui-lang program into its thinking channel and leaves
  # `content` empty. Persisting it keeps the thread readable after a reload.
  def answer_from_thinking(agent)
    last_reply = agent.messages.reload.where(role: "assistant").order(:id).last
    return if last_reply.nil? || last_reply.content.present?

    program = last_reply.thinking_text.to_s[/^root\s*=.*/m]
    last_reply.update!(content: program) if program.present?
    program
  end

  # Last resort when the thinking text holds no answer either; with tools gone the model can only answer.
  # `complete` continues the conversation without adding a visible user message to the chat history.
  def retry_without_tools(agent, &block)
    Rails.logger.warn { "[AgentRunner] empty model reply for chat #{agent.id}; retrying once without tools" }
    agent.to_llm.tools.clear
    agent.complete(&block)
  end

  # Tool results carry no call id, so remember the id from the preceding call (tools run sequentially)
  def report_tool_events(agent, on_tool_call, on_tool_result)
    current_call_id = nil
    agent.before_tool_call do |tool_call|
      current_call_id = tool_call.id
      on_tool_call&.call(tool_call)
    end
    agent.after_tool_result { |result| on_tool_result&.call(current_call_id, result) }
  end

  def limit_tool_rounds(agent)
    rounds = 0
    agent.after_tool_result do |result|
      rounds += 1
      unknown_tool = result.is_a?(Hash) && result[:error].to_s.start_with?(UNKNOWN_TOOL_ERROR)
      agent.to_llm.tools.clear if unknown_tool || rounds >= MAX_TOOL_ROUNDS
    end
  end

  def configure_llm(agent)
    llm = agent.to_llm
    llm.with_model(@options[:model]) if @options[:model].present?
    llm.with_temperature(@options[:temperature].to_f) if @options[:temperature].present?
    llm.with_params(options: { num_ctx: @options[:num_ctx].to_i }) if @options[:num_ctx].present?
    filter_tools(llm) if @options[:disabled_tools].is_a?(Array)
  end

  def filter_tools(llm)
    keys = @options[:disabled_tools].map { |t| t.to_s.underscore.sub(/_tool$/, "").to_sym }
    llm.tools.except!(*keys)
  end
end
