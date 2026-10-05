import { useMemo, useRef } from "react"
import {
  AgentInterface,
  fetchLLM,
  openAIAdapter,
  openAIMessageFormat,
} from "@openuidev/react-ui"
import { myLibrary } from "./lib/my-library"

const API_URL = "http://localhost:3000/api/openui"

const STARTERS = [
  { displayText: "Weather in Tokyo", prompt: "What's the weather in Tokyo and show it in a nice card?" },
  { displayText: "Dashboard with 3 metrics", prompt: "Show me a dashboard with revenue, users, and conversion rate" },
  { displayText: "Contact form", prompt: "Create a simple contact form" },
  { displayText: "Pricing comparison table", prompt: "Build a pricing comparison table with 3 tiers" },
  { displayText: "Ruby blocks visual example", prompt: "Explain Ruby blocks with a visual example" },
]

export default function App() {
  const chatIdRef = useRef<number | null>(null)

  const llm = useMemo(() => {
    const decoder = new TextDecoder()

    const customFetch = async (url: RequestInfo | URL, init?: RequestInit) => {
      // Attach ongoing chat_id to request body if available
      if (init?.body && typeof init.body === "string") {
        try {
          const parsed = JSON.parse(init.body)
          if (chatIdRef.current) {
            parsed.chat_id = chatIdRef.current
            init.body = JSON.stringify(parsed)
          }
        } catch {
          // Keep body unchanged if parsing fails
        }
      }

      const res = await fetch(url, init)
      if (!res.body) return res

      // Transparently intercept the SSE stream to extract chat_id
      const transform = new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          const text = decoder.decode(chunk, { stream: true })
          const match = text.match(/"chat_id":\s*(\d+)/)
          if (match) {
            chatIdRef.current = Number(match[1])
          }
          controller.enqueue(chunk)
        },
      })

      return new Response(res.body.pipeThrough(transform), res)
    }

    return fetchLLM({
      url: API_URL,
      streamAdapter: openAIAdapter(),
      messageFormat: openAIMessageFormat,
      fetch: customFetch,
    })
  }, [])

  return (
    <AgentInterface
      llm={llm}
      componentLibrary={myLibrary}
      agentName="Local OpenUI + Ollama"
      theme={{ mode: "light" }}
      starters={STARTERS}
    />
  )
}
