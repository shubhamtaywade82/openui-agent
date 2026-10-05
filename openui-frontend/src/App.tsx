import { useEffect } from "react"
import { AgentInterface, openAIAdapter, openAIMessageFormat } from "@openuidev/react-ui"
import { fetchLLM, type ChatStorage, type Thread } from "@openuidev/react-headless"
import { observability } from "@openuidev/observability"
import { OpenUIDevtools } from "@openuidev/devtools"
import { myLibrary } from "./lib/my-library"

const API_ROOT = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api"

const STARTERS = [
  { displayText: "Weather in Tokyo", prompt: "What's the weather in Tokyo and show it in a nice card?" },
  { displayText: "Apple stock quote", prompt: "Get the latest stock quote for AAPL and display it" },
  { displayText: "View pending tasks", prompt: "List my current tasks using the task manager" },
  { displayText: "Search product docs", prompt: "Search docs for product features and pricing tiers" },
  { displayText: "3 metric dashboard", prompt: "Show me a dashboard with revenue, users, and conversion rate" },
]

const TITLE_MAX_CHARS = 40

interface ChatSummary {
  id: string
  title: string
  created_at: string
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_ROOT}${path}`, init)
  if (!res.ok) throw new Error(`${init?.method ?? "GET"} ${path} failed: HTTP ${res.status}`)
  return res.status === 204 ? (undefined as T) : res.json()
}

const toThread = (chat: ChatSummary): Thread => ({
  id: chat.id,
  title: chat.title,
  createdAt: chat.created_at,
})

// The Rails chat id doubles as the thread id, so `fetchLLM` sends it as `threadId` and the
// backend resumes the right conversation.
const storage: ChatStorage = {
  thread: {
    listThreads: async () => ({ threads: (await request<ChatSummary[]>("/chats")).map(toThread) }),
    createThread: async (firstMessage) => {
      const chat = await request<ChatSummary>("/chats", { method: "POST" })
      const prompt = typeof firstMessage.content === "string" ? firstMessage.content : ""
      return toThread({ ...chat, title: prompt.slice(0, TITLE_MAX_CHARS) || chat.title })
    },
    getMessages: async (threadId) => (await request<{ messages: never[] }>(`/chats/${threadId}`)).messages,
    updateThread: async (thread) => thread,
    deleteThread: (threadId) => request<void>(`/chats/${threadId}`, { method: "DELETE" }),
  },
}

const llm = fetchLLM({
  url: `${API_ROOT}/openui`,
  streamAdapter: openAIAdapter(),
  messageFormat: openAIMessageFormat,
})

function logOpenUiEvents() {
  return observability.listenAll(({ level, detail, timestamp }) => {
    const log = level === "error" ? console.error : level === "warning" ? console.warn : console.info
    log(`[OpenUI ${level.toUpperCase()}] ${new Date(timestamp).toLocaleTimeString()}`, detail)
  })
}

export default function App() {
  useEffect(logOpenUiEvents, [])

  return (
    <div style={{ height: "100vh", width: "100vw", display: "flex", flexDirection: "column" }}>
      <AgentInterface
        llm={llm}
        storage={storage}
        componentLibrary={myLibrary}
        agentName="Local OpenUI + Ollama"
        theme={{ mode: "light" }}
      >
        <AgentInterface.Welcome
          title="What can I build for you?"
          description="Ask about weather, stocks, tasks or docs, or request a dashboard, form or chart. Answers render as live UI."
          starters={STARTERS}
        />
      </AgentInterface>
      <OpenUIDevtools position="bottom-right" />
    </div>
  )
}
