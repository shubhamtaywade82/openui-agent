import {
  AgentInterface,
  fetchLLM,
  openAIAdapter,
  openAIMessageFormat,
} from "@openuidev/react-ui"
import { openuiChatLibrary } from "@openuidev/react-ui/genui-lib"

const API_URL = "http://localhost:3000/api/openui"

const llm = fetchLLM({
  url: API_URL,
  streamAdapter: openAIAdapter(),
  messageFormat: openAIMessageFormat,
})

const STARTERS = [
  { displayText: "Dashboard with 3 metrics", prompt: "Show me a simple dashboard with 3 metrics" },
  { displayText: "Contact form", prompt: "Create a contact form" },
  { displayText: "Table of users", prompt: "Display a table of sample users" },
  { displayText: "Pricing comparison card", prompt: "Build a pricing comparison card" },
]

export default function App() {
  return (
    <AgentInterface
      llm={llm}
      componentLibrary={openuiChatLibrary}
      agentName="Local OpenUI Assistant"
      theme={{ mode: "light" }}
      starters={STARTERS}
    />
  )
}
