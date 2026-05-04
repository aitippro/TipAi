import { useState, useRef } from "react"
import { trpc } from "@/providers/trpc"
import { Button } from "@/components/ui/button"
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
  ArrowRight,
  ArrowLeft,
  Check,
} from "lucide-react"
import { ScrollReveal } from "@/components/effects/ScrollReveal"
import { StaggerContainer, StaggerItem } from "@/components/effects/StaggerContainer"

type Step = 1 | 2 | 3
type ExportFormat = "json" | "markdown"
type ExportTarget = "projects" | "prompts"

const STEPS = [
  { id: 1, label: "选择内容", description: "选择要导出的数据源" },
  { id: 2, label: "配置格式", description: "选择导出格式和选项" },
  { id: 3, label: "导出下载", description: "确认并下载文件" },
]

/**
 * ExportPanel — 向导式导出流程
 * 三步骤：选择内容 → 配置格式 → 导出下载
 */
export function ExportPanel() {
  const [step, setStep] = useState<Step>(1)
  const [target, setTarget] = useState<ExportTarget>("projects")
  const [format, setFormat] = useState<ExportFormat>("json")
  const [includeConversations, setIncludeConversations] = useState(false)
  const [includeSummaries, setIncludeSummaries] = useState(true)
  const [includeMetadata, setIncludeMetadata] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [exportResult, setExportResult] = useState<string | null>(null)
  const [exportCount, setExportCount] = useState(0)
  const isExportingRef = useRef(false)

  const { data: projects } = trpc.project.list.useQuery()
  const { data: prompts } = trpc.promptForge.getLibrary.useQuery()

  const exportMutation = trpc.export.projects.useMutation()
  const exportPromptsMutation = trpc.export.prompts.useMutation()

  const handleExport = async () => {
    if (isExportingRef.current) return
    isExportingRef.current = true
    setIsExporting(true)
    setExportResult(null)

    try {
      if (target === "projects") {
        const result = await exportMutation.mutateAsync({
          format,
          includeConversations,
          includeSummaries,
        })
        setExportResult(result.content)
        setExportCount(result.count)
        toast.success(`导出 ${result.count} 个项目`)
      } else {
        const result = await exportPromptsMutation.mutateAsync({
          format,
          includeMetadata,
        })
        setExportResult(result.content)
        setExportCount(result.count)
        toast.success(`导出 ${result.count} 个提示词`)
      }
      setStep(3)
    } catch (error) {
      toast.error("导出失败")
      console.error(error)
    } finally {
      isExportingRef.current = false
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
    a.download = `tipai-export-${target}-${new Date().toISOString().slice(0, 10)}.${format === "json" ? "json" : "md"}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success("文件已下载")
  }

  const canProceed = () => {
    if (step === 1) return true
    if (step === 2) return true
    return false
  }

  return (
    <div className="max-w-3xl mx-auto">
      <ScrollReveal>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 flex items-center justify-center">
            <Download className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">批量导出</h1>
            <p className="text-sm text-slate-500">导出项目或提示词库到本地文件</p>
          </div>
        </div>
      </ScrollReveal>

      {/* Stepper */}
      <ScrollReveal delay={50}>
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all ${
                step >= s.id
                  ? "bg-gradient-to-r from-apple-blue to-apple-purple text-white shadow-md"
                  : "bg-slate-100 text-slate-400"
              }`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                  step > s.id ? "bg-white/20" : step === s.id ? "bg-white text-apple-blue" : "bg-slate-200"
                }`}>
                  {step > s.id ? <Check className="w-3 h-3" /> : s.id}
                </span>
                <span className="font-medium hidden sm:inline">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <ArrowRight className={`w-4 h-4 ${step > s.id ? "text-apple-blue" : "text-slate-300"}`} />
              )}
            </div>
          ))}
        </div>
      </ScrollReveal>

      {/* Step Content */}
      {step === 1 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300" key="step1">
          <ScrollReveal>
            <p className="text-sm text-slate-500 mb-4">选择要导出的数据源</p>
          </ScrollReveal>
          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StaggerItem>
              <button
                onClick={() => setTarget("projects")}
                className={`w-full p-5 rounded-2xl border text-left transition-all hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98] ${
                  target === "projects"
                    ? "border-apple-blue bg-blue-50/50 shadow-md"
                    : "border-slate-200 hover:border-slate-300 bg-white/80"
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    target === "projects" ? "bg-blue-100 text-apple-blue" : "bg-slate-100 text-slate-400"
                  }`}>
                    <FolderOpen className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className={`font-semibold ${target === "projects" ? "text-apple-blue" : "text-slate-700"}`}>项目</p>
                    <p className="text-xs text-slate-400">包含对话记录和摘要</p>
                  </div>
                  {target === "projects" && <CheckCircle2 className="w-5 h-5 text-apple-blue" />}
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="secondary" className="text-xs">
                    {projects?.length || 0} 个项目
                  </Badge>
                </div>
              </button>
            </StaggerItem>

            <StaggerItem>
              <button
                onClick={() => setTarget("prompts")}
                className={`w-full p-5 rounded-2xl border text-left transition-all hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98] ${
                  target === "prompts"
                    ? "border-emerald-400 bg-emerald-50/50 shadow-md"
                    : "border-slate-200 hover:border-slate-300 bg-white/80"
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    target === "prompts" ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                  }`}>
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className={`font-semibold ${target === "prompts" ? "text-emerald-600" : "text-slate-700"}`}>提示词库</p>
                    <p className="text-xs text-slate-400">包含元数据和领域信息</p>
                  </div>
                  {target === "prompts" && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="secondary" className="text-xs">
                    {prompts?.length || 0} 个提示词
                  </Badge>
                </div>
              </button>
            </StaggerItem>
          </StaggerContainer>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300" key="step2">
          <ScrollReveal>
            <p className="text-sm text-slate-500 mb-4">选择导出格式和包含的内容</p>
          </ScrollReveal>

          {/* Format Selection */}
          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StaggerItem>
              <button
                onClick={() => setFormat("json")}
                className={`w-full p-5 rounded-2xl border text-left transition-all hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98] ${
                  format === "json"
                    ? "border-blue-200 bg-blue-50/50 shadow-md"
                    : "border-slate-200 hover:border-slate-300 bg-white/80"
                }`}
              >
                <div className="flex items-center gap-3">
                  <FileJson className={`w-8 h-8 ${format === "json" ? "text-blue-500" : "text-slate-400"}`} />
                  <div className="flex-1">
                    <p className={`font-semibold ${format === "json" ? "text-blue-700" : "text-slate-700"}`}>JSON</p>
                    <p className="text-xs text-slate-400">结构化数据，适合程序处理</p>
                  </div>
                  {format === "json" && <CheckCircle2 className="w-5 h-5 text-blue-500" />}
                </div>
              </button>
            </StaggerItem>

            <StaggerItem>
              <button
                onClick={() => setFormat("markdown")}
                className={`w-full p-5 rounded-2xl border text-left transition-all hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98] ${
                  format === "markdown"
                    ? "border-emerald-200 bg-emerald-50/50 shadow-md"
                    : "border-slate-200 hover:border-slate-300 bg-white/80"
                }`}
              >
                <div className="flex items-center gap-3">
                  <FileText className={`w-8 h-8 ${format === "markdown" ? "text-emerald-500" : "text-slate-400"}`} />
                  <div className="flex-1">
                    <p className={`font-semibold ${format === "markdown" ? "text-emerald-700" : "text-slate-700"}`}>Markdown</p>
                    <p className="text-xs text-slate-400">可读文档，适合人工阅读</p>
                  </div>
                  {format === "markdown" && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                </div>
              </button>
            </StaggerItem>
          </StaggerContainer>

          {/* Options */}
          <ScrollReveal delay={100}>
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-700">导出选项</p>
              {target === "projects" ? (
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={includeSummaries}
                      onChange={(e) => setIncludeSummaries(e.target.checked)}
                      className="w-4 h-4 rounded accent-apple-blue"
                    />
                    <div>
                      <p className="text-sm font-medium">包含需求摘要</p>
                      <p className="text-xs text-slate-400">导出 AI 生成的需求分析摘要</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={includeConversations}
                      onChange={(e) => setIncludeConversations(e.target.checked)}
                      className="w-4 h-4 rounded accent-apple-blue"
                    />
                    <div>
                      <p className="text-sm font-medium">包含澄清对话</p>
                      <p className="text-xs text-slate-400">导出完整的 AI 澄清对话记录</p>
                    </div>
                  </label>
                </div>
              ) : (
                <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={includeMetadata}
                    onChange={(e) => setIncludeMetadata(e.target.checked)}
                    className="w-4 h-4 rounded accent-apple-blue"
                  />
                  <div>
                    <p className="text-sm font-medium">包含元数据</p>
                    <p className="text-xs text-slate-400">导出领域、框架、标签等元信息</p>
                  </div>
                </label>
              )}
            </div>
          </ScrollReveal>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300" key="step3">
          {isExporting ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-10 h-10 text-apple-blue mb-4 animate-spin" />
              <p className="text-sm text-slate-500">正在导出数据...</p>
            </div>
          ) : exportResult ? (
            <>
              <ScrollReveal>
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 flex items-center justify-center mx-auto mb-4 animate-in zoom-in duration-300">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-1">导出完成</h3>
                  <p className="text-sm text-slate-500">
                    成功导出 <span className="font-semibold text-apple-blue">{exportCount}</span> 条{target === "projects" ? "项目" : "提示词"}
                  </p>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={100}>
                <div className="hover:scale-[1.02] active:scale-[0.98] transition-transform">
                  <Button
                    onClick={handleDownload}
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-apple-blue to-apple-purple text-white shadow-lg text-base"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    下载 {format === "json" ? "JSON" : "Markdown"} 文件
                  </Button>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={200}>
                <div className="bg-slate-50 rounded-xl p-4 text-xs text-slate-500 space-y-1">
                  <p>文件名: tipai-export-{target}-{new Date().toISOString().slice(0, 10)}.{format === "json" ? "json" : "md"}</p>
                  <p>大小: {(exportResult.length / 1024).toFixed(1)} KB</p>
                  <p>格式: {format === "json" ? "application/json" : "text/markdown"}</p>
                </div>
              </ScrollReveal>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-sm text-slate-400">点击下方按钮开始导出</p>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
        <Button
          variant="ghost"
          className="rounded-xl"
          disabled={step === 1}
          onClick={() => setStep((s) => (s > 1 ? ((s - 1) as Step) : s))}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          上一步
        </Button>

        {step < 3 ? (
          <Button
            className="rounded-xl bg-gradient-to-r from-apple-blue to-apple-purple text-white shadow-md"
            disabled={!canProceed()}
            onClick={() => {
              if (step === 2) {
                handleExport()
              } else {
                setStep((s) => (s + 1) as Step)
              }
            }}
          >
            {step === 2 ? (
              <>导出<ArrowRight className="w-4 h-4 ml-2" /></>
            ) : (
              <>下一步<ArrowRight className="w-4 h-4 ml-2" /></>
            )}
          </Button>
        ) : (
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => {
              setStep(1)
              setExportResult(null)
            }}
          >
            重新导出
          </Button>
        )}
      </div>
    </div>
  )
}
