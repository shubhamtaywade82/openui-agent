import { useEffect, useState } from "react"
import { defineComponent } from "@openuidev/react-lang"
import { z } from "zod"

const FUTURES_REST = "https://fapi.binance.com/fapi/v1"
const CANDLE_INTERVALS = ["5m", "15m", "1h", "4h", "1d"]
const CANDLE_COUNT = 60
const CHART_REFRESH_MS = 30_000
const RSI_OVERBOUGHT = 70
const RSI_OVERSOLD = 30

const nullableNumber = z.number().nullable().optional()
const compactUsd = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 2 })

const formatPrice = (value: number) =>
  value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: value < 1 ? 6 : 2 })
const signed = (value: number, digits = 2) => `${value >= 0 ? "+" : ""}${value.toFixed(digits)}`
const direction = (value: number) => (value >= 0 ? "up" : "down")

function Tile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="gen-fut__tile">
      <span className="gen-fut__label">{label}</span>
      <strong>{value}</strong>
      {note && <small>{note}</small>}
    </div>
  )
}

interface FuturesCardProps {
  symbol: string
  mark_price: number
  funding_rate_percent: number
  open_interest_usd?: number | null
  long_short_ratio?: number | null
  basis_percent?: number | null
  change_percent_24h?: number | null
  open_interest_change_24h_percent?: number | null
}

function FuturesCardView({ props }: { props: FuturesCardProps }) {
  const funding = props.funding_rate_percent
  const change = props.change_percent_24h

  return (
    <article className="gen-card gen-fut">
      <header className="gen-card__head">
        <div>
          <h4>{props.symbol}</h4>
          <span>USDT-M perpetual</span>
        </div>
        {change != null && <span className={`gen-fut__pill gen-fut__pill--${direction(change)}`}>{signed(change)}% 24h</span>}
      </header>
      <p className="gen-fut__price">${formatPrice(props.mark_price)}<small>mark</small></p>
      <div className="gen-fut__grid">
        <Tile
          label="Funding rate"
          value={`${signed(funding, 4)}%`}
          note={funding === 0 ? "Balanced" : funding > 0 ? "Longs pay shorts" : "Shorts pay longs"}
        />
        {props.basis_percent != null && (
          <Tile label="Basis (mark vs index)" value={`${signed(props.basis_percent, 3)}%`} note={props.basis_percent >= 0 ? "Premium" : "Discount"} />
        )}
        {props.open_interest_usd != null && (
          <Tile
            label="Open interest"
            value={`$${compactUsd.format(props.open_interest_usd)}`}
            note={props.open_interest_change_24h_percent != null ? `${signed(props.open_interest_change_24h_percent)}% in 24h` : undefined}
          />
        )}
        {props.long_short_ratio != null && (
          <Tile label="Long / short accounts" value={props.long_short_ratio.toFixed(2)} note={props.long_short_ratio >= 1 ? "More accounts long" : "More accounts short"} />
        )}
      </div>
    </article>
  )
}

export const FuturesCard = defineComponent({
  name: "FuturesCard",
  description:
    "Binance USD-M perpetual futures snapshot (mark price, funding, basis, open interest, long/short). Use after calling the binance_futures tool with action overview; pass its fields in this order.",
  props: z.object({
    symbol: z.string().describe("Contract, e.g. BTCUSDT"),
    mark_price: z.number().describe("mark_price from the tool"),
    funding_rate_percent: z.number().describe("funding_rate_percent from the tool"),
    open_interest_usd: nullableNumber.describe("open_interest_usd from the tool"),
    long_short_ratio: nullableNumber.describe("long_short_ratio from the tool"),
    basis_percent: nullableNumber.describe("basis_percent from the tool"),
    change_percent_24h: nullableNumber.describe("change_percent_24h from the tool"),
    open_interest_change_24h_percent: nullableNumber.describe("open_interest_change_24h_percent from the tool"),
  }),
  component: FuturesCardView,
})

