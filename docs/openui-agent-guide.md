# OpenUI Agent guide

OpenUI Agent is a chat app where a local Ollama model answers with interface components (cards, charts, tables, forms) instead of plain text.

## How it works

The React frontend (`openui-frontend`, Vite on port 5173) posts the conversation to `POST /api/openui`. Rails runs the `UiAgent` with RubyLLM against Ollama, lets the model call tools, and streams the answer back as server-sent events. The answer is written in openui-lang, a small declarative language, which the frontend renders as live components. Chats and messages are stored in Postgres, so history survives reloads.

## Tools the agent can call

- **weather**: current conditions for a city from Open-Meteo, a free service that needs no API key.
- **stock_quote**: a stock price quote for a ticker such as AAPL.
- **binance**: Binance spot prices, 24-hour statistics, candles and order book depth.
- **binance_futures**: Binance USD-M perpetual futures. Actions are overview (mark price, funding rate, open interest, long/short ratio), indicators (RSI, EMA 20/50/200, ATR, VWAP), funding_history, and multi_timeframe.
- **task_manager**: list, create and complete tasks stored in the database.
- **search_docs**: keyword search over the markdown files in the `docs` folder.
- **web_search** and **web_scrape**: live web results and page text. They need TAVILY_API_KEY or BRAVE_API_KEY in `.env`.
- **calculator** and **current_time**.

## Futures analysis

Ask for an analysis of a perpetual contract, for example "Analyse BTCUSDT perpetual futures: funding, open interest, positioning and technicals". The answer shows a futures card, an indicator panel and a live candlestick chart. It uses public market data only, never places orders and is not financial advice.

## Choosing a model

Use the model picker inside the input box or the Settings panel. The list comes live from the models installed in Ollama. The choice is saved in the browser. The default model is set by OLLAMA_MODEL in `.env`.

## Troubleshooting

- **"The model did not return a response"**: the model finished without an answer. Try again, or pick a larger model.
- **"exceeds the available context size"**: the conversation plus the system prompt is larger than the model's context window. Use a model created with a larger num_ctx, for example qwen3.5-openui-32k, or start a new chat.
- **Charts or cards show errors in the Inspect panel**: the model used a wrong argument order. Retry, or check the Inspect panel's Debug view.
- **No web search results**: set TAVILY_API_KEY or BRAVE_API_KEY in `.env` and restart the server.
