import { useState } from "react"
import { useParams, useNavigate } from "react-router"
import { motion, AnimatePresence } from "framer-motion"
import { trpc } from "@/providers/trpc"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  ArrowLeft,
  Bot,
  User,
  Loader2,
  Wand2,
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Clock,
  MessageSquare,
  FolderOpen,
  PanelRight,
  PanelRightClose,
  Send,
  Sparkles,
} from "lucide-react"
import { ScrollReveal } from "@/components/effects/ScrollReveal"
import { Skeleton } from "@/components/ui/Skeleton"
import GenerateModal from "@/components/GenerateModal"

const DOMAIN_LABELS: Record<string, string> = {
  "content-marketing": "内容营销",
  programming: "编程开发",
  education: "教育教学",
  "data-analysis": "数据分析",
  legal: "法律分析",
  general: "通用",
  "image-gen": "图像生成",
  "video-gen": "视频生成",
}

const STATUS_LABELS: Record<string, string> = {
  draft: "草稿",
  ready: "就绪",
  executing: "执行中",
  completed: "已完成",
  archived: "已归档",
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  ready: "bg-emerald-50 text-emerald-600",
  executing: "bg-blue-50 text-blue-600",
  completed: "bg-violet-50 text-violet-600",
  archived: "bg-gray-50 text-gray-400",
}

const CLARIFICATION_STATUS_LABELS: Record<string, string> = {
  pending: "待澄清",
  in_progress: "澄清中",
  completed: "已澄清",
}

interface ConversationTurn {
  id: number
  role: string
  content: string
  turnNumber: number
  createdAt: Date | null
}

/**
 * ProjectDetail — 项目详情对话剧场
 * Messages/iMessage 风格气泡 + 可折叠摘要抽屉 + 底部输入栏
 */
