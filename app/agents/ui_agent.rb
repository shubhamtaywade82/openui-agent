class UiAgent < RubyLLM::Agent
  chat_model Chat
  model ENV.fetch("OLLAMA_MODEL", "qwen3.5-openui:latest"), provider: :ollama

  instructions { File.read(Rails.root.join("config/system_prompt_openui.txt")) }

  tools WeatherTool, CurrentTimeTool, CalculatorTool, SearchDocsTool
  temperature 0.3
end
