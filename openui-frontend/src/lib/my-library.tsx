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
    <div
      style={{
        padding: "1.25rem",
        borderRadius: "1rem",
        background: "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)",
        border: "1px solid #7dd3fc",
        boxShadow: "0 4px 12px rgba(14, 165, 233, 0.15)",
        maxWidth: "320px",
      }}
    >
      <div style={{ fontSize: "0.875rem", color: "#0369a1", fontWeight: 600 }}>{props.city}</div>
      <div style={{ fontSize: "2.5rem", fontWeight: 700, color: "#0c4a6e", margin: "0.5rem 0" }}>
        {props.temperature}°C
      </div>
      <div style={{ fontSize: "1.125rem", color: "#0e7490", marginBottom: "0.75rem" }}>
        {props.condition}
      </div>
      <div style={{ display: "flex", gap: "1rem", fontSize: "0.875rem", color: "#075985" }}>
        {props.humidity !== undefined && <span>💧 {props.humidity}%</span>}
        {props.wind && <span>💨 {props.wind}</span>}
      </div>
    </div>
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
    const isPositive = props.change >= 0
    const sign = isPositive ? "+" : ""
    const badgeBg = isPositive ? "#dcfce7" : "#fee2e2"
    const badgeColor = isPositive ? "#15803d" : "#b91c1c"
    const curr = props.currency || "$"

    return (
      <div
        style={{
          padding: "1.25rem",
          borderRadius: "1rem",
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
          maxWidth: "320px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontWeight: 700, fontSize: "1.25rem", color: "#0f172a" }}>{props.symbol}</span>
          <span style={{ fontSize: "0.85rem", color: "#64748b" }}>{props.name}</span>
        </div>
        <div style={{ fontSize: "2rem", fontWeight: 700, color: "#0f172a", margin: "0.5rem 0" }}>
          {curr}{props.price.toFixed(2)}
        </div>
        <span
          style={{
            display: "inline-block",
            padding: "0.25rem 0.6rem",
            borderRadius: "0.375rem",
            fontSize: "0.875rem",
            fontWeight: 600,
            background: badgeBg,
            color: badgeColor,
          }}
        >
          {sign}{props.change.toFixed(2)} ({sign}{props.change_percent.toFixed(2)}%)
        </span>
      </div>
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
    const pColor = priority === "urgent" || priority === "high" ? "#dc2626" : "#2563eb"

    return (
      <div
        style={{
          padding: "1rem",
          borderRadius: "0.75rem",
          background: props.completed ? "#f8fafc" : "#ffffff",
          border: `1px solid ${props.completed ? "#e2e8f0" : "#cbd5e1"}`,
          maxWidth: "340px",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
        }}
      >
        <span style={{ fontSize: "1.25rem" }}>{props.completed ? "✅" : "⭕"}</span>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: "0.95rem",
              textDecoration: props.completed ? "line-through" : "none",
              color: props.completed ? "#94a3b8" : "#1e293b",
            }}
          >
            {props.title}
          </div>
          <span style={{ fontSize: "0.75rem", fontWeight: 600, color: pColor, textTransform: "uppercase" }}>
            {priority}
          </span>
        </div>
      </div>
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
    <div
      style={{
        padding: "1.25rem",
        borderRadius: "0.875rem",
        background: "#f8fafc",
        border: "1px solid #cbd5e1",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
        maxWidth: "420px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
        <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#1e293b" }}>{props.title}</h4>
        {props.path && (
          <span style={{ fontSize: "0.75rem", fontFamily: "monospace", color: "#64748b" }}>
            {props.path}
          </span>
        )}
      </div>
      <p style={{ margin: 0, fontSize: "0.875rem", lineHeight: 1.5, color: "#475569" }}>
        {props.snippet}
      </p>
    </div>
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
