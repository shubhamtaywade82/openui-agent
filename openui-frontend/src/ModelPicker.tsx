import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { ModelSwitcher } from "@openuidev/react-ui"
import { API_ROOT, updateAgentOptions, useAgentOptions } from "./lib/settings"

export interface ModelEntry {
  id: string
  name: string
}

export interface ModelList {
  models: ModelEntry[]
  defaultModel?: string
}

const COMPOSER_ACTION_BAR =
  ".openui-agent-desktop-welcome-composer__action-bar, .openui-agent-thread-composer__action-bar"

let modelListRequest: Promise<ModelList> | undefined

// One request per page load; a reload picks up models pulled in Ollama since.
function fetchModelList(): Promise<ModelList> {
  modelListRequest ??= fetch(`${API_ROOT}/models`)
    .then((response) => response.json())
    .then((data) => ({ models: data.models ?? [], defaultModel: data.default }))
    .catch(() => {
      modelListRequest = undefined
      return { models: [] }
    })
  return modelListRequest
}

export function useModels(): ModelList {
  const [list, setList] = useState<ModelList>({ models: [] })

  useEffect(() => {
    let isMounted = true
    fetchModelList().then((result) => isMounted && setList(result))
    return () => {
      isMounted = false
    }
  }, [])

  return list
}

// The stock composer has no slot for extra controls, so the picker is portalled into its action bar.
// The bar is replaced when the welcome composer swaps for the thread composer, hence the observer.
function useComposerActionBar(): Element | null {
  const [bar, setBar] = useState<Element | null>(null)

  useEffect(() => {
    const findBar = () => setBar(document.querySelector(COMPOSER_ACTION_BAR))
    const frame = requestAnimationFrame(findBar)
    const observer = new MutationObserver(findBar)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [])

  return bar
}

export function ComposerModelPicker() {
  const bar = useComposerActionBar()
  const { models, defaultModel } = useModels()
  const { model } = useAgentOptions()

  if (!bar || models.length === 0) return null

  const isKnown = (id?: string) => models.some((entry) => entry.id === id)
  const active = isKnown(model) ? model! : isKnown(defaultModel) ? defaultModel! : models[0].id
  const options = models.map((entry) => ({ id: entry.id, name: entry.name, group: "Local" }))

  return createPortal(
    <div className="composer-model-picker">
      <ModelSwitcher models={options} value={active} onValueChange={(id) => updateAgentOptions({ model: id })} />
    </div>,
    bar,
  )
}
