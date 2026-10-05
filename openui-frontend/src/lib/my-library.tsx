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
  description: "Beautiful card showing current weather for a city. Use after calling the Weather tool.",
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
      <div style={{ fontSize: "0.875rem", color: "#0369a1", fontWeight: 600 }}>
        {props.city}
      </div>
      <div
        style={{
          fontSize: "2.5rem",
          fontWeight: 700,
          color: "#0c4a6e",
          margin: "0.5rem 0",
        }}
      >
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

export const myLibrary = createLibrary({
  root: openuiChatLibrary.root ?? "Card",
  components: [
    ...Object.values(openuiChatLibrary.components || {}),
    WeatherCard,
  ],
})
