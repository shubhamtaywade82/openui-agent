// Regression check for the example prompts: sends each one to the running Rails API, parses the answer with the
// real component catalog, and verifies the tools called and components rendered.
//   bun scripts/check-prompts.ts [--only <name>] [--base <url>] [--model <ollama model>]
import { createParser } from "@openuidev/react-lang"
import { myLibrary } from "../src/lib/my-library"

interface PromptCase {
  name: string
  prompt: string
  tools?: string[] // at least one of these must be called
  components?: string[] // each must appear in the answer
  minCount?: Record<string, number>
}

const CASES: PromptCase[] = [
  { name: "weather", prompt: "What's the weather in Tokyo and show it in a nice card?", tools: ["weather"], components: ["WeatherCard"] },
  { name: "stock", prompt: "Get the latest stock quote for AAPL and display it", tools: ["stock_quote"], components: ["StockCard"] },
  { name: "tasks", prompt: "List my current tasks using the task manager", tools: ["task_manager"], components: ["TaskCard"] },
  { name: "docs", prompt: "Search docs for product features and pricing tiers", tools: ["search_docs"] },
  { name: "btc-ticker", prompt: "Show live Binance market data and real-time tick stream for BTCUSDT in a CryptoCard", tools: ["binance"], components: ["CryptoCard"] },
  { name: "futures", prompt: "Analyse BTCUSDT perpetual futures: funding, open interest, positioning and technicals", tools: ["binance_futures"], components: ["FuturesCard", "IndicatorsCard", "CandleChart"] },
  { name: "timeframes", prompt: "BTCUSDT trend across timeframes", tools: ["binance_futures"], components: ["TimeframesCard"] },
  { name: "compare", prompt: "Compare ETHUSDT and SOLUSDT perpetual funding and open interest", tools: ["binance_futures"], minCount: { FuturesCard: 2 } },
  { name: "watchlist", prompt: "Show my crypto watchlist", components: ["WatchlistCard"] },
  { name: "compound", prompt: "Calculate compound interest for $10,000 at 7% over 10 years using the calculator tool", tools: ["calculator"] },
  { name: "dashboard", prompt: "Show me a dashboard with revenue, users, and conversion rate" },
]

const FALLBACK_TEXT = "The model did not return a response"

function readArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag)
  return index >= 0 ? process.argv[index + 1] : undefined
}

interface RunResult {
  answer: string
  tools: string[]
  runError?: string
}

async function runPrompt(baseUrl: string, prompt: string, model?: string): Promise<RunResult> {
  const response = await fetch(`${baseUrl}/api/openui`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      protocol: "ag-ui",
      options: model ? { model } : {},
      messages: [{ role: "user", content: prompt }],
    }),
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)

  const result: RunResult = { answer: "", tools: [] }
  for (const line of (await response.text()).split("\n")) {
    if (!line.startsWith("data: {")) continue
    const event = JSON.parse(line.slice(6))
    if (event.type === "TEXT_MESSAGE_CONTENT") result.answer += event.delta
    if (event.type === "TOOL_CALL_START") result.tools.push(event.toolCallName)
    if (event.type === "RUN_ERROR") result.runError = event.message
  }
  return result
}

function findProblems(testCase: PromptCase, run: RunResult): string[] {
  const problems: string[] = []
  if (run.runError) problems.push(`run error: ${run.runError.slice(0, 120)}`)
  if (run.answer.includes(FALLBACK_TEXT)) problems.push("model returned no answer (fallback card)")

  const parsed = createParser(myLibrary.toJSONSchema()).parse(run.answer)
  const meta = parsed.meta
  if (meta.incomplete) problems.push("answer incomplete")
  for (const error of meta.errors ?? []) problems.push(`parser: ${error.code} in ${error.component}: ${String(error.message).slice(0, 90)}`)
  if (meta.unresolved?.length) problems.push(`unresolved: ${meta.unresolved.join(", ")}`)
  if (meta.orphaned?.length) problems.push(`orphaned: ${meta.orphaned.join(", ")}`)

  if (testCase.tools && !testCase.tools.some((tool) => run.tools.includes(tool))) {
    problems.push(`expected one of tools [${testCase.tools}], called [${run.tools.join(", ") || "none"}]`)
  }
  for (const component of testCase.components ?? []) {
    if (!run.answer.includes(`${component}(`)) problems.push(`missing component ${component}`)
  }
  for (const [component, minimum] of Object.entries(testCase.minCount ?? {})) {
    const count = run.answer.split(`${component}(`).length - 1
    if (count < minimum) problems.push(`expected at least ${minimum} ${component}, found ${count}`)
  }
  return problems
}

async function main() {
  const baseUrl = readArg("--base") ?? "http://localhost:3000"
  const only = readArg("--only")
  const model = readArg("--model")
  const selected = CASES.filter((testCase) => !only || testCase.name === only)
  if (selected.length === 0) throw new Error(`No case named "${only}". Available: ${CASES.map((c) => c.name).join(", ")}`)

  let failed = 0
  for (const testCase of selected) {
    const started = Date.now()
    try {
      const problems = findProblems(testCase, await runPrompt(baseUrl, testCase.prompt, model))
      const seconds = ((Date.now() - started) / 1000).toFixed(0)
      console.log(`${problems.length ? "FAIL" : "PASS"}  ${testCase.name} (${seconds}s)`)
      problems.forEach((problem) => console.log(`        - ${problem}`))
      if (problems.length) failed++
    } catch (error) {
      console.log(`FAIL  ${testCase.name}\n        - ${(error as Error).message}`)
      failed++
    }
  }
  console.log(`\n${selected.length - failed}/${selected.length} passed`)
  process.exit(failed ? 1 : 0)
}

main()