export default function ProjectDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const projectId = parseInt(id || "0", 10)
  const [drawerOpen, setDrawerOpen] = useState(true)
  const [inputValue, setInputValue] = useState("")
  const [showGenerate, setShowGenerate] = useState(false)

  const { data: project, isLoading: isLoadingProject } = trpc.project.get.useQuery(
    { id: projectId },
    { enabled: projectId > 0 }
  )

  const { data: conversation, isLoading: isLoadingConversation } =
    trpc.project.getConversation.useQuery(
      { id: projectId },
      { enabled: projectId > 0 }
    )

  const { data: summaryData, isLoading: isLoadingSummary } =
    trpc.project.getSummary.useQuery(
      { id: projectId },
      { enabled: projectId > 0 }
    )

  const generateSummaryMutation = trpc.project.generateSummary.useMutation({
    onSuccess: () => {
      utils.project.getSummary.invalidate({ id: projectId })
      toast.success("需求摘要已生成")
    },
    onError: (e: { message?: string }) => toast.error(e.message || "生成失败"),
  })

  const utils = trpc.useUtils()

  if (isLoadingProject) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-14">
        <div className="flex items-center gap-4 mb-8">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-[500px] rounded-2xl lg:col-span-2" />
          <Skeleton className="h-[500px] rounded-2xl" />
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-32 text-center">
        <p className="text-slate-400 mb-4">项目不存在或已被删除</p>
        <Button variant="outline" className="rounded-xl" onClick={() => navigate("/workspace")}>
          <ArrowLeft className="w-4 h-4 mr-2" />返回工作台
        </Button>
      </div>
    )
  }

  const turns: ConversationTurn[] = (conversation || []).map((t) => ({
    id: t.id,
    role: t.role,
    content: t.content,
    turnNumber: t.turnNumber,
    createdAt: t.createdAt,
  }))

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <ScrollReveal>
        <div className="shrink-0 px-6 py-4 border-b border-slate-100/80 flex items-center gap-4 bg-white/70 backdrop-blur-xl">
          <Button variant="ghost" size="icon" className="rounded-full shrink-0" onClick={() => navigate("/workspace")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold text-slate-900 truncate">{project.title}</h1>
              <Badge variant="outline" className={`rounded-lg text-xs ${STATUS_COLORS[project.status] || "bg-slate-100 text-slate-600"}`}>
                {STATUS_LABELS[project.status] || project.status}
              </Badge>
              {project.clarificationStatus && (
                <Badge variant="outline" className="rounded-lg text-xs bg-slate-50">
                  {CLARIFICATION_STATUS_LABELS[project.clarificationStatus] || project.clarificationStatus}
                </Badge>
              )}
            </div>
            {project.description && (
              <p className="text-xs text-slate-500 mt-0.5 truncate">{project.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="hidden lg:flex rounded-xl text-xs gap-1.5"
              onClick={() => setDrawerOpen(!drawerOpen)}
            >
              {drawerOpen ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRight className="w-3.5 h-3.5" />}
              {drawerOpen ? "收起" : "摘要"}
            </Button>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Clock className="w-3 h-3" />
              {project.updatedAt
                ? new Date(project.updatedAt).toLocaleDateString("zh-CN")
                : ""}
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Conversation */}
        <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${drawerOpen ? "lg:mr-0" : ""}`}>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {isLoadingConversation ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
                <p className="text-xs text-slate-400">加载对话...</p>
              </div>
            ) : turns.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <MessageSquare className="w-10 h-10 mb-3 text-slate-200" />
                <p className="text-sm">暂无对话记录</p>
                <p className="text-xs mt-1">开始与 AI 澄清你的需求</p>
              </div>
            ) : (
              turns.map((turn, i) => (
                <motion.div
                  key={turn.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03, type: "spring", stiffness: 300, damping: 25 }}
                  className={`flex gap-3 ${turn.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div className="shrink-0">
                    {turn.role === "user" ? (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-apple-blue to-apple-purple flex items-center justify-center shadow-md">
                        <User className="w-3.5 h-3.5 text-white" />
                      </div>
                    ) : turn.role === "assistant" ? (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-md">
                        <Bot className="w-3.5 h-3.5 text-white" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                        <span className="text-[10px] text-slate-400 font-medium">SYS</span>
                      </div>
                    )}
                  </div>

                  <div className={`flex-1 min-w-0 max-w-[80%] ${turn.role === "user" ? "items-end" : "items-start"}`}>
                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      className={`
                        px-4 py-3 rounded-2xl text-sm leading-relaxed
                        ${turn.role === "user"
                          ? "bg-gradient-to-br from-apple-blue to-apple-purple text-white rounded-tr-sm shadow-md"
                          : "bg-white/90 backdrop-blur-sm border border-slate-100 text-slate-800 rounded-tl-sm shadow-sm"
                        }
                      `}
                    >
                      <p className="whitespace-pre-wrap break-words">{turn.content}</p>
                    </motion.div>
                    <div className={`flex items-center gap-1 mt-1 text-[10px] text-slate-400 ${turn.role === "user" ? "justify-end" : ""}`}>
                      {turn.turnNumber > 0 && <span>第 {turn.turnNumber} 轮</span>}
                      {turn.createdAt && (
                        <span>{new Date(turn.createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {/* Input Bar — context-aware placeholder */}
          <div className="shrink-0 px-6 py-3 border-t border-slate-100/80 bg-white/70 backdrop-blur-xl">
            <div className="flex items-center gap-3 max-w-3xl mx-auto">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={
                    project.status === "ready"
                      ? "项目已就绪，点击右侧「生成提示词」继续"
                      : project.status === "completed"
                        ? "项目已完成，可在提示词库查看结果"
                        : "输入消息继续对话..."
                  }
                  className="w-full h-10 px-4 pr-10 rounded-full bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue/20 focus:border-apple-blue/30 transition-all"
                  disabled={project.status !== "draft"}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && inputValue.trim()) {
                      toast.info("对话功能开发中")
                      setInputValue("")
                    }
                  }}
                />
              </div>
              <Button
                size="icon"
                className="rounded-full bg-gradient-to-br from-apple-blue to-apple-purple text-white shadow-md shrink-0"
                disabled={!inputValue.trim() || project.status !== "draft"}
                onClick={() => {
                  toast.info("对话功能开发中")
                  setInputValue("")
                }}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Drawer */}
        <AnimatePresence>
          {drawerOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="hidden lg:block shrink-0 border-l border-slate-100/80 bg-white/50 backdrop-blur-sm overflow-y-auto"
            >
              <div className="w-[320px] p-5 space-y-5">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-emerald-500" />
                  <span className="font-medium text-sm text-slate-800">需求摘要</span>
                  {summaryData && (
                    <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 ml-auto">
                      已生成
                    </Badge>
                  )}
                </div>

                {isLoadingSummary ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
                  </div>
                ) : !summaryData ? (
                  <div className="text-center py-8">
                    <p className="text-xs text-slate-400 mb-3">需求澄清完成后可生成摘要</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl text-xs"
                      onClick={() => generateSummaryMutation.mutate({ projectId })}
                      disabled={generateSummaryMutation.isPending}
                    >
                      {generateSummaryMutation.isPending ? (
                        <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />生成中...</>
                      ) : (
                        <><Wand2 className="w-3.5 h-3.5 mr-1" />生成摘要</>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100">
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb className="w-4 h-4 text-emerald-600" />
                        <span className="text-sm font-medium text-emerald-800">摘要</span>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">{summaryData.summary}</p>
                    </div>

                    {summaryData.requirements?.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span className="text-xs font-medium text-slate-700">核心需求</span>
                        </div>
                        <ul className="space-y-1.5">
                          {summaryData.requirements.map((req: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 text-[10px] flex items-center justify-center shrink-0 font-medium mt-0.5">
                                {idx + 1}
                              </span>
                              <span className="text-xs text-slate-600 flex-1">{req}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {summaryData.constraints?.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="w-4 h-4 text-amber-500" />
                          <span className="text-xs font-medium text-slate-700">约束条件</span>
                        </div>
                        <ul className="space-y-1">
                          {summaryData.constraints.map((c: string, idx: number) => (
                            <li key={idx} className="flex items-center gap-2 text-xs text-slate-600">
                              <span className="w-1 h-1 rounded-full bg-amber-400" />
                              {c}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {summaryData.suggestedFrameworks?.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <BookOpen className="w-4 h-4 text-violet-500" />
                          <span className="text-xs font-medium text-slate-700">推荐框架</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {summaryData.suggestedFrameworks.map((fw: string, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-xs bg-violet-50 text-violet-700 border-violet-100">
                              {fw}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                      <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                        <div className="text-[10px] text-slate-400 mb-0.5">领域</div>
                        <div className="text-xs font-medium text-slate-700">
                          {(() => {
                            const _domain = (summaryData as { intentAnalysis?: { domain?: string } }).intentAnalysis?.domain;
                            return _domain && DOMAIN_LABELS[_domain] ? DOMAIN_LABELS[_domain] : "通用";
                          })()}
                        </div>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                        <div className="text-[10px] text-slate-400 mb-0.5">复杂度</div>
                        <div className="text-xs font-medium text-slate-700">
                          {(summaryData as { intentAnalysis?: { complexity?: string } }).intentAnalysis?.complexity === "simple" ? "简单"
                            : (summaryData as { intentAnalysis?: { complexity?: string } }).intentAnalysis?.complexity === "medium" ? "中等"
                            : "复杂"}
                        </div>
                      </div>
                    </div>

                    {/* Generate Prompt Action */}
                    {project.status === "ready" && !showGenerate && (
                      <Button
                        className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-200/50"
                        onClick={() => setShowGenerate(true)}
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        生成提示词
                      </Button>
                    )}

                    {showGenerate && project.status === "ready" && (
                      <div className="mt-2">
                        <GenerateModal
                          intent={project.intent || ""}
                          answers={{}}
                          stepMode={false}
                          inline
                          onClose={() => setShowGenerate(false)}
                          onSaved={() => {
                            setShowGenerate(false)
                            toast.success("已保存到提示词库")
                            utils.project.get.invalidate({ id: projectId })
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
