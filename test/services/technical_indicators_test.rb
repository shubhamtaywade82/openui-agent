# frozen_string_literal: true

require "minitest/autorun"
require_relative "../../app/services/technical_indicators"

class TechnicalIndicatorsTest < Minitest::Test
  def test_ema_of_constant_series_is_that_constant
    assert_in_delta 5.0, TechnicalIndicators.ema([ 5.0 ] * 30, 20), 1e-9
  end

  def test_ema_needs_at_least_period_values
    assert_nil TechnicalIndicators.ema([ 1.0, 2.0 ], 20)
  end

  def test_rsi_is_100_when_price_only_rises
    assert_in_delta 100.0, TechnicalIndicators.rsi((1..30).map(&:to_f)), 1e-9
  end

  def test_rsi_is_0_when_price_only_falls
    assert_in_delta 0.0, TechnicalIndicators.rsi((1..30).map { |i| 100.0 - i }), 1e-9
  end

  def test_rsi_matches_wilder_reference_series
    closes = [ 44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.10, 45.42, 45.84, 46.08,
               45.89, 46.03, 45.61, 46.28, 46.28, 46.00, 46.03, 46.41, 46.22, 45.64 ]
    assert_in_delta 57.9, TechnicalIndicators.rsi(closes), 0.5
  end

  def test_atr_of_fixed_range_candles_equals_the_range
    candles = Array.new(20) { { high: 12.0, low: 10.0, close: 11.0 } }
    assert_in_delta 2.0, TechnicalIndicators.atr(candles), 1e-9
  end

  def test_vwap_weights_price_by_volume
    candles = [ { high: 10.0, low: 10.0, close: 10.0, volume: 1.0 }, { high: 20.0, low: 20.0, close: 20.0, volume: 3.0 } ]
    assert_in_delta 17.5, TechnicalIndicators.vwap(candles), 1e-9
  end

  def test_vwap_is_nil_without_volume
    assert_nil TechnicalIndicators.vwap([ { high: 1.0, low: 1.0, close: 1.0, volume: 0.0 } ])
  end
end
