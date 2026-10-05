# frozen_string_literal: true

# Orchestrates agent retrieval or instantiation, executing synchronous or streaming requests
class AgentRunner
  # Local qwen keeps re-calling tools (or calls UI components like `root` as tools) and never
  # emits the final openui-lang text; stripping tools forces a plain-text answer.
  MAX_TOOL_ROUNDS = 3
  UNKNOWN_TOOL_ERROR = "Model tried to call unavailable tool"

  attr_reader :agent_class

  def initialize(message:, chat_id: nil, agent_class: UiAgent)
    @chat_id     = chat_id
    @message     = message.to_s
    @agent_class = agent_class
  end

  def call
    agent = find_or_create_agent
    limit_tool_rounds(agent)
    response = agent.ask(@message)
    [ agent, response ]
  end

  def call_with_stream(&block)
    agent = find_or_create_agent
    limit_tool_rounds(agent)
    agent.ask(@message, &block)
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

  def limit_tool_rounds(agent)
    rounds = 0
    agent.after_tool_result do |result|
      rounds += 1
      unknown_tool = result.is_a?(Hash) && result[:error].to_s.start_with?(UNKNOWN_TOOL_ERROR)
      agent.to_llm.tools.clear if unknown_tool || rounds >= MAX_TOOL_ROUNDS
    end
  end
end
