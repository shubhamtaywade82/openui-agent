# frozen_string_literal: true

require "net/http"
require "json"
require "uri"

# Tool to fetch live Binance crypto market data (ticker, klines, order book depth)
class BinanceTool < ApplicationTool
  description "Fetch live crypto prices, 24hr statistics, candlestick history, or order book depth from Binance."

  param :symbol, type: :string, desc: "Crypto trading pair, e.g. 'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'"
  param :action, type: :string, desc: "Action: 'ticker_24h' (default), 'price', 'klines', 'depth'", required: false

  BASE_URL = "https://api.binance.com/api/v3"

  def execute(symbol:, action: "ticker_24h")
    sym = sanitize_symbol(symbol)
    return error_result("Invalid trading symbol") if sym.blank?

    case action.to_s.downcase
    when "price"
      fetch_price(sym)
    when "klines"
      fetch_klines(sym)
    when "depth"
      fetch_depth(sym)
    else
      fetch_ticker_24h(sym)
    end
  rescue StandardError => e
    error_result("Binance error: #{e.message}")
  end

  private

  def sanitize_symbol(sym)
    clean = sym.to_s.upcase.strip.gsub(/[^A-Z0-9]/, "")
    clean += "USDT" unless clean.end_with?("USDT", "BTC", "ETH", "BNB", "EUR", "FDUSD")
    clean
  end

  def fetch_ticker_24h(sym)
    data = fetch_json("/ticker/24hr?symbol=#{sym}")
    return error_result("Symbol not found: #{sym}") unless data.is_a?(Hash) && data["symbol"]

    {
      symbol: data["symbol"],
      price: data["lastPrice"].to_f,
      price_change: data["priceChange"].to_f,
      change_percent: data["priceChangePercent"].to_f,
      high_24h: data["highPrice"].to_f,
      low_24h: data["lowPrice"].to_f,
      volume: data["volume"].to_f.round(2),
      quote_volume: data["quoteVolume"].to_f.round(2),
      bid: data["bidPrice"].to_f,
      ask: data["askPrice"].to_f
    }
  end

  def fetch_price(sym)
    data = fetch_json("/ticker/price?symbol=#{sym}")
    return error_result("Symbol not found: #{sym}") unless data.is_a?(Hash) && data["price"]

    { symbol: data["symbol"], price: data["price"].to_f }
  end

  def fetch_klines(sym)
    data = fetch_json("/klines?symbol=#{sym}&interval=1h&limit=12")
    return error_result("Unable to fetch klines") unless data.is_a?(Array)

    candles = data.map do |c|
      time = Time.at(c[0] / 1000).utc.strftime("%H:%M")
      { time: time, open: c[1].to_f, high: c[2].to_f, low: c[3].to_f, close: c[4].to_f, volume: c[5].to_f.round(2) }
    end
    { symbol: sym, interval: "1h", candles: candles }
  end

  def fetch_depth(sym)
    data = fetch_json("/depth?symbol=#{sym}&limit=5")
    return error_result("Unable to fetch orderbook depth") unless data.is_a?(Hash)

    bids = data["bids"].map { |b| { price: b[0].to_f, qty: b[1].to_f } }
    asks = data["asks"].map { |a| { price: a[0].to_f, qty: a[1].to_f } }
    { symbol: sym, bids: bids, asks: asks }
  end

  def fetch_json(path)
    uri = URI("#{BASE_URL}#{path}")
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true
    http.open_timeout = 4
    http.read_timeout = 5

    res = http.request(Net::HTTP::Get.new(uri))
    return nil unless res.is_a?(Net::HTTPSuccess)

    JSON.parse(res.body)
  end
end
