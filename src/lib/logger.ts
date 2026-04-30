// In-memory ring-buffer logger — survives page navigations via module-level store

type LogLevel = "debug" | "info" | "warn" | "error"

export interface LogEntry {
  id: number
  ts: number
  level: LogLevel
  source: string
  message: string
  detail?: string
}

const MAX_LOGS = 500
const logs: LogEntry[] = []
let seq = 0

const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((fn) => fn())
}

function add(level: LogLevel, source: string, message: string, detail?: string) {
  const entry: LogEntry = {
    id: ++seq,
    ts: Date.now(),
    level,
    source,
    message,
    detail: detail ?? undefined,
  }
  logs.push(entry)
  if (logs.length > MAX_LOGS) logs.shift()
  emit()
}

export const logger = {
  logs,

  debug(source: string, message: string, detail?: string) {
    add("debug", source, message, detail)
  },
  info(source: string, message: string, detail?: string) {
    add("info", source, message, detail)
  },
  warn(source: string, message: string, detail?: string) {
    add("warn", source, message, detail)
  },
  error(source: string, message: string, detail?: string) {
    add("error", source, message, detail)
    // Also log to console for browser devtools
    console.error(`[${source}]`, message, detail ?? "")
  },

  aiCall(provider: string, model: string, systemPrompt: string, userMessage: string) {
    add("info", `AI:${provider}`, `调用 ${provider}/${model}`, JSON.stringify({ systemPrompt: systemPrompt.substring(0, 200), userMessage: userMessage.substring(0, 500) }, null, 2))
  },
  aiResponse(provider: string, success: boolean, detail?: string) {
    add(success ? "info" : "error", `AI:${provider}`, success ? `响应成功` : `调用失败`, detail)
  },
  apiError(endpoint: string, error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    const stack = error instanceof Error ? error.stack : undefined
    add("error", `API:${endpoint}`, msg, stack)
  },

  subscribe(fn: () => void) {
    listeners.add(fn)
    return () => { listeners.delete(fn) }
  },

  clear() {
    logs.length = 0
    emit()
  },

  export(): string {
    return logs.map((l) =>
      `[${new Date(l.ts).toISOString()}] [${l.level.toUpperCase()}] [${l.source}] ${l.message}${l.detail ? "\n" + l.detail : ""}`
    ).join("\n")
  },
}
