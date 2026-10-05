# frozen_string_literal: true

# Generative UI agent responsible for producing OpenUI Lang DSL responses
class UiAgent < ApplicationAgent
  instructions { File.read(Rails.root.join("config/system_prompt_openui.txt")) }

  tools WeatherTool, CurrentTimeTool, CalculatorTool, SearchDocsTool,
        WebSearchTool, WebScrapeTool, StockQuoteTool, TaskManagerTool,
        BinanceTool, BinanceFuturesTool
end
