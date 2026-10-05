# frozen_string_literal: true

class StockQuoteTool < ApplicationTool
  description "Fetch current stock market quote, price, daily change, and volume for a symbol."

  param :symbol, type: :string, desc: "Stock ticker symbol (e.g. AAPL, MSFT, GOOGL, NVDA, TSLA)"

  MOCK_PRICES = {
    "AAPL" => { name: "Apple Inc.", price: 228.40, change: 1.85, change_percent: 0.82 },
    "MSFT" => { name: "Microsoft Corporation", price: 425.10, change: -2.30, change_percent: -0.54 },
    "GOOGL" => { name: "Alphabet Inc.", price: 168.20, change: 3.10, change_percent: 1.88 },
    "NVDA" => { name: "NVIDIA Corporation", price: 124.60, change: 4.50, change_percent: 3.75 },
    "TSLA" => { name: "Tesla, Inc.", price: 218.80, change: -5.40, change_percent: -2.41 }
  }.freeze

  def execute(symbol:)
    sym = symbol.to_s.upcase.strip
    quote = MOCK_PRICES[sym] || generate_quote(sym)
    quote.merge(symbol: sym, currency: "USD", updated_at: Time.current.iso8601)
  end

  private

  # Generates realistic mock metrics for arbitrary symbols without external API keys
  def generate_quote(sym)
    base = rand(50.0..500.0).round(2)
    pct  = rand(-4.5..5.5).round(2)
    diff = (base * (pct / 100.0)).round(2)

    {
      name: "#{sym} Corp",
      price: base,
      change: diff,
      change_percent: pct
    }
  end
end
