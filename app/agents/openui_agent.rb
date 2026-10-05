class OpenuiAgent < RubyLLM::Agent
  chat_model Chat
  model    ENV.fetch("OLLAMA_MODEL", "llama3.2")
  provider :ollama

  instructions { File.read(Rails.root.join("config/system_prompt_openui.txt")) }

  tools WeatherTool, CurrentTimeTool, CalculatorTool

  tool_options choice: :auto, calls: :many
  temperature 0.3
end
