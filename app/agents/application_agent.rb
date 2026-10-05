# frozen_string_literal: true

# Base agent providing shared configuration for local Ollama models and Chat persistence
class ApplicationAgent < RubyLLM::Agent
  chat_model Chat
  model ENV.fetch("OLLAMA_MODEL", "qwen3.5-openui:latest"), provider: :ollama
  temperature 0.3
  params options: { num_ctx: 32_768 }
end
