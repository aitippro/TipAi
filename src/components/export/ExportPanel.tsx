import { useState } from "react"
import { trpc } from "@/providers/trpc"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  Download,
  FileJson,
  FileText,
  CheckCircle2,
  Loader2,
  FolderOpen,
  Sparkles,
} from "lucide-react"

export function ExportPanel() {
  const [format, setFormat] = useState<"json" | "markdown">("json")
  const [includeConversations, setIncludeConversations] = useState(false)
  const [includeSummaries, setIncludeSummaries] = useState(true)
  const [includeMetadata, setIncludeMetadata] = useState(true)
  const [activeTab, setActiveTab] = useState<"projects" | "prompts">("projects")
  const [isExporting, setIsExporting] = useState(false)
  const [exportResult, setExportResult] = useState<string | null>(null)

  const { data: projects } = trpc.project.list.useQuery()
  const { data: prompts } = trpc.promptForge.getLibrary.useQuery()

  const exportMutation = trpc.export.projects.useMutation()
  const exportPromptsMutation = trpc.export.prompts.useMutation()

  const handleExport = async () => {
    setIsExporting(true)
    setExportResult(null)

    try {
      if (activeTab === "projects") {
        const result = await exportMutation.mutateAsync({
          format,
          includeConversations,
          includeSummaries,
        })
        setExportResult(result.content)
        toast.success(`导出 ${result.count} 个项目`)
      } else {
        const result = await exportPromptsMutation.mutateAsync({
          format,
          includeMetadata,
        })
        setExportResult(result.content)
        toast.success(`导出 ${result.count} 个提示词`)
      }
    } catch (error) {
      toast.error("导出失败")
      console.error(error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleDownload = () => {
    if (!exportResult) return
    const blob = new Blob([exportResult], {
      type: format === "json" ? "application/json" : "text/markdown",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `tipai-export-${activeTab}-${new Date().toISOString().slice(0, 10)}.${format === "json" ? "json" : "md"}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success("文件已下载")
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 flex items-center justify-center">
          <Download className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">批量导出</h1>
          <p className="text-sm text-slate-500">导出项目或提示词库到本地文件</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === "projects" ? "default" : "outline"}
          className="rounded-xl"
          onClick={() => { setActiveTab("projects"); setExportResult(null) }}
        >
          <FolderOpen className="w-4 h-4 mr-2" />
          项目
          {projects && <Badge variant="secondary" className="ml-2 text-xs">{projects.length}</Badge>}
        </Button>
        <Button
          variant={activeTab === "prompts" ? "default" : "outline"}
          className="rounded-xl"
          onClick={() => { setActiveTab("prompts"); setExportResult(null) }}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          提示词库
          {prompts && <Badge variant="secondary" className="ml-2 text-xs">{prompts.length}</Badge>}
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm rounded-2xl">
        <CardContent className="p-6 space-y-6">
          {/* Format selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-700">导出格式</label>
            <div className="flex gap-3">
              <button
                onClick={() => setFormat("json")}
                className={`flex-1 flex items-center gap-3 p-4 rounded-xl border transition-all ${
                  format === "json"
                    ? "border-blue-200 bg-blue-50/50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <FileJson className={`w-6 h-6 ${format === "json" ? "text-blue-500" : "text-slate-400"}`} />
                <div className="text-left">
                  <p className={`font-medium ${format === "json" ? "text-blue-700" : "text-slate-700"}`}>JSON</p>
                  <p className="text-xs text-slate-400">结构化数据，适合程序处理</p>
                </div>
                {format === "json" && <CheckCircle2 className="w-5 h-5 text-blue-500 ml-auto" />}
              </button>

              <button
                onClick={() => setFormat("markdown")}
                className={`flex-1 flex items-center gap-3 p-4 rounded-xl border transition-all ${
                  format === "markdown"
                    ? "border-emerald-200 bg-emerald-50/50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <FileText className={`w-6 h-6 ${format === "markdown" ? "text-emerald-500" : "text-slate-400"}`} />
                <div className="text-left">
                  <p className={`font-medium ${format === "markdown" ? "text-emerald-700" : "text-slate-700"}`}>Markdown</p>
                  <p className="text-xs text-slate-400">可读文档，适合人工阅读</p>
                </div>
                {format === "markdown" && <CheckCircle2 className="w-5 h-5 text-emerald-500 ml-auto" />}
              </button>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-700">导出选项</label>
            {activeTab === "projects" ? (
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={includeSummaries}
                    onChange={(e) => setIncludeSummaries(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-700">包含需求摘要</p>
                    <p className="text-xs text-slate-400">导出 Clarify 生成的需求分析</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={includeConversations}
                    onChange={(e) => setIncludeConversations(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-700">包含对话记录</p>
                    <p className="text-xs text-slate-400">导出完整的 Clarify 对话历史</p>
                  </div>
                </label>
              </div>
            ) : (
              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={includeMetadata}
                  onChange={(e) => setIncludeMetadata(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600"
                />
                <div>
                  <p className="text-sm font-medium text-slate-700">包含元数据</p>
                  <p className="text-xs text-slate-400">导出框架、标签等附加信息</p>
                </div>
              </label>
            )}
          </div>

          {/* Export button */}
          <Button
            className="w-full rounded-xl h-12 text-base"
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                导出中...
              </>
            ) : (
              <>
                <Download className="w-5 h-5 mr-2" />
                开始导出
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Preview */}
      {exportResult && (
        <Card className="border-slate-200 shadow-sm rounded-2xl">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-slate-800">导出预览</h3>
              <Button variant="outline" className="rounded-xl" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                下载文件
              </Button>
            </div>
            <div className="bg-slate-900 rounded-xl p-4 overflow-auto max-h-96">
              <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap">
                {exportResult.slice(0, 2000)}
                {exportResult.length > 2000 && "\n\n... (内容已截断，请下载完整文件)"}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
