# frozen_string_literal: true

# Processes long-running agent workflows asynchronously in background queue
class AgentRunJob < ApplicationJob
  queue_as :default

  def perform(chat_id, user_message, agent_class_name = "UiAgent")
    agent_class = agent_class_name.constantize
    agent = agent_class.find(chat_id)
    agent.ask(user_message)
    Rails.logger.info { "[AgentRunJob] Completed run for chat_id=#{chat_id}" }
  rescue ActiveRecord::RecordNotFound
    Rails.logger.warn { "[AgentRunJob] Chat #{chat_id} not found" }
  rescue StandardError => e
    Rails.logger.error { "[AgentRunJob] #{e.class}: #{e.message}" }
    raise
  end
end
