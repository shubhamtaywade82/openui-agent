import { useEffect, useState, type FormEvent } from "react"
import { defineComponent } from "@openuidev/react-lang"
import { z } from "zod"
import { formatPrice, signed } from "./futures-components"

const STORAGE_KEY = "openui-watchlist"
const DEFAULT_SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT"]
const MAX_SYMBOLS = 12
const SYMBOL_PATTERN = /^[A-Z0-9]{2,20}$/

interface Quote {
  price: number
  open: number
}

const normalize = (symbol: string) => symbol.toUpperCase().replace(/[^A-Z0-9]/g, "")

function readStoredSymbols(): string[] | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null")
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string" && SYMBOL_PATTERN.test(item)) : null
  } catch {
    // Blocked storage or corrupt JSON: fall back to the default list.
    return null
  }
}

function mergeSymbols(base: string[], extra: string[] = []): string[] {
  const added = extra.map(normalize).filter((symbol) => SYMBOL_PATTERN.test(symbol))
  return [...new Set([...base, ...added])].slice(0, MAX_SYMBOLS)
}

// The list lives in the browser, so "show my watchlist" in any later chat finds the same symbols.
function useWatchlist(addSymbols?: string[]) {
  const [symbols, setSymbols] = useState(() => mergeSymbols(readStoredSymbols() ?? DEFAULT_SYMBOLS, addSymbols))

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(symbols))
    } catch {
      // The list just won't persist.
    }
  }, [symbols])

  return { symbols, add: (symbol: string) => setSymbols((list) => mergeSymbols(list, [symbol])), remove: (symbol: string) => setSymbols((list) => list.filter((item) => item !== symbol)) }
}

function useMiniTickers(symbols: string[]) {
  const [quotes, setQuotes] = useState<Record<string, Quote>>({})
  const streamKey = symbols.map((symbol) => `${symbol.toLowerCase()}@miniTicker`).join("/")

  useEffect(() => {
    if (!streamKey) return
    // Futures market streams moved to the /market route; the old /stream path connects but sends nothing.
    const socket = new WebSocket(`wss://fstream.binance.com/market/stream?streams=${streamKey}`)
    socket.onmessage = (event) => {
      const tick = JSON.parse(event.data)?.data
      if (tick?.s) setQuotes((current) => ({ ...current, [tick.s]: { price: +tick.c, open: +tick.o } }))
    }
    return () => socket.close()
  }, [streamKey])

  return quotes
}

function WatchlistRow({ symbol, quote, onRemove }: { symbol: string; quote?: Quote; onRemove: () => void }) {
  const change = quote && quote.open ? ((quote.price - quote.open) / quote.open) * 100 : null

  return (
    <li>
      <strong>{symbol}</strong>
      <span>{quote ? `$${formatPrice(quote.price)}` : "…"}</span>
      <span className={change == null ? undefined : `gen-fut__trend--${change >= 0 ? "up" : "down"}`}>
        {change == null ? "" : `${signed(change)}%`}
      </span>
      <button type="button" onClick={onRemove} aria-label={`Remove ${symbol}`}>×</button>
    </li>
  )
}

function WatchlistView({ props }: { props: { add?: string[] | null } }) {
  const { symbols, add, remove } = useWatchlist(props.add ?? undefined)
  const quotes = useMiniTickers(symbols)
  const [draft, setDraft] = useState("")

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const symbol = normalize(draft)
    if (SYMBOL_PATTERN.test(symbol)) add(symbol.endsWith("USDT") ? symbol : `${symbol}USDT`)
    setDraft("")
  }

  return (
    <article className="gen-card gen-fut gen-watch">
      <header className="gen-card__head">
        <div>
          <h4>Watchlist</h4>
          <span>USDT-M perpetuals, 24h change</span>
        </div>
        <span className="gen-fut__label">{Object.keys(quotes).length > 0 ? "Live" : "Connecting…"}</span>
      </header>
      <ul className="gen-watch__rows">
        {symbols.map((symbol) => (
          <WatchlistRow key={symbol} symbol={symbol} quote={quotes[symbol]} onRemove={() => remove(symbol)} />
        ))}
      </ul>
      <form className="gen-watch__add" onSubmit={submit}>
        <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Add a symbol, e.g. XRP" aria-label="Add a symbol" />
        <button type="submit">Add</button>
      </form>
    </article>
  )
}

export const WatchlistCard = defineComponent({
  name: "WatchlistCard",
  description:
    "The user's live crypto watchlist (Binance USD-M perpetuals) with streaming prices. No tool call is needed. The list is saved in the browser and can be edited on the card. Pass add only to add symbols the user asked for.",
  props: z.object({
    add: z.array(z.string()).nullable().optional().describe("Symbols to add to the saved list, e.g. [SOLUSDT]"),
  }),
  component: WatchlistView,
})
