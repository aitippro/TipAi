import { useParams, useNavigate } from "react-router"
import { trpc } from "@/providers/trpc"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  ArrowLeft,
  FolderOpen,
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
} from "lucide-react"

import type {
  ClarifyQuestion,
  ClarifyAnswer,
  RequirementSummary,
} from "@/components/clarify/types"

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

const CLARIFICATION_STATUS_LABELS: Record<string, string> = {
  pending: "待澄清",
  in_progress: "澄清中",
  completed: "已澄清",
}

interface ConversationTurn {
  id: number
  role: string
  content: string
  questionData?: ClarifyQuestion | null
  answerData?: ClarifyAnswer | null
  turnNumber: number
  createdAt: Date | null
}

function SummaryDisplay({
  summary,
  onGenerate,
  isGenerating,
}: {
  summary: RequirementSummary | null
  onGenerate: () => void
  isGenerating: boolean
}) {
  if (!summary) {
    return (
      <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-slate-100">
        <p className="text-sm text-slate-400 mb-4">需求澄清完成后可生成摘要</p>
        <Button
          variant="outline"
          className="rounded-xl"
          onClick={onGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            生成中...
          </> : <>
            <Wand2 className="w-4 h-4 mr-2" />
            生成需求摘要
          </>}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100">
        <div className="flex items-center gap-2 mb-2">
          <Lightbulb className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-medium text-emerald-800">需求摘要</span>
        </div>
        <p className="text-sm text-slate-700 leading-relaxed">{summary.summary}</p>
      </div>

      {summary.requirements.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-slate-800 mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            核心需求
            <span className="text-xs text-slate-400">({summary.requirements.length} 项)</span>
          </h4>
          <ul className="space-y-2">
            {summary.requirements.map((req, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 text-xs flex items-center justify-center shrink-0 font-medium mt-0.5">
                  {idx + 1}
                </span>
                <span className="text-sm text-slate-600 flex-1">{req}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {summary.constraints.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-slate-800 mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            约束条件
          </h4>
          <ul className="space-y-1.5">
            {summary.constraints.map((constraint, idx) => (
              <li key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                <span className="w-1 h-1 rounded-full bg-amber-400" />
                {constraint}
              </li>
            ))}
          </ul>
        </div>
      )}

      {summary.suggestedFrameworks.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-slate-800 mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-violet-500" />
            推荐框架
          </h4>
          <div className="flex flex-wrap gap-2">
            {summary.suggestedFrameworks.map((fw, idx) => (
              <Badge key={idx} variant="outline" className="bg-violet-50 text-violet-700 border-violet-100">
                {fw}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="pt-4 border-t border-slate-100">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-1">目标领域</div>
            <div className="text-sm font-medium text-slate-700">
              {DOMAIN_LABELS[summary.intentAnalysis?.domain] || summary.intentAnalysis?.domain || "通用"}
            </div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-1">复杂度</div>
            <div className="text-sm font-medium text-slate-700">
              {summary.intentAnalysis?.complexity === "simple"
                ? "简单"
                : summary.intentAnalysis?.complexity === "medium"
                  ? "中等"
                  : "复杂"}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ProjectDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const projectId = parseInt(id || "0", 10)

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
    onError: (e) => toast.error(e.message),
  })

  const utils = trpc.useUtils()

  if (isLoadingProject) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-32 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-400 mx-auto mb-3" />
        <p className="text-sm text-slate-400">加载中...</p>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-32 text-center">
        <p className="text-slate-400 mb-4">项目不存在或已被删除</p>
        <Button variant="outline" onClick={() => navigate("/projects")}>
          返回项目列表
        </Button>
      </div>
    )
  }

  const turns: ConversationTurn[] = (conversation || []).map((t) => ({
    id: t.id,
    role: t.role,
    content: t.content,
    questionData: t.questionData as ClarifyQuestion | undefined,
    answerData: t.answerData as ClarifyAnswer | undefined,
    turnNumber: t.turnNumber,
    createdAt: t.createdAt,
  }))

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate("/projects")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-semibold text-slate-900">{project.title}</h1>
            <Badge variant="outline" className="rounded-lg">
              {DOMAIN_LABELS[project.domain || "general"] || project.domain || "通用"}
            </Badge>
            <Badge variant="outline" className="rounded-lg">
              {STATUS_LABELS[project.status] || project.status}
            </Badge>
            {project.clarificationStatus && (
              <Badge variant="outline" className="rounded-lg bg-slate-50">
                {CLARIFICATION_STATUS_LABELS[project.clarificationStatus] || project.clarificationStatus}
              </Badge>
            )}
          </div>
          {project.description && (
            <p className="text-sm text-slate-500 mt-1">{project.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Clock className="w-3.5 h-3.5" />
          {project.updatedAt
            ? new Date(project.updatedAt).toLocaleDateString("zh-CN")
            : ""}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversation Panel */}
        <Card className="border-0 shadow-sm rounded-2xl overflow-hidden"
        >
          <CardContent className="p-0"
        >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50"
        >
              <div className="flex items-center gap-2"
        >
                <MessageSquare className="w-4 h-4 text-violet-500" />
                <span className="font-medium text-sm text-slate-800">澄清对话</span>
              </div>
              <span className="text-xs text-slate-400">{turns.length} 轮</span>
            </div>

            <div className="p-5 space-y-4 max-h-[600px] overflow-y-auto"
        >
              {isLoadingConversation ? (
                <div className="text-center py-12"
        >
                  <Loader2 className="w-6 h-6 animate-spin text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">加载对话...</p>
                </div>
              ) : turns.length === 0 ? (
                <div className="text-center py-12 text-slate-400"
        >
                  <p className="text-sm">暂无对话记录</p>
                </div>
              ) : (
                turns.map((turn) => (
                  <div key={turn.id} className="flex gap-3"
        >
                    <div className="shrink-0"
        >
                      {turn.role === "user" ? (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center"
        >
                          <User className="w-3.5 h-3.5 text-white" />
                        </div>
                      ) : turn.role === "assistant" ? (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center"
        >
                          <Bot className="w-3.5 h-3.5 text-white" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"
        >
                          <span className="text-xs text-slate-400">SYS</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0"
        >
                      <div
                        className={`
                          px-4 py-3 rounded-2xl text-sm
                          ${turn.role === "user"
                            ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-tl-sm"
                            : "bg-white border border-slate-100 text-slate-800 rounded-tr-sm"
                          }
                        `}
                      >
                        <p className="whitespace-pre-wrap break-words">{turn.content}</p>
                      </div>

                      {turn.questionData && (
                        <div className="mt-2 text-xs text-slate-400 italic"
        >
                          💡 {turn.questionData.why}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Summary Panel */}
        <Card className="border-0 shadow-sm rounded-2xl overflow-hidden"
        >
          <CardContent className="p-0"
        >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50"
        >
              <div className="flex items-center gap-2"
        >
                <FolderOpen className="w-4 h-4 text-emerald-500" />
                <span className="font-medium text-sm text-slate-800">需求摘要</span>
              </div>
              {summaryData && (
                <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                  已生成
                </Badge>
              )}
            </div>

            <div className="p-5"
        >
              {isLoadingSummary ? (
                <div className="text-center py-12"
        >
                  <Loader2 className="w-6 h-6 animate-spin text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">加载摘要...</p>
                </div>
              ) : (
                <SummaryDisplay
                  summary={summaryData as RequirementSummary | null}
                  onGenerate={() => generateSummaryMutation.mutate({ projectId })}
                  isGenerating={generateSummaryMutation.isPending}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
