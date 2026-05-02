import { useState } from "react"
import { useNavigate } from "react-router"
import { motion } from "framer-motion"
import { trpc } from "@/providers/trpc"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { EmptyState } from "@/components/EmptyState"
import { ScrollReveal } from "@/components/effects/ScrollReveal"
import { StaggerContainer, StaggerItem } from "@/components/effects/StaggerContainer"
import { Skeleton } from "@/components/ui/Skeleton"
import { TiltCard } from "@/components/effects/TiltCard"
import {
  BookOpen, Search, Trash2, Copy, Clock,
  ChevronDown, ChevronUp, Sparkles,
} from "lucide-react"

const DOMAIN_COLORS: Record<string, string> = {
  "content-marketing": "bg-pink-50 text-pink-600 border-pink-200",
  programming: "bg-blue-50 text-blue-600 border-blue-200",
  education: "bg-emerald-50 text-emerald-600 border-emerald-200",
  "data-analysis": "bg-violet-50 text-violet-600 border-violet-200",
  legal: "bg-amber-50 text-amber-600 border-amber-200",
  general: "bg-slate-50 text-slate-600 border-slate-200",
}

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

export default function Library() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [search, setSearch] = useState("")
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [copiedId, setCopiedId] = useState<number | null>(null)

  const { data: items, isLoading } = trpc.promptForge.getLibrary.useQuery(undefined, {
    retry: 1,
  })
  const utils = trpc.useUtils()
  const deleteMutation = trpc.promptForge.deleteFromLibrary.useMutation({
    onSuccess: () => {
      utils.promptForge.getLibrary.invalidate()
      toast.success("已删除")
    },
  })

  const handleCopy = async (text: string, id: number) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const filtered = items?.filter((item: { title: string; generatedPrompt: string }) =>
    !search || item.title.toLowerCase().includes(search.toLowerCase()) || item.generatedPrompt.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-5xl mx-auto px-6 py-14">
      <ScrollReveal>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 mb-1">提示词库</h1>
            <p className="text-sm text-slate-400">你保存的所有提示词，随时查看和使用</p>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="搜索项目、提示词、模板..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white/80 backdrop-blur-sm border-slate-200/80 rounded-xl focus-visible:ring-apple-blue/30"
            />
          </div>
        </div>
      </ScrollReveal>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : filtered?.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-10 h-10" />}
          title="库是空的"
          description="还没有保存的提示词"
          action={{ label: "去工作台创建", onClick: () => navigate("/workspace") }}
        />
      ) : (
        <StaggerContainer className="space-y-3">
          {filtered?.map((item: { id: number; title: string; domain?: string; generatedPrompt: string; isFavorite?: number; createdAt?: string | Date }) => (
            <StaggerItem key={item.id}>
              <TiltCard maxTilt={2} scale={1.005}>
                <Card className="border-0 shadow-sm rounded-2xl bg-white/80 backdrop-blur-sm overflow-hidden">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-semibold text-slate-800 text-sm">{item.title}</h3>
                          {item.domain && (
                            <Badge variant="outline" className={`text-[10px] rounded-md ${DOMAIN_COLORS[item.domain] || ""}`}>
                              {DOMAIN_LABELS[item.domain] || item.domain}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mb-2 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {item.createdAt ? new Date(item.createdAt).toLocaleDateString("zh-CN") : ""}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg"
                          onClick={() => handleCopy(item.generatedPrompt, item.id)}
                        >
                          {copiedId === item.id ? (
                            <Sparkles className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Copy className="w-4 h-4 text-slate-400" />
                          )}
                        </Button>
                        {isAuthenticated && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-red-400 hover:text-red-500 hover:bg-red-50"
                            onClick={() => deleteMutation.mutate({ id: item.id })}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg"
                          onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                        >
                          {expandedId === item.id ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {expandedId === item.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 pt-3 border-t border-slate-100"
                      >
                        <p className="text-xs font-medium text-slate-500 mb-1.5">生成提示词</p>
                        <div className="bg-slate-50 rounded-lg p-3">
                          <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{item.generatedPrompt}</p>
                        </div>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </TiltCard>
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}
    </div>
  )
}
