import { useEffect, useState } from "react"
import { AgentInterface, openAIAdapter, openAIMessageFormat } from "@openuidev/react-ui"
import { fetchLLM, type ChatStorage, type Thread } from "@openuidev/react-headless"
import { observability, toErrorInfo } from "@openuidev/observability"
import { OpenUIDevtools } from "@openuidev/devtools"
import {
  CloudSun,
  TrendingUp,
  CheckSquare,
  FileSearch,
  LayoutDashboard,
  Sparkles,
  Sun,
  Moon,
} from "lucide-react"
import { myLibrary } from "./lib/my-library"
import { darkTheme, lightTheme } from "./lib/theme"

const API_ROOT = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api"

const STARTERS = [
  {
    displayText: "Weather in Tokyo",
    prompt: "What's the weather in Tokyo and show it in a nice card?",
    icon: <CloudSun size={16} />,
  },
  {
    displayText: "Apple stock quote",
    prompt: "Get the latest stock quote for AAPL and display it",
    icon: <TrendingUp size={16} />,
  },
  {
    displayText: "View pending tasks",
    prompt: "List my current tasks using the task manager",
    icon: <CheckSquare size={16} />,
  },
  {
    displayText: "Search product docs",
    prompt: "Search docs for product features and pricing tiers",
    icon: <FileSearch size={16} />,
  },
  {
    displayText: "3 metric dashboard",
    prompt: "Show me a dashboard with revenue, users, and conversion rate",
    icon: <LayoutDashboard size={16} />,
  },
]

const TITLE_MAX_CHARS = 40

interface ChatSummary {
  id: string
  title: string
  created_at: string
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    const res = await fetch(`${API_ROOT}${path}`, init)
    if (!res.ok) {
      const err = new Error(`${init?.method ?? "GET"} ${path} failed: HTTP ${res.status}`)
      observability.error({ kind: "api:http_error", path, status: res.status, error: toErrorInfo(err) })
      throw err
    }
    return res.status === 204 ? (undefined as T) : res.json()
  } catch (e) {
    observability.error({ kind: "api:network_error", path, error: toErrorInfo(e) })
    throw e
  }
}

const toThread = (chat: ChatSummary): Thread => ({
  id: String(chat.id),
  title: chat.title,
  createdAt: chat.created_at,
})

interface BackendMessage {
  id: string
  role: "user" | "assistant" | "system"
  content: string
}

// The Rails chat id doubles as the thread id, so `fetchLLM` sends it as `threadId` and the
// backend resumes the right conversation.
const storage: ChatStorage = {
  thread: {
    listThreads: async () => {
      const chats = await request<ChatSummary[]>("/chats")
      observability.info({ kind: "storage:threads_loaded", count: chats.length })
      return { threads: chats.map(toThread) }
    },
    createThread: async (firstMessage) => {
      const chat = await request<ChatSummary>("/chats", { method: "POST" })
      const prompt = typeof firstMessage.content === "string" ? firstMessage.content : ""
      observability.info({ kind: "storage:thread_created", threadId: chat.id })
      return toThread({ ...chat, title: prompt.slice(0, TITLE_MAX_CHARS) || chat.title })
    },
    getMessages: async (threadId) => {
      const data = await request<{ id: number; messages: BackendMessage[] }>(`/chats/${threadId}`)
      observability.info({ kind: "storage:messages_loaded", threadId, count: data.messages.length })
      // Converts backend messages [{ id, role, content }] into the AG-UI message array expected by the chat store
      return openAIMessageFormat.fromApi(data.messages)
    },
    updateThread: async (thread) => thread,
    deleteThread: async (threadId) => {
      await request<void>(`/chats/${threadId}`, { method: "DELETE" })
      observability.info({ kind: "storage:thread_deleted", threadId })
    },
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

type ColorMode = "light" | "dark"

const COLOR_MODE_KEY = "openui-color-mode"

function readInitialColorMode(): ColorMode {
  try {
    const stored = localStorage.getItem(COLOR_MODE_KEY)
    if (stored === "light" || stored === "dark") return stored
  } catch {
    // Storage can be blocked (private mode); fall back to the OS preference.
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function useColorMode(): [ColorMode, () => void] {
  const [mode, setMode] = useState<ColorMode>(readInitialColorMode)

  const toggle = () => {
    const next = mode === "dark" ? "light" : "dark"
    setMode(next)
    try {
      localStorage.setItem(COLOR_MODE_KEY, next)
    } catch {
      // Preference just won't persist.
    }
  }

  return [mode, toggle]
}

export default function App() {
  const [colorMode, toggleColorMode] = useColorMode()
  useEffect(logOpenUiEvents, [])

  const heroBadge = (
    <div className="welcome-hero-badge">
      <div className="welcome-hero-icon-container">
        <Sparkles size={20} className="welcome-hero-sparkle" />
      </div>
      <div className="welcome-hero-pill">
        <span className="welcome-hero-dot" />
        Autonomous GenUI Engine
      </div>
    </div>
  )

  return (
    <div className="openui-app-root">
      <AgentInterface
        llm={llm}
        storage={storage}
        componentLibrary={myLibrary}
        agentName="OpenUI Local"
        theme={{ mode: colorMode, lightTheme, darkTheme }}
      >
        <AgentInterface.Sidebar>
          <div className="openui-agent-sidebar-actions">
            <AgentInterface.SidebarHeader />
            <div className="openui-agent-sidebar-primary-actions">
              <AgentInterface.NewChatButton />
            </div>
          </div>
          <AgentInterface.SidebarContent>
            <AgentInterface.ThreadList />
          </AgentInterface.SidebarContent>
        </AgentInterface.Sidebar>

        <AgentInterface.Welcome
          glowAnimation={true}
          image={heroBadge}
          title="Ask for an answer. Get an interface."
          description="Weather, stocks, tasks, docs, dashboards, forms and charts all render as live components, generated by a model running on your machine."
          starters={STARTERS}
        />
      </AgentInterface>
      <button
        type="button"
        className="theme-toggle"
        onClick={toggleColorMode}
        aria-label={`Switch to ${colorMode === "dark" ? "light" : "dark"} mode`}
      >
        <span className="theme-toggle-icon">
          {colorMode === "dark" ? <Sun size={15} /> : <Moon size={15} />}
        </span>
        <span className="theme-toggle-text">
          {colorMode === "dark" ? "Light" : "Dark"}
        </span>
      </button>
      <OpenUIDevtools
        position="bottom-right"
        autoOpenOnError
        maxEvents={100}
        theme={colorMode}
      />
    </div>
  )
}
