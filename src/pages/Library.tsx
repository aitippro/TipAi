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
  BookOpen, Search, Trash2, Copy, Wand2, Clock,
  Megaphone, Code, GraduationCap, BarChart3, Scale, Globe,
  ChevronDown, ChevronUp, Sparkles,
} from "lucide-react"

const DOMAIN_ICONS: Record<string, typeof Globe> = {
  "content-marketing": Megaphone, programming: Code, education: GraduationCap,
  "data-analysis": BarChart3, legal: Scale, general: Globe,
}

const DOMAIN_LABELS: Record<string, string> = {
  "content-marketing": "内容营销", programming: "编程开发", education: "教育教学",
  "data-analysis": "数据分析", legal: "法律分析", general: "通用",
}

const DOMAIN_COLORS: Record<string, string> = {
  "content-marketing": "bg-rose-50 text-rose-700 border-rose-200",
  programming: "bg-blue-50 text-blue-700 border-blue-200",
  education: "bg-amber-50 text-amber-700 border-amber-200",
  "data-analysis": "bg-emerald-50 text-emerald-700 border-emerald-200",
  legal: "bg-slate-50 text-slate-700 border-slate-200",
  general: "bg-violet-50 text-violet-700 border-violet-200",
}

export default function Library() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [search, setSearch] = useState("")
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const { data: items, isLoading } = trpc.promptForge.getLibrary.useQuery(undefined, { enabled: isAuthenticated })
  const utils = trpc.useUtils()

  const deleteMutation = trpc.promptForge.deleteFromLibrary.useMutation({
    onSuccess: () => { utils.promptForge.getLibrary.invalidate(); toast.success("已删除") },
    onError: (e) => toast.error(e.message),
  })

  if (!isAuthenticated) return (
    <div className="max-w-4xl mx-auto px-6 py-32">
      <EmptyState
        icon={<BookOpen className="w-10 h-10" />}
        title="请先登录"
        description="登录后查看你保存的提示词"
        action={{ label: "去登录", onClick: () => navigate("/login") }}
      />
    </div>
  )

  const filtered = items?.filter((item) =>
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
            <Input placeholder="搜索提示词..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white/80 backdrop-blur-sm border-slate-200/80 rounded-xl focus-visible:ring-apple-blue/30" />
          </div>
        </div>
      </ScrollReveal>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-3xl" />
          ))}
        </div>
      ) : filtered && filtered.length > 0 ? (
        <StaggerContainer className="space-y-4">
          {filtered.map((item) => {
            const DomainIcon = DOMAIN_ICONS[item.domain || "general"] || Globe
            const domainColor = DOMAIN_COLORS[item.domain || "general"] || DOMAIN_COLORS.general
            const isExpanded = expandedId === item.id
            return (
              <StaggerItem key={item.id}>
                <TiltCard maxTilt={4} scale={1.01}>
                  <Card className="border-0 shadow-lg shadow-slate-100/40 rounded-3xl bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-500 overflow-hidden">
                    <CardContent className="p-0">
                      <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-50 bg-slate-50/20">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <div className="w-7 h-7 rounded-lg bg-white border border-slate-100 flex items-center justify-center">
                            <DomainIcon className="w-3.5 h-3.5 text-violet-500" />
                          </div>
                          <h3 className="font-semibold text-sm text-slate-800">{item.title}</h3>
                          <Badge variant="outline" className={`text-[10px] rounded-md ${domainColor}`}>{DOMAIN_LABELS[item.domain || "general"]}</Badge>
                          <Badge variant="outline" className="text-[10px] rounded-md bg-white">{item.framework}</Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg hover:bg-slate-100" onClick={() => {
                            navigator.clipboard.writeText(item.generatedPrompt); setCopiedId(item.id); setTimeout(() => setCopiedId(null), 2000); toast.success("已复制")
                          }}>
                            <Copy className={`w-3.5 h-3.5 ${copiedId === item.id ? "text-emerald-500" : "text-slate-400"}`} />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg hover:bg-slate-100" onClick={() => { if (confirm("确定删除？")) deleteMutation.mutate({ id: item.id }) }}>
                            <Trash2 className="w-3.5 h-3.5 text-red-400 hover:text-red-600" />
                          </Button>
                        </div>
                      </div>
                      <div className="px-6 py-4">
                        <div className="relative group">
                          <div className={`code-block rounded-2xl p-4 overflow-x-auto ${isExpanded ? "" : "max-h-52 overflow-hidden"}`}>
                            <pre className="text-sm whitespace-pre-wrap leading-relaxed text-slate-200">{item.generatedPrompt}</pre>
                            {!isExpanded && item.generatedPrompt.length > 300 && <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#1c1c1e] to-transparent rounded-b-2xl" />}
                          </div>
                          <Button size="sm" variant="secondary" className="absolute top-3 right-3 h-7 text-xs opacity-0 group-hover:opacity-100 transition-all bg-white/90 text-slate-800 hover:bg-white rounded-lg shadow-lg"
                            onClick={() => { navigator.clipboard.writeText(item.generatedPrompt); setCopiedId(item.id); setTimeout(() => setCopiedId(null), 2000); toast.success("已复制") }}>
                            <Copy className="w-3 h-3 mr-1" />复制
                          </Button>
                        </div>
                        {item.generatedPrompt.length > 300 && (
                          <button onClick={() => setExpandedId(isExpanded ? null : item.id)} className="mt-2 text-xs text-violet-600 hover:text-violet-700 flex items-center gap-1 font-medium transition-colors">
                            {isExpanded ? <><ChevronUp className="w-3.5 h-3.5" />收起</> : <><ChevronDown className="w-3.5 h-3.5" />展开全部</>}
                          </button>
                        )}
                      </div>
                      <div className="flex items-center justify-between px-6 py-2.5 border-t border-slate-50 bg-slate-50/10">
                        {item.originalIntent && <span className="text-xs text-slate-400 max-w-xs truncate">原始需求：{item.originalIntent}</span>}
                        <div className="flex items-center gap-3 text-xs text-slate-400 ml-auto">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{item.createdAt ? new Date(item.createdAt).toLocaleDateString("zh-CN") : ""}</span>
                          <span className="flex items-center gap-1"><Sparkles className="w-3 h-3" />{item.model}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TiltCard>
              </StaggerItem>
            )
          })}
        </StaggerContainer>
      ) : (
        <EmptyState
          icon={<BookOpen className="w-10 h-10" />}
          title="还没有保存的提示词"
          description="生成提示词后可以保存到这里，方便日后查看"
          action={{ label: "去生成", onClick: () => navigate("/") }}
        />
      )}
    </div>
  )
}
