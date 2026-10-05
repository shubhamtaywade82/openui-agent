import { useState, useEffect, useRef } from "react"
import { createLibrary, defineComponent } from "@openuidev/react-lang"
import { openuiChatLibrary } from "@openuidev/react-ui/genui-lib"
import { getFaviconUrl, type CardSource } from "@openuidev/react-ui"
import { z } from "zod"
import {
  Sun, CloudSun, CloudRain, CloudSnow, Droplets, Wind, TrendingUp, TrendingDown, CheckCircle2, Circle, BookOpen, Activity, Radio
} from "lucide-react"

interface WeatherCardProps { city: string; temperature: number; condition: string; humidity?: number; wind?: string }

function getWeatherIcon(condition: string) {
  const c = condition.toLowerCase()
  if (c.includes("rain") || c.includes("drizzle")) return <CloudRain size={22} className="gen-weather__icon" />
  if (c.includes("snow") || c.includes("ice")) return <CloudSnow size={22} className="gen-weather__icon" />
  if (c.includes("cloud")) return <CloudSun size={22} className="gen-weather__icon" />
  return <Sun size={22} className="gen-weather__icon gen-weather__icon--sun" />
}

function WeatherCardComponent({ props }: { props: WeatherCardProps }) {
  return (
    <article className="gen-card gen-weather">
      <div className="gen-card__glow-mesh" aria-hidden="true" />
      <header className="gen-card__head">
        <div>
          <h4>{props.city}</h4>
          <span className="gen-weather__condition-label">{props.condition}</span>
        </div>
        <div className="gen-weather__icon-badge">{getWeatherIcon(props.condition)}</div>
      </header>
      <div className="gen-weather__body">
        <span className="gen-weather__temp">{props.temperature}°</span>
        <span className="gen-weather__unit">C</span>
      </div>
      {(props.humidity !== undefined || props.wind) && (
        <div className="gen-weather__facts-grid">
          {props.humidity !== undefined && (
            <div className="gen-weather__fact-tile">
              <Droplets size={13} className="gen-weather__fact-icon" />
              <span>Humidity</span>
              <strong>{props.humidity}%</strong>
            </div>
          )}
          {props.wind && (
            <div className="gen-weather__fact-tile">
              <Wind size={13} className="gen-weather__fact-icon" />
              <span>Wind</span>
              <strong>{props.wind}</strong>
            </div>
          )}
        </div>
      )}
    </article>
  )
}

export const WeatherCard = defineComponent({
  name: "WeatherCard",
  description: "Card showing current weather for a city. Use after calling the Weather tool.",
  props: z.object({
    city: z.string().describe("City name"),
    temperature: z.number().describe("Temperature in Celsius"),
    condition: z.string().describe("Weather condition, e.g. Sunny, Cloudy"),
    humidity: z.number().optional().describe("Humidity percentage"),
    wind: z.string().optional().describe("Wind speed, e.g. 12 km/h"),
  }),
  component: WeatherCardComponent,
})

interface StockCardProps {
  symbol: string; name: string; price: number; change: number; change_percent: number; currency?: string
}