interface IndicatorsCardProps {
  symbol: string
  interval: string
  price: number
  rsi_14?: number | null
  ema_20?: number | null
  ema_50?: number | null
  ema_200?: number | null
  atr_percent?: number | null
  vwap?: number | null
}

function rsiZone(rsi: number) {
  if (rsi >= RSI_OVERBOUGHT) return "Overbought"
  return rsi <= RSI_OVERSOLD ? "Oversold" : "Neutral"
}

function trendSummary(price: number, averages: Array<number | null | undefined>) {
  const known = averages.filter((value): value is number => value != null)
  if (known.length === 0) return null
  const above = known.filter((value) => price > value).length
  if (above === known.length) return { label: `Above all ${known.length} moving averages`, tone: "up" }
  if (above === 0) return { label: `Below all ${known.length} moving averages`, tone: "down" }
  return { label: `Mixed: above ${above} of ${known.length} moving averages`, tone: "flat" }
}

function IndicatorRow({ name, value, note }: { name: string; value: string; note?: string }) {
  return (
    <li>
      <span>{name}</span>
      <strong>{value}</strong>
      {note && <small>{note}</small>}
    </li>
  )
}

function IndicatorsCardView({ props }: { props: IndicatorsCardProps }) {
  const { price } = props
  const trend = trendSummary(price, [props.ema_20, props.ema_50, props.ema_200])
  const versus = (level: number) => `price ${price >= level ? "above" : "below"} (${signed(((price - level) / level) * 100)}%)`

  return (
    <article className="gen-card gen-fut">
      <header className="gen-card__head">
        <div>
          <h4>{props.symbol} indicators</h4>
          <span>{props.interval} candles</span>
        </div>
        {trend && <span className={`gen-fut__pill gen-fut__pill--${trend.tone}`}>{trend.label}</span>}
      </header>
      <ul className="gen-fut__rows">
        {props.rsi_14 != null && <IndicatorRow name="RSI (14)" value={props.rsi_14.toFixed(1)} note={rsiZone(props.rsi_14)} />}
        {props.ema_20 != null && <IndicatorRow name="EMA 20" value={formatPrice(props.ema_20)} note={versus(props.ema_20)} />}
        {props.ema_50 != null && <IndicatorRow name="EMA 50" value={formatPrice(props.ema_50)} note={versus(props.ema_50)} />}
        {props.ema_200 != null && <IndicatorRow name="EMA 200" value={formatPrice(props.ema_200)} note={versus(props.ema_200)} />}
        {props.vwap != null && <IndicatorRow name="VWAP" value={formatPrice(props.vwap)} note={versus(props.vwap)} />}
        {props.atr_percent != null && <IndicatorRow name="ATR (14)" value={`${props.atr_percent.toFixed(2)}% of price`} note="Typical candle range" />}
      </ul>
    </article>
  )
}

export const IndicatorsCard = defineComponent({
  name: "IndicatorsCard",
  description:
    "Technical indicator panel (RSI, EMA 20/50/200, VWAP, ATR) with trend and zone labels computed in code. Use after calling the binance_futures tool with action indicators; pass its fields in this order.",
  props: z.object({
    symbol: z.string().describe("Contract, e.g. BTCUSDT"),
    interval: z.string().describe("interval from the tool"),
    price: z.number().describe("price from the tool"),
    rsi_14: nullableNumber.describe("rsi_14 from the tool"),
    ema_20: nullableNumber.describe("ema_20 from the tool"),
    ema_50: nullableNumber.describe("ema_50 from the tool"),
    ema_200: nullableNumber.describe("ema_200 from the tool"),
    atr_percent: nullableNumber.describe("atr_percent from the tool"),
    vwap: nullableNumber.describe("vwap from the tool"),
  }),
  component: IndicatorsCardView,
})

interface Candle {
  open: number
  high: number
  low: number
  close: number
}

type CandleState = { status: "loading" } | { status: "error" } | { status: "ready"; candles: Candle[] }

