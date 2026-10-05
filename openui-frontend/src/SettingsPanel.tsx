import { useState, useEffect, useRef } from "react"
import { Settings, X, Cpu, Thermometer, Layers, ChevronDown } from "lucide-react"
import { ModelSwitcher } from "@openuidev/react-ui"
import { agentOptions, AVAILABLE_TOOLS, type AgentOptions } from "./lib/settings"

const API_ROOT = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api"

interface ModelEntry {
  id: string
  name: string
}

interface Props {
  onSettingsChange?: (opts: AgentOptions) => void
}

export function SettingsPanel({ onSettingsChange }: Props) {
  const [open, setOpen] = useState(false)
  const [models, setModels] = useState<ModelEntry[]>([])
  const [selectedModel, setSelectedModel] = useState(agentOptions.model ?? "")
  const [temperature, setTemperature] = useState(agentOptions.temperature ?? 0.7)
  const [numCtx, setNumCtx] = useState(agentOptions.num_ctx ?? 4096)
  const [disabledTools, setDisabledTools] = useState<string[]>(agentOptions.disabled_tools ?? [])
  const panelRef = useRef<HTMLDivElement>(null)

  // Load models from backend on first open
  useEffect(() => {
    if (!open || models.length > 0) return
    fetch(`${API_ROOT}/models`)
      .then(r => r.json())
      .then(data => setModels(data.models ?? []))
      .catch(() => setModels([]))
  }, [open])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  function apply() {
    agentOptions.model = selectedModel || undefined
    agentOptions.temperature = temperature
    agentOptions.num_ctx = numCtx
    agentOptions.disabled_tools = disabledTools.length ? disabledTools : undefined
    onSettingsChange?.({ ...agentOptions })
    setOpen(false)
  }

  function toggleTool(id: string) {
    setDisabledTools(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    )
  }

  const modelOptions = models.map(m => ({ id: m.id, name: m.name, group: "Local" }))
  const activeModel = selectedModel || (models[0]?.id ?? "")

  return (
    <div className="settings-panel-root" ref={panelRef}>
      <button
        type="button"
        className="settings-trigger-btn"
        onClick={() => setOpen(o => !o)}
        aria-label="Open settings"
        title="Model & tool settings"
      >
        <Settings size={16} />
        <span className="settings-trigger-label">Settings</span>
        <ChevronDown size={12} className={`settings-chevron ${open ? "open" : ""}`} />
      </button>

      {open && (
        <div className="settings-dropdown" role="dialog" aria-label="Settings panel">
          <div className="settings-header">
            <span className="settings-title">Settings</span>
            <button type="button" className="settings-close" onClick={() => setOpen(false)} aria-label="Close settings">
              <X size={14} />
            </button>
          </div>

          <div className="settings-section">
            <div className="settings-section-label"><Cpu size={13} /> Model</div>
            {models.length > 0 ? (
              <ModelSwitcher
                models={modelOptions}
                value={activeModel}
                onValueChange={v => setSelectedModel(v)}
              />
            ) : (
              <div className="settings-loading">Loading models…</div>
            )}
          </div>

          <div className="settings-section">
            <div className="settings-section-label"><Thermometer size={13} /> Temperature</div>
            <div className="settings-slider-row">
              <input
                type="range" min="0" max="2" step="0.05"
                value={temperature}
                onChange={e => setTemperature(parseFloat(e.target.value))}
                className="settings-range"
              />
              <span className="settings-range-value">{temperature.toFixed(2)}</span>
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-section-label"><Layers size={13} /> Context size</div>
            <div className="settings-slider-row">
              <input
                type="range" min="512" max="32768" step="512"
                value={numCtx}
                onChange={e => setNumCtx(parseInt(e.target.value, 10))}
                className="settings-range"
              />
              <span className="settings-range-value">{numCtx.toLocaleString()}</span>
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-section-label">Tools</div>
            <div className="settings-tools-grid">
              {AVAILABLE_TOOLS.map(tool => {
                const enabled = !disabledTools.includes(tool.id)
                return (
                  <button
                    key={tool.id}
                    type="button"
                    className={`settings-tool-chip ${enabled ? "enabled" : "disabled"}`}
                    onClick={() => toggleTool(tool.id)}
                    aria-pressed={enabled}
                  >
                    {tool.label}
                  </button>
                )
              })}
            </div>
          </div>

          <button type="button" className="settings-apply-btn" onClick={apply}>
            Apply
          </button>
        </div>
      )}
    </div>
  )
}
