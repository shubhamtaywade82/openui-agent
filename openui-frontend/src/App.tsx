import { useEffect, useMemo, useRef } from "react"
import {
  AgentInterface,
  fetchLLM,
  openAIAdapter,
  openAIMessageFormat,
} from "@openuidev/react-ui"
import { observability } from "@openuidev/observability"
import { OpenUIDevtools } from "@openuidev/devtools"
import { myLibrary } from "./lib/my-library"

const API_URL = "http://localhost:3000/api/openui"

const STARTERS = [
  { displayText: "Weather in Tokyo", prompt: "What's the weather in Tokyo and show it in a nice card?" },
  { displayText: "Apple stock quote", prompt: "Get the latest stock quote for AAPL and display it" },
  { displayText: "View pending tasks", prompt: "List my current tasks using the task manager" },
  { displayText: "Search product docs", prompt: "Search docs for product features and pricing tiers" },
  { displayText: "3 metric dashboard", prompt: "Show me a dashboard with revenue, users, and conversion rate" },
]

function useChatStreamLlm(chatIdRef: React.MutableRefObject<number | null>) {
  return useMemo(() => {
    const decoder = new TextDecoder()

    const customFetch = async (url: RequestInfo | URL, init?: RequestInit) => {
      if (init?.body && typeof init.body === "string") {
        try {
          const parsed = JSON.parse(init.body)
          if (chatIdRef.current) parsed.chat_id = chatIdRef.current
          init.body = JSON.stringify(parsed)
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
          if (match) chatIdRef.current = Number(match[1])
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
  }, [chatIdRef])
}

export default function App() {
  const chatIdRef = useRef<number | null>(null)
  const llm = useChatStreamLlm(chatIdRef)

  useEffect(() => {
    // Listen to all OpenUI observability events (syntax errors, render events, warnings)
    const remove = observability.listenAll((event) => {
      const { level, detail, timestamp } = event
      const log = level === "error" ? console.error : level === "warning" ? console.warn : console.info
      log(`[OpenUI ${level.toUpperCase()}] ${new Date(timestamp).toLocaleTimeString()}`, detail)
    })
    return remove
  }, [])

  return (
    <div style={{ height: "100vh", width: "100vw", display: "flex", flexDirection: "column" }}>
      <AgentInterface
        llm={llm}
        componentLibrary={myLibrary}
        agentName="Local OpenUI + Ollama"
        theme={{ mode: "light" }}
        starters={STARTERS}
      />
      <OpenUIDevtools position="bottom-right" />
    </div>
  )
}
