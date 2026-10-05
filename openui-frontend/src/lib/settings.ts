// Shared runtime settings sent with every LLM request via the `options` body field.
// No React state needed — fetchLLM reads the body object by reference.

export interface AgentOptions {
  model?: string
  temperature?: number
  num_ctx?: number
  disabled_tools?: string[]
}

// Mutable singleton — both the settings UI and the fetchLLM body reference this.
export const agentOptions: AgentOptions = {}

export const AVAILABLE_TOOLS = [
  { id: "weather", label: "Weather" },
  { id: "stock_price", label: "Stock Price" },
  { id: "calculator", label: "Calculator" },
  { id: "web_search", label: "Web Search" },
]
