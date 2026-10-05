import { Controller } from "@hotwired/stimulus"
import React, { useState, useRef } from "react"
import { createRoot } from "react-dom/client"
import { Renderer } from "@openuidev/react-lang"
import { myLibrary } from "../../../openui-frontend/src/lib/my-library"

// Removes reasoning tags and code fence artifacts produced by local models
function cleanDsl(raw) {
  const noThinking = raw.replace(/<think>[\s\S]*?(<\/think>|$)/g, "").trim()
  const fence = noThinking.match(/```(?:openui|dsl|lang)?\s*([\s\S]*?)```/)
  if (fence) return fence[1].trim()
  return noThinking.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim()
}

const SAMPLE_PROMPTS = [
  "Current weather in Tokyo with temp and humidity",
  "Product launch metrics dashboard with KPIs",
  "Customer feedback rating form with submit button",
  "Calculate loan monthly payment for $50k at 6% for 5 years"
]

const INITIAL_CODE = `
header = CardHeader("Generative UI Ready")
desc = TextContent("Ask for dashboards, cards, metrics, or forms to generate interactive UI in real time.")
root = Card([header, desc])`.trim()

function OpenuiChat({ endpoint }) {
  const [prompt, setPrompt] = useState("")
  const [code, setCode] = useState(INITIAL_CODE)
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState(null)
  const [viewTab, setViewTab] = useState("preview")
  const [toolStatus, setToolStatus] = useState(null)
  const chatIdRef = useRef(null)

  const resetChat = () => {
    chatIdRef.current = null
    setCode(INITIAL_CODE)
    setError(null)
    setToolStatus(null)
  }

  const handleStream = async (textToSend) => {
    if (!textToSend.trim() || streaming) return
    setStreaming(true)
    setError(null)
    setToolStatus(null)
    setCode("")

    try {
      const res = await fetch(endpoint || "/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: textToSend }],
          chat_id: chatIdRef.current
        })
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let accumulated = ""

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith("data: ")) continue
          const dataStr = trimmed.slice(6)
          if (dataStr === "[DONE]") continue

          try {
            const parsed = JSON.parse(dataStr)
            if (parsed.chat_id) chatIdRef.current = parsed.chat_id
            if (parsed.status) setToolStatus(parsed.status)
            if (parsed.choices?.[0]?.delta?.content) {
              setToolStatus(null)
              accumulated += parsed.choices[0].delta.content
              setCode(cleanDsl(accumulated))
            }
          } catch {
            // Ignore partial SSE JSON frames
          }
        }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setStreaming(false)
      setToolStatus(null)
    }
  }

  const onSubmit = (e) => {
    e.preventDefault()
    const msg = prompt
    setPrompt("")
    handleStream(msg)
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
      <header className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
          <h1 className="text-lg font-bold tracking-tight">Generative UI Agent</h1>
          <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">ruby_llm + ollama</span>
          {toolStatus && (
            <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded animate-pulse">
              {toolStatus}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={resetChat}
            disabled={streaming}
            className="text-xs px-2.5 py-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition border border-slate-800 disabled:opacity-50">
            + New Chat
          </button>
          <div className="flex gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setViewTab("preview")}
              className={`px-3 py-1 rounded transition ${viewTab === "preview" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-slate-200"}`}>
              Preview
            </button>
            <button
              type="button"
              onClick={() => setViewTab("code")}
              className={`px-3 py-1 rounded transition ${viewTab === "code" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-slate-200"}`}>
              OpenUI Code
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 bg-slate-900/60">
        {error && (
          <div className="mb-4 p-3 bg-red-950/80 border border-red-800 text-red-200 text-sm rounded-lg">
            {error}
          </div>
        )}

        {viewTab === "preview" ? (
          <div className="min-h-[400px] p-4 bg-white text-slate-900 rounded-xl shadow-inner overflow-x-auto">
            <Renderer response={code} library={myLibrary} isStreaming={streaming} />
          </div>
        ) : (
          <pre className="p-4 bg-slate-950 text-emerald-400 rounded-xl font-mono text-xs overflow-x-auto border border-slate-800 whitespace-pre-wrap leading-relaxed">
            {code || "// Waiting for generation..."}
          </pre>
        )}
      </div>

      <footer className="p-4 bg-slate-950 border-t border-slate-800 space-y-3">
        <div className="flex flex-wrap gap-2">
          {SAMPLE_PROMPTS.map((sample) => (
            <button
              key={sample}
              type="button"
              disabled={streaming}
              onClick={() => handleStream(sample)}
              className="text-xs px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-md transition disabled:opacity-50">
              {sample}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="flex gap-2">
          <input
            type="text"
            value={prompt}
            disabled={streaming}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={streaming ? "Generating generative UI components..." : "Ask for a component, metric card, form, or weather..."}
            className="flex-1 px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={streaming || !prompt.trim()}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 font-medium text-sm rounded-lg transition disabled:opacity-50">
            {streaming ? "Streaming..." : "Generate"}
          </button>
        </form>
      </footer>
    </div>
  )
}

export default class extends Controller {
  static values = { endpoint: String }

  connect() {
    this.root = createRoot(this.element)
    this.root.render(<OpenuiChat endpoint={this.endpointValue} />)
  }

  disconnect() {
    if (this.root) {
      this.root.unmount()
      this.root = null
    }
  }
}
