import { useCallback, useRef, useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router"
import { toast } from "sonner"
import { Wand2, Loader2, ArrowRight, Sparkles, MessageSquare, CheckCircle2, FileText, Mail, Palette, Search, Compass } from "lucide-react"

import GenerateModal from "@/components/GenerateModal"
import { useAuth } from "@/hooks/useAuth"
import { trpc } from "@/providers/trpc"
import { ClarifyChatPanel } from "@/components/clarify/ClarifyChatPanel"
import { AuroraBackground } from "@/components/effects/AuroraBackground"
import { TextReveal } from "@/components/effects/TextReveal"
import { TiltCard } from "@/components/effects/TiltCard"
import { RippleButton } from "@/components/ui/RippleButton"
import type { RequirementSummary } from "@/components/clarify/types"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { QUICK_EXAMPLES } from "@/components/home/config"

// ── Types ────────────────────────────────────────────
type FlowStage = "input" | "clarify" | "results"

const STEPS = [
  { key: "input" as const, label: "描述需求", icon: MessageSquare },
  { key: "clarify" as const, label: "AI 分析", icon: Sparkles },
  { key: "results" as const, label: "生成结果", icon: CheckCircle2 },
]

// ── Scene Cards ────────────────────────────────────
const SCENES = [
  { icon: FileText, label: "文案创作", desc: "产品文案 / 邮件 / 社媒", color: "from-blue-500/20 to-cyan-500/20" },
  { icon: Palette, label: "创意生成", desc: "海报 / 插画 / 视频脚本", color: "from-purple-500/20 to-pink-500/20" },
  { icon: Mail, label: "办公辅助", desc: "会议纪要 / PPT / 邮件", color: "from-orange-500/20 to-yellow-500/20" },
  { icon: Search, label: "信息检索", desc: "论文 / 竞品 / 行业分析", color: "from-green-500/20 to-teal-500/20" },
]

// ── Progress Indicator ───────────────────────────────
function ProgressSteps({ stage }: { stage: FlowStage }) {
  const idx = STEPS.findIndex((s) => s.key === stage)
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((s, i) => {
        const Icon = s.icon
        const done = i < idx
        const active = i === idx
        return (
          <div key={s.key} className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-500
              ${done ? "bg-emerald-50 text-emerald-600" : active ? "bg-violet-100 text-violet-700 shadow-sm" : "bg-slate-50 text-slate-400"}`}
            >
              <Icon className={`w-3.5 h-3.5 ${active ? "text-violet-500" : done ? "text-emerald-500" : "text-slate-300"}`} />
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-6 h-px ${i < idx ? "bg-emerald-300" : "bg-slate-200"}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Compact Clarify Wrapper ──────────────────────────
function ClarifyStage({
  projectId,
  intent,
  onComplete,
  onBack,
}: {
  projectId: number
  intent: string
  onComplete: (answers: Record<string, string>, summary: RequirementSummary) => void
  onBack: () => void
}) {
  return (
    <div className="w-full max-w-2xl mx-auto animate-fade-in-up">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-slate-600 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-violet-500" />
          AI 正在了解你的需求
        </p>
        <Button variant="ghost" size="sm" className="text-xs text-slate-400" onClick={onBack}>
          返回修改需求
        </Button>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-lg overflow-hidden" style={{ height: "420px" }}>
        <ClarifyChatPanel projectId={projectId} intent={intent} onComplete={onComplete} />
      </div>
    </div>
  )
}

// ── Home ─────────────────────────────────────────────
export default function Home() {
  const [intent, setIntent] = useState("")
  const [stage, setStage] = useState<FlowStage>("input")
  const [clarifyProjectId, setClarifyProjectId] = useState<number | null>(null)
  const [pendingAnswers, setPendingAnswers] = useState<Record<string, string>>({})
  const [isCreating, setIsCreating] = useState(false)
  const [stepMode, setStepMode] = useState(false)

  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const urlProjectId = searchParams.get("projectId")
  const urlStage = searchParams.get("stage")
  const shouldLoadProject = urlStage === "generate" && !!urlProjectId

  const projectFromUrl = trpc.project.get.useQuery(
    { id: Number(urlProjectId) },
    { enabled: shouldLoadProject }
  )

  useEffect(() => {
    if (!shouldLoadProject) return
    if (!projectFromUrl.data) return
    const project = projectFromUrl.data
    setIntent(project.intent || "")
    setClarifyProjectId(project.id)
    setPendingAnswers({})
    setStage("results")
    setSearchParams({}, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldLoadProject, projectFromUrl.data])
  const { isAuthenticated } = useAuth()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const createProject = trpc.project.create.useMutation()
  const updateProject = trpc.project.update.useMutation()

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const handleStart = useCallback(async () => {
    if (!intent.trim()) { toast.error("请输入你的需求"); return }
    if (!isAuthenticated) { toast.info("请先登录"); navigate("/login"); return }

    setIsCreating(true)
    try {
      const title = intent.trim().length > 30 ? intent.trim().substring(0, 30) + "..." : intent.trim()
      const project = await createProject.mutateAsync({ title, intent: intent.trim(), domain: undefined })
      await updateProject.mutateAsync({ id: project.id, clarificationStatus: "in_progress" })
      setClarifyProjectId(project.id)
      setStage("clarify")
    } catch {
      toast.error("创建项目失败，请重试")
    } finally {
      setIsCreating(false)
    }
  }, [intent, isAuthenticated, navigate, createProject, updateProject])

  const handleClarifyComplete = useCallback(async (answers: Record<string, string>, _summary: RequirementSummary) => {
    if (clarifyProjectId) {
      try {
        await updateProject.mutateAsync({ id: clarifyProjectId, clarificationStatus: "completed", status: "ready" })
      } catch { /* non-blocking */ }
    }
    setPendingAnswers(answers)
    setStage("results")
  }, [clarifyProjectId, updateProject])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleStart()
    }
  }, [handleStart])

  const handleReset = useCallback(() => {
    setStage("input")
    setClarifyProjectId(null)
    setPendingAnswers({})
    setIntent("")
    setTimeout(() => textareaRef.current?.focus(), 100)
  }, [])

  return (
    <>
      <AuroraBackground />
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] px-4 py-8">
        <ProgressSteps stage={stage} />

        {/* STAGE 1: Input */}
        {stage === "input" && (
          <div className="w-full max-w-2xl">
            <div className="text-center mb-8">
              <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight mb-3">
                <TextReveal text="模糊需求" mode="word" stagger={80} />
                <span className="mx-3 text-slate-300 font-light">→</span>
                <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                  完美提示词
                </span>
              </h1>
              <p className="text-slate-400 max-w-md mx-auto text-sm">
                <TextReveal text="用自然语言描述任务，AI 自动分析意图并生成专业级提示词" mode="word" stagger={20} delay={400} />
              </p>
            </div>

            {/* Input Card */}
            <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur-xl shadow-xl shadow-slate-200/30 overflow-hidden">
              <Textarea
                ref={textareaRef}
                value={intent}
                onChange={(e) => setIntent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="描述你想完成的任务，例如：帮我写一份产品发布会的演讲稿..."
                className="min-h-[140px] text-base resize-none border-0 focus-visible:ring-0 p-5 shadow-none bg-transparent placeholder:text-slate-300 leading-relaxed"
              />

              {/* Examples */}
              <div className="flex flex-wrap gap-1.5 px-5 pb-3">
                {QUICK_EXAMPLES.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => setIntent(ex)}
                    className="text-xs text-slate-400 hover:text-violet-600 hover:bg-violet-50 px-2.5 py-1 rounded-lg transition-colors truncate max-w-[280px] text-left"
                  >
                    {ex.substring(0, 30)}…
                  </button>
                ))}
              </div>

              {/* Action bar */}
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
                <span className="text-xs text-slate-400">
                  {intent.length > 0 ? `${intent.length} 字` : "⌘↵ 快速生成"}
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setStepMode(v => !v)}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl transition-all ${
                      stepMode
                        ? "bg-violet-100 text-violet-700 border border-violet-200"
                        : "text-slate-400 hover:text-slate-600 bg-slate-50 border border-transparent"
                    }`}
                    title="复杂任务分步骤处理"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    {stepMode ? "分步骤" : "单步骤"}
                  </button>
                  <RippleButton variant="primary" size="md" onClick={handleStart}>
                    {isCreating ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />创建中...</>
                    ) : (
                      <><Wand2 className="w-4 h-4 mr-2" />开始生成<ArrowRight className="w-3.5 h-3.5 ml-1.5" /></>
                    )}
                  </RippleButton>
                </div>
              </div>
            </div>

            {/* Scene Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
              {SCENES.map((scene) => (
                <TiltCard key={scene.label} maxTilt={8} scale={1.03}>
                  <button
                    onClick={() => setIntent(scene.desc)}
                    className={`w-full p-4 rounded-xl bg-gradient-to-br ${scene.color} border border-white/40 backdrop-blur-sm hover:shadow-lg transition-shadow text-left`}
                  >
                    <scene.icon className="w-5 h-5 mb-2 text-slate-600" />
                    <div className="text-sm font-medium text-slate-700">{scene.label}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{scene.desc}</div>
                  </button>
                </TiltCard>
              ))}
            </div>
          </div>
        )}

        {/* STAGE 2: Clarify */}
        {stage === "clarify" && clarifyProjectId !== null && (
          <ClarifyStage
            projectId={clarifyProjectId}
            intent={intent}
            onComplete={handleClarifyComplete}
            onBack={() => setStage("input")}
          />
        )}

        {/* STAGE 3: Results */}
        {stage === "results" && (
          <div className="w-full max-w-2xl animate-fade-in-up">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-slate-600 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                需求澄清完成，正在生成提示词
              </p>
              <Button variant="ghost" size="sm" className="text-xs text-slate-400" onClick={() => navigate("/workspace")}>
                查看工作台
              </Button>
            </div>
            <GenerateModal
              key={`generate-${clarifyProjectId ?? 'new'}`}
              intent={intent}
              answers={pendingAnswers}
              stepMode={stepMode}
              inline
              onClose={handleReset}
              onSaved={() => { handleReset(); navigate("/workspace") }}
            />
          </div>
        )}
      </div>
    </>
  )
}