function useFuturesCandles(symbol: string, interval: string): CandleState {
  const [state, setState] = useState<CandleState>({ status: "loading" })

  useEffect(() => {
    const controller = new AbortController()
    const load = () =>
      fetch(`${FUTURES_REST}/klines?symbol=${symbol}&interval=${interval}&limit=${CANDLE_COUNT}`, { signal: controller.signal })
        .then((response) => (response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`))))
        .then((rows: string[][]) =>
          setState({
            status: "ready",
            candles: rows.map((row) => ({ open: +row[1], high: +row[2], low: +row[3], close: +row[4] })),
          }),
        )
        .catch((error) => {
          if (controller.signal.aborted) return
          console.warn("[CandleChart] candle fetch failed", error)
          setState({ status: "error" })
        })

    load()
    const timer = setInterval(load, CHART_REFRESH_MS)
    return () => {
      controller.abort()
      clearInterval(timer)
    }
  }, [symbol, interval])

  return state
}

const CHART = { width: 600, height: 220, padding: 12 }

function CandleSvg({ candles }: { candles: Candle[] }) {
  const high = Math.max(...candles.map((candle) => candle.high))
  const low = Math.min(...candles.map((candle) => candle.low))
  const span = high - low || 1
  const slot = (CHART.width - CHART.padding * 2) / candles.length
  const y = (price: number) => CHART.padding + ((high - price) / span) * (CHART.height - CHART.padding * 2)

  return (
    <svg viewBox={`0 0 ${CHART.width} ${CHART.height}`} className="gen-fut__chart" role="img" aria-label="Candlestick chart">
      {candles.map((candle, index) => {
        const x = CHART.padding + index * slot + slot / 2
        const tone = candle.close >= candle.open ? "up" : "down"
        const bodyTop = y(Math.max(candle.open, candle.close))
        const bodyHeight = Math.max(1, Math.abs(y(candle.open) - y(candle.close)))
        return (
          <g key={index} className={`gen-fut__candle gen-fut__candle--${tone}`}>
            <line x1={x} x2={x} y1={y(candle.high)} y2={y(candle.low)} />
            <rect x={x - slot * 0.33} y={bodyTop} width={slot * 0.66} height={bodyHeight} />
          </g>
        )
      })}
    </svg>
  )
}

interface CandleChartProps {
  symbol: string
  interval?: string | null
}

function CandleChartView({ props }: { props: CandleChartProps }) {
  const symbol = props.symbol.toUpperCase().replace(/[^A-Z0-9]/g, "")
  const interval = CANDLE_INTERVALS.includes(props.interval ?? "") ? props.interval! : "1h"
  const state = useFuturesCandles(symbol, interval)
  const last = state.status === "ready" ? state.candles[state.candles.length - 1] : null

  return (
    <article className="gen-card gen-fut">
      <header className="gen-card__head">
        <div>
          <h4>{symbol} chart</h4>
          <span>{interval} candles, last {CANDLE_COUNT}, USDT-M perpetual</span>
        </div>
        {last && <span className="gen-fut__label">Close {formatPrice(last.close)}</span>}
      </header>
      {state.status === "loading" && <p className="gen-fut__status">Loading candles…</p>}
      {state.status === "error" && <p className="gen-fut__status">Could not load candles for {symbol}. Check the symbol or try again.</p>}
      {state.status === "ready" && <CandleSvg candles={state.candles} />}
    </article>
  )
}

export const CandleChart = defineComponent({
  name: "CandleChart",
  description:
    "Live candlestick chart for a Binance USD-M perpetual. It loads its own candles, so only the symbol and an optional interval (5m, 15m, 1h, 4h, 1d) are needed.",
  props: z.object({
    symbol: z.string().describe("Contract, e.g. BTCUSDT"),
    interval: z.string().nullable().optional().describe("5m, 15m, 1h (default), 4h or 1d"),
  }),
  component: CandleChartView,
})
