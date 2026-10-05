import { useSyncExternalStore } from "react"

// Runtime settings sent with every LLM request via the `options` body field. Persisted so a
// reload keeps the chosen model and parameters.

export interface AgentOptions {
  model?: string
  temperature?: number
  num_ctx?: number
  disabled_tools?: string[]
}

const STORAGE_KEY = "openui-agent-options"

function loadStoredOptions(): AgentOptions {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}")
  } catch {
    // Blocked storage or corrupt JSON: start from backend defaults.
    return {}
  }
}

// Mutable singleton: the fetchLLM body getter reads it by reference on every request.
export const agentOptions: AgentOptions = loadStoredOptions()

let snapshot: AgentOptions = { ...agentOptions }
const listeners = new Set<() => void>()

export function updateAgentOptions(patch: Partial<AgentOptions>) {
  Object.assign(agentOptions, patch)
  snapshot = { ...agentOptions }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(agentOptions))
  } catch {
    // Settings just won't persist.
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useAgentOptions(): AgentOptions {
  return useSyncExternalStore(subscribe, () => snapshot)
}

export const API_ROOT = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api"

// Ids match the tool names registered in the Rails agent (`disabled_tools` is matched against them).
export const AVAILABLE_TOOLS = [
  { id: "weather", label: "Weather" },
  { id: "stock_quote", label: "Stocks" },
  { id: "binance", label: "Binance" },
  { id: "calculator", label: "Calculator" },
  { id: "current_time", label: "Time" },
  { id: "task_manager", label: "Tasks" },
  { id: "search_docs", label: "Docs" },
  { id: "web_search", label: "Web search" },
  { id: "web_scrape", label: "Web scrape" },
]
