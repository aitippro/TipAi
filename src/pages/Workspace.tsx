import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { LifecycleBoard } from "@/components/lifecycle/LifecycleBoard";
import { EmptyState } from "@/components/EmptyState";
import { TiltCard } from "@/components/effects/TiltCard";
import { StaggerContainer, StaggerItem } from "@/components/effects/StaggerContainer";
import { ScrollReveal } from "@/components/effects/ScrollReveal";
import { RippleButton } from "@/components/ui/RippleButton";
import {
  FolderOpen, Search, Plus, ChevronRight, Sparkles,
  FolderCheck, Clock, TrendingUp
} from "lucide-react";

const DOMAIN_COLORS: Record<string, string> = {
  general: "bg-slate-100 text-slate-600",
  marketing: "bg-violet-100 text-violet-700",
  technical: "bg-blue-100 text-blue-700",
  education: "bg-emerald-100 text-emerald-700",
  creative: "bg-amber-100 text-amber-700",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "草稿", ready: "就绪", executing: "执行中", completed: "已完成", archived: "已归档",
};

export default function WorkspacePage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data: projects, isLoading } = trpc.project.list.useQuery(undefined, { enabled: isAuthenticated });
  const utils = trpc.useUtils()
  const createProject = trpc.project.create.useMutation({
    onSuccess: (p) => {
      utils.project.list.invalidate()
      toast.success("项目已创建")
      setSelectedId(p.id)
    },
    onError: (e) => toast.error(e.message),
  });

  const filtered = projects?.filter((p) =>
    !search || p.title.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const stats = {
    total: projects?.length || 0,
    completed: projects?.filter((p) => p.status === "completed").length || 0,
    inProgress: projects?.filter((p) => p.status === "executing").length || 0,
    ready: projects?.filter((p) => p.status === "ready").length || 0,
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-32">
        <EmptyState
          icon={<FolderOpen className="w-10 h-10" />}
          title="请先登录"
          description="登录后即可管理工作台项目"
          action={{ label: "去登录", onClick: () => navigate("/login") }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <ScrollReveal>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">工作台</h1>
            <p className="text-sm text-slate-400 mt-1">管理项目和提示词开发生命周期</p>
          </div>
          <RippleButton variant="primary" size="md" onClick={() => createProject.mutate({ title: "新项目", intent: "", domain: "general" })}>
            <Plus className="w-4 h-4 mr-2" />
            新项目
          </RippleButton>
        </div>
      </ScrollReveal>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: "总项目", value: stats.total, icon: FolderOpen, color: "text-violet-500", bg: "from-violet-500/10 to-purple-500/10" },
          { label: "已完成", value: stats.completed, icon: FolderCheck, color: "text-emerald-500", bg: "from-emerald-500/10 to-teal-500/10" },
          { label: "进行中", value: stats.inProgress, icon: Clock, color: "text-blue-500", bg: "from-blue-500/10 to-cyan-500/10" },
          { label: "就绪", value: stats.ready, icon: TrendingUp, color: "text-amber-500", bg: "from-amber-500/10 to-orange-500/10" },
        ].map((stat) => (
          <TiltCard key={stat.label} maxTilt={6} scale={1.02}>
            <Card className={`border-0 shadow-sm rounded-2xl bg-gradient-to-br ${stat.bg} backdrop-blur-sm`}>
              <CardContent className="p-4 flex items-center gap-3">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                <div>
                  <div className="text-2xl font-bold text-slate-800">{stat.value}</div>
                  <div className="text-xs text-slate-500">{stat.label}</div>
                </div>
              </CardContent>
            </Card>
          </TiltCard>
        ))}
      </div>

      {/* Search + Project list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="搜索项目..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-xl bg-white/80 backdrop-blur-sm border-slate-200/80 focus-visible:ring-apple-blue/30"
            />
          </div>

          {isLoading ? (
            <Spinner className="mx-auto mt-8" />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<FolderOpen className="w-10 h-10" />}
              title="还没有项目"
              description="从首页输入需求，AI 帮你创建第一个项目"
              action={{ label: "去创建", onClick: () => navigate("/") }}
            />
          ) : (
            <StaggerContainer className="space-y-2">
              {filtered.map((p) => (
                <StaggerItem key={p.id}>
                  <motion.button
                    whileHover={{ scale: 1.01, x: 2 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setSelectedId(p.id === selectedId ? null : p.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      selectedId === p.id
                        ? "border-violet-200 bg-violet-50 shadow-sm"
                        : "border-slate-100 hover:border-slate-200 hover:shadow-sm bg-white/80 backdrop-blur-sm"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-800 truncate">{p.title}</p>
                      <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${selectedId === p.id ? "rotate-90" : ""}`} />
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant="outline" className={`text-[10px] px-1.5 ${DOMAIN_COLORS[p.domain] || DOMAIN_COLORS.general}`}>
                        {p.domain}
                      </Badge>
                      <span className="text-[10px] text-slate-400">{STATUS_LABELS[p.status] || p.status}</span>
                    </div>
                  </motion.button>
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}
        </div>

        {/* Right: Lifecycle Board or Detail */}
        <div className="lg:col-span-2">
          <ScrollReveal delay={100}>
            {selectedId ? (
              <LifecycleBoard projectId={selectedId} />
            ) : (
              <Card className="border-0 shadow-sm rounded-2xl bg-white/80 backdrop-blur-sm">
                <CardContent className="p-8 text-center">
                  <Sparkles className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm text-slate-400">选择一个项目查看生命周期</p>
                </CardContent>
              </Card>
            )}
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
}
