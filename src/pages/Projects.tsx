import { useState, useMemo } from "react"
import { useNavigate } from "react-router"
import { trpc } from "@/providers/trpc"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  FolderOpen,
  Search,
  Trash2,
  MessageSquare,
  ChevronRight,
  Clock,
  Sparkles,
  Loader2,
} from "lucide-react"

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

const DOMAIN_COLORS: Record<string, string> = {
  "content-marketing": "bg-rose-50 text-rose-700 border-rose-200",
  programming: "bg-blue-50 text-blue-700 border-blue-200",
  education: "bg-amber-50 text-amber-700 border-amber-200",
  "data-analysis": "bg-emerald-50 text-emerald-700 border-emerald-200",
  legal: "bg-slate-50 text-slate-700 border-slate-200",
  general: "bg-violet-50 text-violet-700 border-violet-200",
  "image-gen": "bg-pink-50 text-pink-700 border-pink-200",
  "video-gen": "bg-orange-50 text-orange-700 border-orange-200",
}

const STATUS_LABELS: Record<string, string> = {
  draft: "草稿",
  ready: "就绪",
  executing: "执行中",
  completed: "已完成",
  archived: "已归档",
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-50 text-slate-600 border-slate-200",
  ready: "bg-emerald-50 text-emerald-600 border-emerald-200",
  executing: "bg-blue-50 text-blue-600 border-blue-200",
  completed: "bg-violet-50 text-violet-600 border-violet-200",
  archived: "bg-gray-50 text-gray-500 border-gray-200",
}

const CLARIFICATION_STATUS_LABELS: Record<string, string> = {
  pending: "待澄清",
  in_progress: "澄清中",
  completed: "已澄清",
}

export default function Projects() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [search, setSearch] = useState("")
  const utils = trpc.useUtils()

  const { data: items, isLoading } = trpc.project.list.useQuery(undefined, {
    enabled: isAuthenticated,
  })

  const deleteMutation = trpc.project.delete.useMutation({
    onSuccess: () => {
      utils.project.list.invalidate()
      toast.success("项目已删除")
    },
    onError: (e) => toast.error(e.message),
  })

  const filtered = useMemo(() =>
    items?.filter(
      (item) =>
        !search ||
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        (item.intent && item.intent.toLowerCase().includes(search.toLowerCase())) ||
        (item.description && item.description.toLowerCase().includes(search.toLowerCase())),
    ), [items, search])

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-32 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-6">
          <FolderOpen className="w-7 h-7 text-slate-400" />
        </div>
        <h2 className="text-xl font-semibold text-slate-800 mb-2">请先登录</h2>
        <p className="text-sm text-slate-400 mb-8">登录后查看你的项目</p>
        <Button onClick={() => navigate("/login")} className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl">
          去登录
        </Button>
      </div>
    )
  }
  return (
    <div className="max-w-5xl mx-auto px-6 py-14">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 mb-1">项目</h1>
          <p className="text-sm text-slate-400">需求澄清对话与生成记录</p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="搜索项目..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-white border-slate-100 rounded-xl focus-visible:ring-violet-200 focus-visible:border-violet-300"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-violet-400 mb-3" />
          <p className="text-sm text-slate-400">加载中...</p>
        </div>
      ) : filtered && filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((item) => (
            <Card
              key={item.id}
              className="border-0 shadow-sm rounded-2xl bg-white hover:shadow-md transition-all duration-300 overflow-hidden cursor-pointer group"
              onClick={() => navigate(`/projects/${item.id}`)}
            >
              <CardContent className="p-0">
                <div className="flex items-center px-5 py-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center mr-4 shrink-0 group-hover:from-violet-200 group-hover:to-indigo-200 transition-colors">
                    <FolderOpen className="w-5 h-5 text-violet-500" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm text-slate-800 truncate">
                        {item.title}
                      </h3>
                      <Badge variant="outline" className={`text-[10px] rounded-md ${DOMAIN_COLORS[item.domain || "general"] || DOMAIN_COLORS.general}`}>
                        {DOMAIN_LABELS[item.domain || "general"] || "通用"}
                      </Badge>
                      <Badge variant="outline" className={`text-[10px] rounded-md ${STATUS_COLORS[item.status] || STATUS_COLORS.draft}`}>
                        {STATUS_LABELS[item.status] || item.status}
                      </Badge>
                      {item.clarificationStatus && (
                        <Badge variant="outline" className="text-[10px] rounded-md bg-slate-50">
                          {CLARIFICATION_STATUS_LABELS[item.clarificationStatus] || item.clarificationStatus}
                        </Badge>
                      )}
                    </div>
                    {item.intent && (
                      <p className="text-xs text-slate-400 mt-1 truncate max-w-md">
                        {item.intent}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-4 ml-4 shrink-0">
                    {item.turnCount !== null && item.turnCount > 0 && (
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <MessageSquare className="w-3 h-3" />
                        {item.turnCount} 轮
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Clock className="w-3 h-3" />
                      {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString("zh-CN") : ""}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 rounded-lg hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm("确定删除此项目？相关对话和摘要也将被删除。")) {
                          deleteMutation.mutate({ id: item.id })
                        }
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </Button>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-32">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-6">
            <FolderOpen className="w-7 h-7 text-slate-400" />
          </div>
          <p className="text-slate-400 mb-2">还没有项目</p>
          <p className="text-sm text-slate-400 mb-8">
            在首页输入需求并生成提示词，AI会自动创建项目并记录澄清对话
          </p>
          <Button className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl" onClick={() => navigate("/")}>
            <Sparkles className="w-4 h-4 mr-2" />
            去生成
          </Button>
        </div>
      )}
    </div>
  )
}
