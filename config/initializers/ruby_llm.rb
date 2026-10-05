RubyLLM.configure do |config|
  config.use_new_acts_as = true
  config.ollama_api_base = ENV.fetch("OLLAMA_API_BASE", "http://localhost:11434/v1")
  config.default_model   = ENV.fetch("OLLAMA_MODEL", "llama3.2")
  config.logger          = Rails.logger
  config.instrumenter    = ActiveSupport::Notifications
end
