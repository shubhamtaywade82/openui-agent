import { createLibrary, defineComponent } from "@openuidev/react-lang"
import { openuiChatLibrary } from "@openuidev/react-ui/genui-lib"
import { z } from "zod"
import {
  Sun,
  CloudSun,
  CloudRain,
  CloudSnow,
  Droplets,
  Wind,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Circle,
  BookOpen,
} from "lucide-react"

interface WeatherCardProps {
  city: string
  temperature: number
  condition: string
  humidity?: number
  wind?: string
}

function getWeatherIcon(condition: string) {
  const c = condition.toLowerCase()
  if (c.includes("rain") || c.includes("drizzle")) return <CloudRain size={22} className="gen-weather__icon" />
  if (c.includes("snow") || c.includes("ice")) return <CloudSnow size={22} className="gen-weather__icon" />
  if (c.includes("cloud")) return <CloudSun size={22} className="gen-weather__icon" />
  return <Sun size={22} className="gen-weather__icon gen-weather__icon--sun" />
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
  component: ({ props }: { props: WeatherCardProps }) => (
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
  ),
})

interface StockCardProps {
  symbol: string
  name: string
  price: number
  change: number
  change_percent: number
  currency?: string
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
  component: ({ props }: { props: StockCardProps }) => {
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
          <span className="gen-stock__diff-label">
            {sign}{props.change.toFixed(2)} today
          </span>
        </div>
      </article>
    )
  },
})

interface TaskCardProps {
  id?: number
  title: string
  priority?: string
  completed: boolean
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
  component: ({ props }: { props: TaskCardProps }) => {
    const priority = (props.priority || "medium").toLowerCase()
    return (
      <article className={`gen-card gen-task gen-task--${priority}${props.completed ? " is-done" : ""}`}>
        <span className="gen-task__check-icon" aria-hidden="true">
          {props.completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
        </span>
        <div className="gen-task__body">
          <div className="gen-task__meta-row">
            {props.id && <span className="gen-task__id-badge">#{props.id}</span>}
            <span className={`gen-task__priority-badge gen-task__priority--${priority}`}>
              {priority}
            </span>
          </div>
          <h4 className="gen-task__title">{props.title}</h4>
        </div>
      </article>
    )
  },
})

interface DocPreviewCardProps {
  title: string
  snippet: string
  path?: string
}

export const DocPreviewCard = defineComponent({
  name: "DocPreviewCard",
  description: "Documentation snippet preview card. Use after calling SearchDocsTool or WebScrapeTool.",
  props: z.object({
    title: z.string().describe("Document or article title"),
    snippet: z.string().describe("Key excerpt or summary from the documentation"),
    path: z.string().optional().describe("Relative file path or source URL"),
  }),
  component: ({ props }: { props: DocPreviewCardProps }) => (
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
  ),
})

export const myLibrary = createLibrary({
  root: openuiChatLibrary.root ?? "Card",
  components: [
    ...Object.values(openuiChatLibrary.components || {}),
    WeatherCard,
    StockCard,
    TaskCard,
    DocPreviewCard,
  ],
})
