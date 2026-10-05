import { useEffect, useState } from "react"
import { defineComponent } from "@openuidev/react-lang"
import { z } from "zod"
import { formatPrice, signed } from "./futures-components"

const FUTURES_REST = "https://fapi.binance.com/fapi/v1"
const CANDLE_INTERVALS = ["5m", "15m", "1h", "4h", "1d"]
const CANDLE_COUNT = 60
const FUNDING_POINTS = 30
const CHART_REFRESH_MS = 30_000

type LoadState<T> = { status: "loading" } | { status: "error" } | { status: "ready"; data: T }

// Public market data is fetched by the browser itself (Binance allows CORS), so the model never has to type it out.
function useFuturesData<T>(path: string, parse: (rows: unknown) => T): LoadState<T> {
  const [state, setState] = useState<LoadState<T>>({ status: "loading" })

  useEffect(() => {
    const controller = new AbortController()
    const load = () =>
      fetch(`${FUTURES_REST}${path}`, { signal: controller.signal })
        .then((response) => (response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`))))
        .then((rows) => setState({ status: "ready", data: parse(rows) }))
        .catch((error) => {
          if (controller.signal.aborted) return
          console.warn("[futures chart] fetch failed", error)
          setState({ status: "error" })
        })

    load()
    const timer = setInterval(load, CHART_REFRESH_MS)
    return () => {
      controller.abort()
      clearInterval(timer)
    }
    // Callers pass module-level parse functions, so `parse` is stable and only the path can change.
  }, [path, parse])

  return state
}

const cleanSymbol = (symbol: string) => symbol.toUpperCase().replace(/[^A-Z0-9]/g, "")
const CHART = { width: 600, height: 220, padding: 12 }

interface Candle {
  open: number
  high: number
  low: number
  close: number
}

const parseCandles = (rows: unknown): Candle[] =>
  (rows as string[][]).map((row) => ({ open: +row[1], high: +row[2], low: +row[3], close: +row[4] }))

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
  const symbol = cleanSymbol(props.symbol)
  const interval = CANDLE_INTERVALS.includes(props.interval ?? "") ? props.interval! : "1h"
  const state = useFuturesData(`/klines?symbol=${symbol}&interval=${interval}&limit=${CANDLE_COUNT}`, parseCandles)
  const last = state.status === "ready" ? state.data[state.data.length - 1] : null

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
      {state.status === "ready" && <CandleSvg candles={state.data} />}
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

interface FundingPoint {
  rate: number
}

const parseFunding = (rows: unknown): FundingPoint[] =>
  (rows as Array<{ fundingRate: string }>).map((row) => ({ rate: +row.fundingRate * 100 }))

function FundingBars({ points }: { points: FundingPoint[] }) {
  const largest = Math.max(...points.map((point) => Math.abs(point.rate)), 1e-9)
  const middle = CHART.height / 2
  const slot = (CHART.width - CHART.padding * 2) / points.length
  const scale = (middle - CHART.padding) / largest

  return (
    <svg viewBox={`0 0 ${CHART.width} ${CHART.height}`} className="gen-fut__chart" role="img" aria-label="Funding rate history">
      <line x1={CHART.padding} x2={CHART.width - CHART.padding} y1={middle} y2={middle} className="gen-fut__zero" />
      {points.map((point, index) => {
        const height = Math.max(1, Math.abs(point.rate) * scale)
        return (
          <rect
            key={index}
            x={CHART.padding + index * slot + slot * 0.15}
            y={point.rate >= 0 ? middle - height : middle}
            width={slot * 0.7}
            height={height}
            className={`gen-fut__bar gen-fut__bar--${point.rate >= 0 ? "up" : "down"}`}
          />
        )
      })}
    </svg>
  )
}

function FundingChartView({ props }: { props: { symbol: string } }) {
  const symbol = cleanSymbol(props.symbol)
  const state = useFuturesData(`/fundingRate?symbol=${symbol}&limit=${FUNDING_POINTS}`, parseFunding)
  const rates = state.status === "ready" ? state.data.map((point) => point.rate) : []
  const average = rates.length ? rates.reduce((sum, rate) => sum + rate, 0) / rates.length : 0

  return (
    <article className="gen-card gen-fut">
      <header className="gen-card__head">
        <div>
          <h4>{symbol} funding rate</h4>
          <span>Last {FUNDING_POINTS} payments. Above the line, longs pay shorts.</span>
        </div>
        {rates.length > 0 && <span className="gen-fut__label">Average {signed(average, 4)}%</span>}
      </header>
      {state.status === "loading" && <p className="gen-fut__status">Loading funding history…</p>}
      {state.status === "error" && <p className="gen-fut__status">Could not load funding history for {symbol}.</p>}
      {state.status === "ready" && <FundingBars points={state.data} />}
    </article>
  )
}

export const FundingChart = defineComponent({
  name: "FundingChart",
  description: "Bar chart of the last 30 funding-rate payments for a Binance USD-M perpetual. It loads its own data, so only the symbol is needed.",
  props: z.object({ symbol: z.string().describe("Contract, e.g. BTCUSDT") }),
  component: FundingChartView,
})
