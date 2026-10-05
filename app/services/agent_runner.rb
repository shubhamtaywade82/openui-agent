# frozen_string_literal: true

# Orchestrates agent retrieval or instantiation, executing synchronous or streaming requests
class AgentRunner
  attr_reader :agent_class

  def initialize(message:, chat_id: nil, agent_class: UiAgent)
    @chat_id     = chat_id
    @message     = message.to_s
    @agent_class = agent_class
  end

  def call
    agent = find_or_create_agent
    response = agent.ask(@message)
    [ agent, response ]
  end

  def call_with_stream(&block)
    agent = find_or_create_agent
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
end
