import { useThread } from "@openuidev/react-headless"
import { RotateCcw, Square } from "lucide-react"
import type { Message } from "@openuidev/react-headless"

// Sends the last user message again after wiping the last assistant message.
function useRetry() {
  const { messages, processMessage, deleteMessage, isRunning } = useThread()

  return function retry() {
    if (isRunning) return
    // Walk from the end to find the last assistant then last user messages
    let lastAssistant: Message | undefined
    let lastUser: Message | undefined
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i]
      if (!lastAssistant && m.role === "assistant") { lastAssistant = m; continue }
      if (lastAssistant && !lastUser && m.role === "user") { lastUser = m; break }
    }
    if (!lastUser) return
    if (lastAssistant) deleteMessage(lastAssistant.id)
    const content = typeof lastUser.content === "string"
      ? lastUser.content
      : (lastUser.content as Array<{ type: string; text?: string }>)
          .filter(p => p.type === "text")
          .map(p => p.text ?? "")
          .join("")
    processMessage({ role: "user", content })
  }
}

export function ThreadToolbar() {
  const { isRunning, cancelMessage, messages } = useThread()
  const retry = useRetry()

  const hasMessages = messages.some(m => m.role === "assistant")

  if (!hasMessages && !isRunning) return null

  return (
    <div className="thread-toolbar">
      {isRunning ? (
        <button
          type="button"
          className="thread-toolbar-btn stop"
          onClick={cancelMessage}
          aria-label="Stop generating"
          title="Stop generating"
        >
          <Square size={14} />
          Stop
        </button>
      ) : (
        <button
          type="button"
          className="thread-toolbar-btn retry"
          onClick={retry}
          aria-label="Retry last message"
          title="Regenerate last response"
        >
          <RotateCcw size={14} />
          Retry
        </button>
      )}
    </div>
  )
}
