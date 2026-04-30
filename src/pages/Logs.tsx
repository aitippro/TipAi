import { useState, useEffect, useMemo } from "react"
import { logger, type LogEntry } from "@/lib/logger"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import {
  Copy, Trash2, Download, Search,
  Clock, Filter,
} from "lucide-react"

const LEVEL_COLOR: Record<string, string> = {
  debug: "text-slate-400 bg-slate-50 border-slate-200",
  info: "text-blue-600 bg-blue-50 border-blue-200",
  warn: "text-amber-600 bg-amber-50 border-amber-200",
  error: "text-red-600 bg-red-50 border-red-200",
}

function formatTime(ts: number) {
  const d = new Date(ts)
  return d.toLocaleTimeString("zh-CN", { hour12: false }) + "." + String(d.getMilliseconds()).padStart(3, "0")
}

export default function LogsPage() {
  const [items, setItems] = useState<LogEntry[]>(() => [...logger.logs].reverse())
  const [filter, setFilter] = useState("")
  const [levelFilter, setLevelFilter] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  useEffect(() => {
    return logger.subscribe(() => {
      setItems([...logger.logs].reverse())
    })
  }, [])

  const filtered = useMemo(() => {
    let list = items
    if (levelFilter) list = list.filter((l) => l.level === levelFilter)
    if (filter) {
      const q = filter.toLowerCase()
      list = list.filter((l) => l.message.toLowerCase().includes(q) || l.source.toLowerCase().includes(q) || l.detail?.toLowerCase().includes(q))
    }
    return list
  }, [items, filter, levelFilter])

  const handleCopy = (entry: LogEntry) => {
    const text = `[${formatTime(entry.ts)}] [${entry.level.toUpperCase()}] [${entry.source}] ${entry.message}${entry.detail ? "\n" + entry.detail : ""}`
    navigator.clipboard?.writeText(text).then(() => toast.success("已复制")).catch(() => {
      const ta = document.createElement("textarea")
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand("copy")
      document.body.removeChild(ta)
      toast.success("已复制")
    })
  }

  const handleCopyAll = () => {
    const text = logger.export()
    navigator.clipboard?.writeText(text).then(() => toast.success(`已复制 ${logger.logs.length} 条日志`)).catch(() => toast.error("复制失败"))
  }

  const handleExportFile = () => {
    const text = logger.export()
    const blob = new Blob([text], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `tipai-logs-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("日志已导出")
  }

  const handleClear = () => {
    logger.clear()
    toast.success("日志已清空")
  }

  const countByLevel = useMemo(() => {
    const c: Record<string, number> = {}
    items.forEach((l) => { c[l.level] = (c[l.level] || 0) + 1 })
    return c
  }, [items])

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">应用日志</h1>
          <p className="text-sm text-slate-400 mt-1">
            共 {items.length} 条 ·
            <span className="text-red-500 ml-1">{countByLevel.error || 0} 错误</span>
            <span className="text-amber-500 ml-1">{countByLevel.warn || 0} 警告</span>
            <span className="text-blue-500 ml-1">{countByLevel.info || 0} 信息</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="rounded-xl text-xs" onClick={handleCopyAll}>
            <Copy className="w-3.5 h-3.5 mr-1" />复制全部
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl text-xs" onClick={handleExportFile}>
            <Download className="w-3.5 h-3.5 mr-1" />导出
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl text-xs text-red-500 hover:text-red-600" onClick={handleClear}>
            <Trash2 className="w-3.5 h-3.5 mr-1" />清空
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input
            placeholder="搜索日志..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-9 h-9 text-sm rounded-xl"
          />
        </div>
        {(["error", "warn", "info", "debug"] as const).map((lvl) => (
          <button
            key={lvl}
            onClick={() => setLevelFilter(levelFilter === lvl ? null : lvl)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${levelFilter === lvl ? LEVEL_COLOR[lvl] + " ring-1" : "bg-slate-50 text-slate-400 hover:bg-slate-100"}`}
          >
            <Filter className="w-3 h-3" />
            {lvl}
            {countByLevel[lvl] ? <span className="opacity-60">({countByLevel[lvl]})</span> : null}
          </button>
        ))}
      </div>

      {/* Log list */}
      <div className="space-y-1 max-h-[calc(100vh-280px)] overflow-y-auto rounded-2xl border border-slate-200 bg-white">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Clock className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">{items.length === 0 ? "暂无日志" : "无匹配日志"}</p>
            <p className="text-xs mt-1">应用运行过程中会自动记录日志</p>
          </div>
        ) : (
          filtered.map((entry) => {
            const isExpanded = expanded.has(entry.id)
            return (
              <div
                key={entry.id}
                className={`border-b border-slate-50 last:border-0 transition-colors ${entry.level === "error" ? "bg-red-50/30" : entry.level === "warn" ? "bg-amber-50/20" : "hover:bg-slate-50"}`}
              >
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs"
                  onClick={() => {
                    const next = new Set(expanded)
                    if (next.has(entry.id)) next.delete(entry.id)
                    else next.add(entry.id)
                    setExpanded(next)
                  }}
                >
                  <span className="shrink-0 text-[10px] text-slate-400 w-16 font-mono">{formatTime(entry.ts)}</span>
                  <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase ${LEVEL_COLOR[entry.level] || ""}`}>{entry.level}</span>
                  <span className="shrink-0 text-[10px] text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded">{entry.source}</span>
                  <span className="flex-1 truncate text-slate-700">{entry.message}</span>
                  <button
                    className="shrink-0 p-1 rounded hover:bg-slate-200 transition-colors"
                    onClick={(e) => { e.stopPropagation(); handleCopy(entry) }}
                    title="复制此条"
                  >
                    <Copy className="w-3 h-3 text-slate-400" />
                  </button>
                </button>
                {isExpanded && entry.detail && (
                  <pre className="mx-3 mb-2 p-3 rounded-xl bg-slate-900 text-slate-300 text-[11px] font-mono overflow-x-auto whitespace-pre-wrap max-h-60 overflow-y-auto">
                    {entry.detail}
                  </pre>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
