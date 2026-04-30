import { useState } from "react"
import {
  AlertCircle,
  Filter,
  RefreshCw,
  Search,
  Store,
  TrendingUp,
  LayoutGrid,
  List,
} from "lucide-react"
import { toast } from "sonner"

import { CreateTemplateDialog } from "@/components/template-market/CreateTemplateDialog"
import {
  DEFAULT_TEMPLATES,
  DOMAIN_LABELS,
} from "@/components/template-market/config"
import { TemplateMarketCard } from "@/components/template-market/TemplateMarketCard"
import {
  createEmptyTemplateDraft,
  type TemplateDraft,
} from "@/components/template-market/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/hooks/useAuth"
import { trpc } from "@/providers/trpc"
import { ScrollReveal } from "@/components/effects/ScrollReveal"
import { StaggerContainer, StaggerItem } from "@/components/effects/StaggerContainer"
import { EmptyState } from "@/components/EmptyState"
import { Skeleton } from "@/components/ui/Skeleton"
import { TiltCard } from "@/components/effects/TiltCard"

export default function TemplateMarket() {
  const { isAuthenticated } = useAuth()
  const [search, setSearch] = useState("")
  const [selectedDomain, setSelectedDomain] = useState("all")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [createOpen, setCreateOpen] = useState(false)
  const [newTemplate, setNewTemplate] = useState<TemplateDraft>(() =>
    createEmptyTemplateDraft(),
  )

  const {
    data: apiTemplates,
    isLoading,
    isError,
    error,
    refetch,
  } = trpc.template.list.useQuery(undefined, {
    retry: 1,
    staleTime: 1000 * 60,
  })
  const { data: myTemplates } = trpc.template.myTemplates.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: 1,
  })
  const utils = trpc.useUtils()

  const createMutation = trpc.template.create.useMutation({
    onSuccess: () => {
      toast.success("模板创建成功")
      setCreateOpen(false)
      utils.template.list.invalidate()
      utils.template.myTemplates.invalidate()
      setNewTemplate(createEmptyTemplateDraft())
    },
    onError: (mutationError) => toast.error(mutationError.message),
  })

  const useMutation = trpc.template.use.useMutation({
    onSuccess: () => {
      toast.success("模板已应用")
      utils.template.list.invalidate()
    },
  })

  const rateMutation = trpc.template.rate.useMutation({
    onSuccess: () => {
      toast.success("评分已提交")
      utils.template.list.invalidate()
    },
  })

  const sourceTemplates =
    apiTemplates && apiTemplates.length > 0 ? apiTemplates : DEFAULT_TEMPLATES

  const filteredTemplates = sourceTemplates.filter((template) => {
    if (selectedDomain !== "all" && template.domain !== selectedDomain) {
      return false
    }

    if (
      search &&
      !template.title.toLowerCase().includes(search.toLowerCase()) &&
      !template.description?.toLowerCase().includes(search.toLowerCase())
    ) {
      return false
    }

    return true
  })

  const featuredTemplates = [...filteredTemplates]
    .sort(
      (left, right) =>
        (right.rating || 0) * (right.useCount || 0) -
        (left.rating || 0) * (left.useCount || 0),
    )
    .slice(0, 6)

  const handleUseTemplate = (id: number) => {
    useMutation.mutate({ id })
  }

  const handleRateTemplate = (id: number, score: number) => {
    rateMutation.mutate({ id, score })
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-14">
      <ScrollReveal>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 mb-1">
              模板市场
            </h1>
            <p className="text-sm text-slate-400">发现和分享高质量提示词模板</p>
          </div>
          {isAuthenticated && (
            <CreateTemplateDialog
              open={createOpen}
              draft={newTemplate}
              isPending={createMutation.isPending}
              onOpenChange={setCreateOpen}
              onDraftChange={setNewTemplate}
              onSubmit={() => createMutation.mutate(newTemplate)}
            />
          )}
        </div>
      </ScrollReveal>

      {isError && (
        <div className="mb-6 flex items-center gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">数据加载失败</p>
            <p className="text-xs text-amber-600">
              {error?.message || "服务器连接异常，显示默认模板"}
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs text-amber-700 hover:bg-amber-100"
            onClick={() => refetch()}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            重试
          </Button>
        </div>
      )}

      <ScrollReveal delay={100}>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="搜索模板..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white/80 backdrop-blur-sm border-slate-200/80 rounded-xl focus-visible:ring-apple-blue/30"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={selectedDomain === "all" ? "default" : "outline"}
              className="rounded-xl h-9 text-xs"
              onClick={() => setSelectedDomain("all")}
            >
              <Filter className="w-3.5 h-3.5 mr-1" />
              全部
            </Button>
            {Object.entries(DOMAIN_LABELS).map(([key, label]) => (
              <Button
                key={key}
                size="sm"
                variant={selectedDomain === key ? "default" : "outline"}
                className="rounded-xl h-9 text-xs hidden sm:inline-flex"
                onClick={() => setSelectedDomain(key)}
              >
                {label}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-1 border border-slate-200 rounded-xl p-0.5">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === "grid" ? "bg-slate-100 text-slate-700" : "text-slate-400"}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === "list" ? "bg-slate-100 text-slate-700" : "text-slate-400"}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </ScrollReveal>

      {/* Featured Section */}
      {featuredTemplates.length > 0 && !search && selectedDomain === "all" && (
        <ScrollReveal delay={150}>
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-apple-blue" />
              <h2 className="text-base font-semibold text-slate-800">精选模板</h2>
            </div>
            <div className={`${viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}`}>
                    <StaggerContainer>
                {featuredTemplates.map((template) => (
                  <StaggerItem key={template.id}>
                    <TiltCard maxTilt={4} scale={1.01}>
                      <TemplateMarketCard
                        template={template}
                        onUse={handleUseTemplate}
                        onRate={handleRateTemplate}
                      />
                    </TiltCard>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>
          </div>
        </ScrollReveal>
      )}

      {/* All Templates */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="bg-slate-100/80 backdrop-blur-sm rounded-xl p-1 mb-6">
          <TabsTrigger value="all" className="rounded-lg text-xs">全部模板</TabsTrigger>
          {isAuthenticated && (
            <TabsTrigger value="my" className="rounded-lg text-xs">我的模板</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="all">
          {isLoading ? (
            <div className={`${viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}`}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-2xl" />
              ))}
            </div>
          ) : filteredTemplates.length === 0 ? (
            <EmptyState
              icon={<Store className="w-10 h-10" />}
              title="没有找到模板"
              description="尝试调整搜索条件或筛选器"
              action={{ label: "清除筛选", onClick: () => { setSearch(""); setSelectedDomain("all") } }}
            />
          ) : (
            <div className={`${viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}`}>
              <StaggerContainer>
                {filteredTemplates.map((template) => (
                  <StaggerItem key={template.id}>
                    <TiltCard maxTilt={4} scale={1.01}>
                      <TemplateMarketCard
                        template={template}
                        onUse={handleUseTemplate}
                        onRate={handleRateTemplate}
                      />
                    </TiltCard>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>
          )}
        </TabsContent>

        {isAuthenticated && (
          <TabsContent value="my">
            {myTemplates && myTemplates.length > 0 ? (
              <div className={`${viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}`}>
                <StaggerContainer>
                  {myTemplates.map((template) => (
                    <StaggerItem key={template.id}>
                      <TiltCard maxTilt={4} scale={1.01}>
                        <TemplateMarketCard
                          template={template}
                          onUse={handleUseTemplate}
                          onRate={handleRateTemplate}
                        />
                      </TiltCard>
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              </div>
            ) : (
              <EmptyState
                icon={<Store className="w-10 h-10" />}
                title="还没有创建模板"
                description="创建你的第一个提示词模板"
                action={{ label: "创建模板", onClick: () => setCreateOpen(true) }}
              />
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