function StockCardComponent({ props }: { props: StockCardProps }) {
  const isUp = props.change >= 0
  const sign = isUp ? "+" : ""
  return (
    <article className={`gen-card gen-stock gen-stock--${isUp ? "up" : "down"}`}>
      <div className="gen-card__glow-mesh" aria-hidden="true" />
      <header className="gen-card__head">
        <div>
          <span className="gen-stock__ticker-badge">{props.symbol}</span>
          <span className="gen-stock__company-name">{props.name}</span>
        </div>
        <span className={`gen-stock__trend-pill gen-stock__trend-pill--${isUp ? "up" : "down"}`}>
          {isUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
          {sign}{props.change_percent.toFixed(2)}%
        </span>
      </header>
      <div className="gen-stock__main">
        <div className="gen-stock__price-row">
          <span className="gen-stock__currency">{props.currency || "$"}</span>
          <span className="gen-stock__price-val">{props.price.toFixed(2)}</span>
        </div>
        <span className="gen-stock__diff-label">{sign}{props.change.toFixed(2)} today</span>
      </div>
    </article>
  )
}

export const StockCard = defineComponent({
  name: "StockCard",
  description: "Financial card displaying stock quote and daily change. Use after calling StockQuoteTool.",
  props: z.object({
    symbol: z.string().describe("Stock ticker symbol, e.g. AAPL, NVDA"),
    name: z.string().describe("Company or instrument name"),
    price: z.number().describe("Current price"),
    change: z.number().describe("Price change amount in quote currency"),
    change_percent: z.number().describe("Percentage change (e.g. 1.25 for +1.25%)"),
    currency: z.string().optional().describe("Currency symbol, defaults to $"),
  }),
  component: StockCardComponent,
})

interface TaskCardProps {
  id?: number; title: string; priority?: string; completed: boolean
}

function TaskCardComponent({ props }: { props: TaskCardProps }) {
  const priority = (props.priority || "medium").toLowerCase()
  return (
    <article className={`gen-card gen-task gen-task--${priority}${props.completed ? " is-done" : ""}`}>
      <span className="gen-task__check-icon" aria-hidden="true">
        {props.completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
      </span>
      <div className="gen-task__body">
        <div className="gen-task__meta-row">
          {props.id && <span className="gen-task__id-badge">#{props.id}</span>}
          <span className={`gen-task__priority-badge gen-task__priority--${priority}`}>{priority}</span>
        </div>
        <h4 className="gen-task__title">{props.title}</h4>
      </div>
    </article>
  )
}

export const TaskCard = defineComponent({
  name: "TaskCard",
  description: "Visual card for a task with status badge and priority. Use after calling TaskManagerTool.",
  props: z.object({
    id: z.number().optional().describe("Task unique ID"),
    title: z.string().describe("Task title or summary"),
    priority: z.string().optional().describe("Priority level: low, medium, high, urgent"),
    completed: z.boolean().describe("Whether the task is completed"),
  }),
  component: TaskCardComponent,
})

interface DocPreviewCardProps {
  title: string; snippet: string; path?: string
}

function DocPreviewCardComponent({ props }: { props: DocPreviewCardProps }) {
  return (
    <article className="gen-card gen-doc">
      <div className="gen-card__glow-mesh" aria-hidden="true" />
      <header className="gen-card__head">
        <div className="gen-doc__title-wrapper">
          <BookOpen size={16} className="gen-doc__icon" />
          <h4>{props.title}</h4>
        </div>
      </header>
      {props.path && <div className="gen-doc__path-badge"><code>{props.path}</code></div>}
      <p className="gen-doc__snippet">{props.snippet}</p>
    </article>
  )
}

export const DocPreviewCard = defineComponent({
  name: "DocPreviewCard",
  description: "Documentation snippet preview card. Use after calling SearchDocsTool or WebScrapeTool.",
  props: z.object({
    title: z.string().describe("Document or article title"),
    snippet: z.string().describe("Key excerpt or summary from the documentation"),
    path: z.string().optional().describe("Relative file path or source URL"),
  }),
  component: DocPreviewCardComponent,
})

interface CryptoCardProps {
  symbol?: string | null; price?: number | null; change_percent?: number | null
  high_24h?: number | null; low_24h?: number | null; volume?: number | null
  quote_volume?: number | null; live_ws?: boolean | null
}

function useBinanceTicker(
  symbol?: string | null,
  initialPrice?: number | null,
  initialChange?: number | null,
  enabled = true
) {
  const [price, setPrice] = useState(initialPrice ?? 0)
  const [change, setChange] = useState(initialChange ?? 0)
  const [flash, setFlash] = useState<"up" | "down" | null>(null)
  const [connected, setConnected] = useState(false)
  const [tickTime, setTickTime] = useState("")
  const prevRef = useRef(initialPrice ?? 0)

  useEffect(() => {
    if (!connected && initialPrice != null && initialPrice > 0) {
      setPrice(initialPrice)
      prevRef.current = initialPrice
    }
    if (!connected && initialChange != null) setChange(initialChange)
  }, [initialPrice, initialChange, connected])

  useEffect(() => {
    if (!enabled || !symbol) return
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@ticker`)
    ws.onopen = () => setConnected(true)
    ws.onclose = () => setConnected(false)
    ws.onmessage = (e) => {
      const d = JSON.parse(e.data || "{}")
      if (!d.c) return
      const p = parseFloat(d.c)
      setFlash(p > prevRef.current ? "up" : p < prevRef.current ? "down" : null)
      prevRef.current = p
      setPrice(p)
      if (d.P) setChange(parseFloat(d.P))
      setTickTime(new Date().toLocaleTimeString())
      setTimeout(() => setFlash(null), 300)
    }
    return () => ws.close()
  }, [symbol, enabled])

  return { price, change, flash, connected, tickTime }
}

function CryptoCardComponent({ props }: { props: CryptoCardProps }) {
  const { price, change, flash, connected, tickTime } = useBinanceTicker(
    props.symbol, props.price, props.change_percent, props.live_ws !== false
  )
  const isUp = change >= 0
  const sign = isUp ? "+" : ""

  return (
    <article className={`gen-card gen-crypto ${flash ? `gen-crypto--flash-${flash}` : ""}`}>
      <div className="gen-card__glow-mesh" aria-hidden="true" />
      <header className="gen-card__head">
        <div>
          <span className="gen-crypto__ticker-badge">{props.symbol || "CRYPTO"}</span>
          <span className="gen-crypto__pair-name">Binance Spot</span>
        </div>
        <div className="gen-crypto__status-badges">
          <span className={`gen-crypto__ws-pill ${connected ? "is-connected" : ""}`}>
            <Radio size={10} className="gen-crypto__pulse-icon" />
            {connected ? "LIVE" : "SYNC"}
          </span>
          <span className={`gen-stock__trend-pill gen-stock__trend-pill--${isUp ? "up" : "down"}`}>
            {isUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {sign}{change.toFixed(2)}%
          </span>
        </div>
      </header>
      <div className="gen-crypto__main">
        <div className="gen-crypto__price-row">
          <span className="gen-crypto__currency">$</span>
          <span className="gen-crypto__price-val">
            {price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
          </span>
        </div>
        {tickTime && (
          <span className="gen-crypto__tick-time">
            <Activity size={10} /> Last tick: {tickTime}
          </span>
        )}
      </div>
      {(props.high_24h != null || props.low_24h != null || props.volume != null) && (
        <div className="gen-crypto__facts-grid">
          {props.high_24h != null && <div className="gen-crypto__fact-tile"><span className="gen-crypto__fact-label">24h High</span><strong>${props.high_24h.toLocaleString()}</strong></div>}
          {props.low_24h != null && <div className="gen-crypto__fact-tile"><span className="gen-crypto__fact-label">24h Low</span><strong>${props.low_24h.toLocaleString()}</strong></div>}
          {props.volume != null && <div className="gen-crypto__fact-tile"><span className="gen-crypto__fact-label">24h Vol</span><strong>{props.volume.toLocaleString()}</strong></div>}
        </div>
      )}
    </article>
  )
}

export const CryptoCard = defineComponent({
  name: "CryptoCard",
  description: "Live cryptocurrency market card connected to Binance REST and live WebSocket tick stream.",
  props: z.object({
    symbol: z.string().nullable().optional(),
    price: z.number().nullable().optional(),
    change_percent: z.number().nullable().optional(),
    high_24h: z.number().nullable().optional(),
    low_24h: z.number().nullable().optional(),
    volume: z.number().nullable().optional(),
    quote_volume: z.number().nullable().optional(),
    live_ws: z.boolean().nullable().optional(),
  }),
  component: CryptoCardComponent,
})

function CollapsibleSources({ sources }: { sources?: CardSource[] }) {
  if (!sources?.length) return null

  return (
    <details className="gen-sources">
      <summary>Sources ({sources.length})</summary>
      <ol>
        {sources.map((source, index) => (
          <li key={source.url ?? index}>
            {source.url && <img src={getFaviconUrl(source.url)} alt="" width={16} height={16} loading="lazy" />}
            {source.url ? (
              <a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a>
            ) : (
              <span>{source.title}</span>
            )}
            <small>{source.sourceName}</small>
          </li>
        ))}
      </ol>
    </details>
  )
}

// The stock Card keeps inline [n] citations working (its source context is private to the genui bundle);
// its built-in sources strip is hidden in index.css and replaced by the collapsible list below it.
const stockCard = openuiChatLibrary.components.Card
const StockCardView = stockCard.component
const CardWithCollapsibleSources = defineComponent({
  name: stockCard.name,
  props: stockCard.props,
  description: stockCard.description,
  component: (args) => (
    <>
      <StockCardView {...args} />
      <CollapsibleSources sources={args.props.sources} />
    </>
  ),
})

export const myLibrary = createLibrary({
  root: openuiChatLibrary.root ?? "Card",
  components: [
    ...Object.values(openuiChatLibrary.components || {}).filter((component) => component.name !== "Card"),
    CardWithCollapsibleSources,
    WeatherCard, StockCard, TaskCard, DocPreviewCard, CryptoCard,
  ],
})
