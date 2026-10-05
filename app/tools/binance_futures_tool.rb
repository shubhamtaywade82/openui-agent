# frozen_string_literal: true

require "net/http"
require "json"
require "uri"

# Tool for Binance USD-M perpetual futures analysis, using only public (keyless, read-only) endpoints
class BinanceFuturesTool < ApplicationTool
  description "Analyse Binance USD-M perpetual futures: mark/index price, funding rate, open interest, " \
              "long/short ratio, funding history, and technical indicators (RSI, EMA, ATR, VWAP). " \
              "Use for futures, perps, funding, open interest or leverage questions; use the spot binance tool otherwise."

  param :symbol, type: :string, desc: "Perpetual contract, e.g. 'BTCUSDT', 'ETHUSDT', 'SOLUSDT'"
  param :action, type: :string,
                 desc: "'overview' (default): price, funding, open interest, positioning. " \
                       "'indicators': RSI/EMA/ATR/VWAP from candles. 'multi_timeframe': RSI and EMA trend on 15m, 1h, 4h and 1d. " \
                       "'funding_history': last 10 funding payments.",
                 required: false
  param :interval, type: :string, desc: "Candle interval for 'indicators': 5m, 15m, 1h (default), 4h, 1d", required: false

  BASE_URL = "https://fapi.binance.com"
  INTERVALS = %w[5m 15m 1h 4h 1d].freeze
  DEFAULT_INTERVAL = "1h"
  CANDLE_LIMIT = 250 # enough history for the 200-period EMA
  FUNDING_HISTORY_LIMIT = 10
  # Field order must match the FuturesCard / IndicatorsCard signatures in the system prompt.
  OVERVIEW_CARD_FIELDS = %i[symbol mark_price funding_rate_percent open_interest_usd long_short_ratio
                            basis_percent change_percent_24h open_interest_change_24h_percent].freeze
  TIMEFRAMES = %w[15m 1h 4h 1d].freeze
  TIMEFRAME_FIELDS = %i[interval price rsi_14 ema_20 ema_50 ema_200].freeze
  INDICATOR_CARD_FIELDS = %i[symbol interval price rsi_14 ema_20 ema_50 ema_200 atr_percent vwap].freeze
  # A 4B local model ignores far-away prompt rules but copies what the tool result tells it to.
  FUNDING_CHART_LINE = ->(sym) { "fundingChart = FundingChart(\"#{sym}\")" }
  DISCLAIMER_LINE = 'disclaimer = TextContent("Analysis only, not financial advice.")'
  RENDER_INSTRUCTION = [
    DISCLAIMER_LINE,
    "Copy every line above exactly. Define root = Card([...]) once, listing those names plus one summary TextContent variable " \
    "of 2-4 sentences that uses only values from this result. Do not draw other charts, invent history values, or add buttons " \
    "for entries, exits or trade signals."
  ].freeze
  OPEN_INTEREST_WINDOW_HOURS = 25 # 25 hourly points span 24 hours

  def execute(symbol:, action: "overview", interval: DEFAULT_INTERVAL)
    sym = sanitize_symbol(symbol)
    return error_result("Invalid trading symbol") if sym.blank?

    case action.to_s.downcase
    when "indicators" then indicators(sym, INTERVALS.include?(interval) ? interval : DEFAULT_INTERVAL)
    when "multi_timeframe" then multi_timeframe(sym)
    when "funding_history" then funding_history(sym)
    else overview(sym)
    end
  rescue StandardError => e
    error_result("Binance futures error: #{e.message}")
  end

  private

  def sanitize_symbol(symbol)
    clean = symbol.to_s.upcase.gsub(/[^A-Z0-9]/, "")
    clean.end_with?("USDT", "USDC") ? clean : "#{clean}USDT"
  end

  def overview(sym)
    premium = fetch_json("/fapi/v1/premiumIndex?symbol=#{sym}")
    return error_result("Futures contract not found: #{sym}") unless premium.is_a?(Hash) && premium["markPrice"]

    data = price_snapshot(sym, premium).merge(ticker_24h(sym)).merge(open_interest(sym)).merge(long_short_ratio(sym))
    data.merge(render_as: [ "futuresCard = FuturesCard(#{dsl_args(data, OVERVIEW_CARD_FIELDS)})" ] + RENDER_INSTRUCTION)
  end

  def price_snapshot(sym, premium)
    mark = premium["markPrice"].to_f
    index = premium["indexPrice"].to_f
    {
      symbol: sym,
      mark_price: mark,
      index_price: index,
      basis_percent: index.zero? ? nil : ((mark - index) / index * 100).round(4),
      funding_rate_percent: (premium["lastFundingRate"].to_f * 100).round(4),
      next_funding_time: Time.at(premium["nextFundingTime"].to_i / 1000).utc.iso8601
    }
  end

  def ticker_24h(sym)
    data = fetch_json("/fapi/v1/ticker/24hr?symbol=#{sym}")
    return {} unless data.is_a?(Hash)

    {
      change_percent_24h: data["priceChangePercent"].to_f,
      high_24h: data["highPrice"].to_f,
      low_24h: data["lowPrice"].to_f,
      quote_volume_24h: data["quoteVolume"].to_f.round(0)
    }
  end

  def open_interest(sym)
    history = fetch_json("/futures/data/openInterestHist?symbol=#{sym}&period=1h&limit=#{OPEN_INTEREST_WINDOW_HOURS}")
    return {} unless history.is_a?(Array) && history.size >= 2

    first = history.first["sumOpenInterestValue"].to_f
    latest = history.last["sumOpenInterestValue"].to_f
    { open_interest_usd: latest.round(0), open_interest_change_24h_percent: first.zero? ? nil : ((latest - first) / first * 100).round(2) }
  end

  def long_short_ratio(sym)
    data = fetch_json("/futures/data/globalLongShortAccountRatio?symbol=#{sym}&period=1h&limit=1")
    return {} unless data.is_a?(Array) && data.first

    { long_short_ratio: data.first["longShortRatio"].to_f, long_account_percent: (data.first["longAccount"].to_f * 100).round(1) }
  end

  def indicators(sym, interval)
    data = indicator_values(sym, interval)
    return data if data[:error]

    lines = [ "indicatorsCard = IndicatorsCard(#{dsl_args(data, INDICATOR_CARD_FIELDS)})", "candleChart = CandleChart(\"#{sym}\", \"#{interval}\")" ]
    data.merge(render_as: lines + RENDER_INSTRUCTION)
  end

  def multi_timeframe(sym)
    rows = TIMEFRAMES.map { |interval| indicator_values(sym, interval) }
    return error_result("Not enough candle data for #{sym}") if rows.any? { |row| row[:error] }

    objects = rows.map { |row| "{#{TIMEFRAME_FIELDS.map { |field| "#{field}: #{dsl_value(row[field])}" }.join(', ')}}" }
    {
      symbol: sym, timeframes: rows.map { |row| row.slice(*TIMEFRAME_FIELDS) },
      render_as: [ "timeframesCard = TimeframesCard(\"#{sym}\", [#{objects.join(', ')}])", FUNDING_CHART_LINE.call(sym) ] + RENDER_INSTRUCTION
    }
  end

  def indicator_values(sym, interval)
    candles = fetch_candles(sym, interval)
    return error_result("Not enough candle data for #{sym} #{interval}") if candles.size < 50

    closes = candles.map { |candle| candle[:close] }
    atr = TechnicalIndicators.atr(candles)
    {
      symbol: sym, interval: interval, candles_used: candles.size, price: closes.last,
      rsi_14: round(TechnicalIndicators.rsi(closes)),
      ema_20: round(TechnicalIndicators.ema(closes, 20)),
      ema_50: round(TechnicalIndicators.ema(closes, 50)),
      ema_200: round(TechnicalIndicators.ema(closes, 200)),
      atr_14: round(atr),
      atr_percent: atr && (atr / closes.last * 100).round(2),
      vwap: round(TechnicalIndicators.vwap(candles))
    }
  end

  def funding_history(sym)
    rows = fetch_json("/fapi/v1/fundingRate?symbol=#{sym}&limit=#{FUNDING_HISTORY_LIMIT}")
    return error_result("Unable to fetch funding history for #{sym}") unless rows.is_a?(Array) && rows.any?

    rates = rows.map { |row| (row["fundingRate"].to_f * 100).round(4) }
    {
      symbol: sym,
      average_rate_percent: (rates.sum / rates.size).round(4),
      payments: rows.zip(rates).map { |row, rate| { time: Time.at(row["fundingTime"].to_i / 1000).utc.iso8601, rate_percent: rate } }
    }
  end

  def fetch_candles(sym, interval)
    rows = fetch_json("/fapi/v1/klines?symbol=#{sym}&interval=#{interval}&limit=#{CANDLE_LIMIT}")
    return [] unless rows.is_a?(Array)

    # The last row is the still-open candle; indicators use closed candles only.
    rows[0...-1].map do |row|
      { high: row[2].to_f, low: row[3].to_f, close: row[4].to_f, volume: row[5].to_f }
    end
  end

  # Positional openui-lang arguments; missing values become null.
  def dsl_args(data, fields)
    fields.map { |field| dsl_value(data[field]) }.join(", ")
  end

  def dsl_value(value)
    value.nil? ? "null" : value.to_json
  end

  def round(value)
    value&.round(6)
  end

  def fetch_json(path)
    uri = URI("#{BASE_URL}#{path}")
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true
    http.open_timeout = 4
    http.read_timeout = 6

    response = http.request(Net::HTTP::Get.new(uri))
    response.is_a?(Net::HTTPSuccess) ? JSON.parse(response.body) : nil
  end
end
