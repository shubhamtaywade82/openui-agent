class UiAgent < RubyLLM::Agent
  chat_model Chat
  model ENV.fetch("OLLAMA_MODEL", "qwen3.5-openui:latest"), provider: :ollama

  instructions { File.read(Rails.root.join("config/system_prompt_openui.txt")) }

  tools WeatherTool, CurrentTimeTool, CalculatorTool, SearchDocsTool,
        WebSearchTool, WebScrapeTool, StockQuoteTool, TaskManagerTool
  temperature 0.3
  params options: { num_ctx: 32_768 }
end
