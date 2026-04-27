import { useState } from "react"
import {
  AlertCircle,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  Store,
  TrendingUp,
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
  type TemplateItem,
} from "@/components/template-market/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/hooks/useAuth"
import { trpc } from "@/providers/trpc"

export default function TemplateMarket() {
  const { isAuthenticated } = useAuth()
  const [search, setSearch] = useState("")
  const [selectedDomain, setSelectedDomain] = useState("all")
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

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="搜索模板..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-10 bg-white border-slate-100 rounded-xl focus-visible:ring-violet-200"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          {[
            { key: "all", label: "全部" },
            ...Object.entries(DOMAIN_LABELS).map(([key, label]) => ({
              key,
              label,
            })),
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSelectedDomain(key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${selectedDomain === key ? "bg-violet-100 text-violet-700" : "bg-white border border-slate-100 text-slate-500 hover:border-slate-200"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <Tabs defaultValue="all">
        <TabsList className="mb-8 bg-slate-50 border border-slate-100 rounded-xl p-1">
          <TabsTrigger
            value="all"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-sm"
          >
            全部模板
          </TabsTrigger>
          <TabsTrigger
            value="featured"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-sm"
          >
            <TrendingUp className="w-3.5 h-3.5 mr-1" />
            精选
          </TabsTrigger>
          {isAuthenticated && (
            <TabsTrigger
              value="my"
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-sm"
            >
              我的模板
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="all">
          {isLoading && !isError ? (
            <div className="flex flex-col items-center justify-center py-32">
              <Loader2 className="w-8 h-8 animate-spin text-violet-400 mb-4" />
              <p className="text-sm text-slate-400">加载模板中...</p>
            </div>
          ) : filteredTemplates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTemplates.map((template) => (
                <TemplateMarketCard
                  key={template.id}
                  template={template}
                  onRate={handleRateTemplate}
                  onUse={handleUseTemplate}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-32">
              <Store className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-400">暂无模板</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="featured">
          {featuredTemplates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {featuredTemplates.map((template) => (
                <TemplateMarketCard
                  key={`f-${template.id}`}
                  template={template}
                  onRate={handleRateTemplate}
                  onUse={handleUseTemplate}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-32 text-slate-400">
              暂无精选模板
            </div>
          )}
        </TabsContent>

        <TabsContent value="my">
          {myTemplates && myTemplates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(myTemplates as TemplateItem[]).map((template) => (
                <TemplateMarketCard
                  key={template.id}
                  template={template}
                  showActions={false}
                  onRate={handleRateTemplate}
                  onUse={handleUseTemplate}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-32">
              <p className="text-slate-400 mb-2">你还没有创建模板</p>
              <p className="text-sm text-slate-400">
                点击右上角创建你的第一个模板
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
