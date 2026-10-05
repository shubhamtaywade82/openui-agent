# frozen_string_literal: true

# Pure indicator math over price series ordered oldest to newest; every method returns nil when the
# series is too short, so callers never publish a number built on too little data.
module TechnicalIndicators
  module_function

  # Exponential moving average of the whole series, seeded with the simple average of the first `period`.
  def ema(values, period)
    return nil if values.size < period

    multiplier = 2.0 / (period + 1)
    values.drop(period).reduce(values.first(period).sum / period) do |previous, value|
      (value - previous) * multiplier + previous
    end
  end

  # Wilder's relative strength index on closing prices.
  def rsi(closes, period = 14)
    return nil if closes.size <= period

    changes = closes.each_cons(2).map { |previous, current| current - previous }
    average_gain = changes.first(period).map { |change| [ change, 0 ].max }.sum / period
    average_loss = changes.first(period).map { |change| [ -change, 0 ].max }.sum / period

    changes.drop(period).each do |change|
      average_gain = (average_gain * (period - 1) + [ change, 0 ].max) / period
      average_loss = (average_loss * (period - 1) + [ -change, 0 ].max) / period
    end

    return 100.0 if average_loss.zero?

    100 - 100 / (1 + average_gain / average_loss)
  end

  # Wilder's average true range; candles are hashes with :high, :low and :close.
  def atr(candles, period = 14)
    return nil if candles.size <= period

    true_ranges = candles.each_cons(2).map do |previous, current|
      [ current[:high] - current[:low], (current[:high] - previous[:close]).abs, (current[:low] - previous[:close]).abs ].max
    end
    true_ranges.drop(period).reduce(true_ranges.first(period).sum / period) do |average, true_range|
      (average * (period - 1) + true_range) / period
    end
  end

  # Volume-weighted average price over the given candles (:high, :low, :close, :volume).
  def vwap(candles)
    total_volume = candles.sum { |candle| candle[:volume] }
    return nil if total_volume.zero?

    candles.sum { |candle| (candle[:high] + candle[:low] + candle[:close]) / 3 * candle[:volume] } / total_volume
  end
end
