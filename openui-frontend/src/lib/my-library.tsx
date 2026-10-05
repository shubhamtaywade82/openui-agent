import { createLibrary, defineComponent } from "@openuidev/react-lang"
import { openuiChatLibrary } from "@openuidev/react-ui/genui-lib"
import { z } from "zod"

interface WeatherCardProps {
  city: string
  temperature: number
  condition: string
  humidity?: number
  wind?: string
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
      <header className="gen-card__head">
        <h4>{props.city}</h4>
        <span>{props.condition}</span>
      </header>
      <p className="gen-weather__temp">{props.temperature}°C</p>
      {(props.humidity !== undefined || props.wind) && (
        <dl className="gen-card__facts">
          {props.humidity !== undefined && (
            <div>
              <dt>Humidity</dt>
              <dd>{props.humidity}%</dd>
            </div>
          )}
          {props.wind && (
            <div>
              <dt>Wind</dt>
              <dd>{props.wind}</dd>
            </div>
          )}
        </dl>
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
        <header className="gen-card__head">
          <h4>{props.symbol}</h4>
          <span>{props.name}</span>
        </header>
        <p className="gen-stock__price">
          <small>{props.currency || "$"}</small>
          {props.price.toFixed(2)}
        </p>
        <p className="gen-stock__change">
          {isUp ? "▲" : "▼"} {sign}
          {props.change.toFixed(2)} ({sign}
          {props.change_percent.toFixed(2)}%)
        </p>
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
    const level = priority === "urgent" || priority === "high" ? "hot" : "calm"

    return (
      <article className={`gen-card gen-task gen-task--${level}${props.completed ? " is-done" : ""}`}>
        <span className="gen-task__check" aria-hidden="true">
          {props.completed ? "✓" : ""}
        </span>
        <div>
          <h4>{props.title}</h4>
          <span className="gen-task__priority">{props.completed ? "Done" : `${priority} priority`}</span>
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
      <header className="gen-card__head">
        <h4>{props.title}</h4>
        {props.path && <code>{props.path}</code>}
      </header>
      <p>{props.snippet}</p>
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
