import { useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import { TiltCard } from "@/components/effects/TiltCard";
import { StaggerContainer, StaggerItem } from "@/components/effects/StaggerContainer";
import { ScrollReveal } from "@/components/effects/ScrollReveal";
import { RippleButton } from "@/components/ui/RippleButton";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import {
  FolderOpen, Search, Plus, ChevronRight, Sparkles,
  FolderCheck, Clock, TrendingUp, LayoutGrid, List
} from "lucide-react";

const DOMAIN_COLORS: Record<string, string> = {
  general: "bg-slate-100 text-slate-600",
  marketing: "bg-violet-100 text-violet-700",
  technical: "bg-blue-100 text-blue-700",
  education: "bg-emerald-100 text-emerald-700",
  creative: "bg-amber-100 text-amber-700",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  ready: "bg-emerald-50 text-emerald-600",
  executing: "bg-blue-50 text-blue-600",
  completed: "bg-violet-50 text-violet-600",
  archived: "bg-gray-50 text-gray-400",
};

/**
 * Workspace — 工作台两栏布局
 * 左：项目列表 + 统计卡片
 * 右：选中项目的生命周期概览（或全局统计）
 */
export default function WorkspacePage() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");

  const domainLabel = (key: string) => t(`projects.domain.${key.replace(/-/g, "")}` as unknown as TemplateStringsArray) || key
  const statusLabel = (key: string) => t(`projects.status.${key}` as unknown as TemplateStringsArray) || key

  const { data: projects, isLoading } = trpc.project.list.useQuery(undefined, { enabled: isAuthenticated });
  const utils = trpc.useUtils()
  const createProject = trpc.project.create.useMutation({
    onSuccess: (p) => {
      utils.project.list.invalidate()
      toast.success("项目已创建")
      setSelectedId(p.id)
    },
    onError: (e: { message?: string }) => toast.error(e.message || "创建失败"),
  });

  const selectedProject = projects?.find((p) => p.id === selectedId);

  const filtered = projects?.filter((p) =>
    !search || p.title.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const stats = {
    total: projects?.length || 0,
    completed: projects?.filter((p) => p.status === "completed").length || 0,
    inProgress: projects?.filter((p) => p.status === "executing").length || 0,
    ready: projects?.filter((p) => p.status === "ready").length || 0,
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <ScrollReveal>
        <div className="shrink-0 px-6 py-4 border-b border-slate-100/80 flex items-center justify-between bg-white/70 backdrop-blur-xl">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">工作台</h1>
            <p className="text-xs text-slate-400">管理和追踪所有提示词项目</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 border border-slate-200 rounded-xl p-0.5 mr-2">
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
            <RippleButton
              onClick={() => {
                if (!isAuthenticated) { toast.error("请先登录"); navigate("/login"); return; }
                createProject.mutate({ title: "新项目", description: "", intent: "general" });
              }}
              className="bg-gradient-to-r from-apple-blue to-apple-purple text-white rounded-xl px-4 py-2 text-sm font-medium shadow-md"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              新建项目
            </RippleButton>
          </div>
        </div>
      </ScrollReveal>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel — Stats + List */}
        <div className={`flex-1 flex flex-col min-w-0 overflow-y-auto ${selectedId ? "hidden lg:flex" : ""}`}>
          {/* Stats */}
          <ScrollReveal delay={50}>
            <div className="px-6 py-4">
              <StaggerContainer className={`grid gap-3 ${viewMode === "grid" ? "grid-cols-2" : "grid-cols-4"}`}>
                <StaggerItem>
                  <TiltCard maxTilt={4} scale={1.02}>
                    <Card className="border-0 shadow-sm rounded-2xl bg-white/80 backdrop-blur-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                            <FolderOpen className="w-4.5 h-4.5 text-apple-blue" />
                          </div>
                          <div>
                            <p className="text-xl font-bold text-slate-800">
                              <AnimatedCounter value={stats.total} duration={600} />
                            </p>
                            <p className="text-[11px] text-slate-400">总项目</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TiltCard>
                </StaggerItem>

                <StaggerItem>
                  <TiltCard maxTilt={4} scale={1.02}>
                    <Card className="border-0 shadow-sm rounded-2xl bg-white/80 backdrop-blur-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                            <FolderCheck className="w-4.5 h-4.5 text-emerald-500" />
                          </div>
                          <div>
                            <p className="text-xl font-bold text-slate-800">
                              <AnimatedCounter value={stats.completed} duration={600} />
                            </p>
                            <p className="text-[11px] text-slate-400">已完成</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TiltCard>
                </StaggerItem>

                <StaggerItem>
                  <TiltCard maxTilt={4} scale={1.02}>
                    <Card className="border-0 shadow-sm rounded-2xl bg-white/80 backdrop-blur-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                            <Clock className="w-4.5 h-4.5 text-amber-500" />
                          </div>
                          <div>
                            <p className="text-xl font-bold text-slate-800">
                              <AnimatedCounter value={stats.inProgress} duration={600} />
                            </p>
                            <p className="text-[11px] text-slate-400">进行中</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TiltCard>
                </StaggerItem>

                <StaggerItem>
                  <TiltCard maxTilt={4} scale={1.02}>
                    <Card className="border-0 shadow-sm rounded-2xl bg-white/80 backdrop-blur-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
                            <TrendingUp className="w-4.5 h-4.5 text-violet-500" />
                          </div>
                          <div>
                            <p className="text-xl font-bold text-slate-800">
                              <AnimatedCounter value={stats.ready} duration={600} />
                            </p>
                            <p className="text-[11px] text-slate-400">就绪</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TiltCard>
                </StaggerItem>
              </StaggerContainer>
            </div>
          </ScrollReveal>

          {/* Search */}
          <div className="px-6 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="搜索项目..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-white/80 backdrop-blur-sm border-slate-200/80 rounded-xl focus-visible:ring-apple-blue/30"
              />
            </div>
          </div>

          {/* Project List */}
          <div className="flex-1 px-6 pb-6 overflow-y-auto">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-20 rounded-2xl bg-slate-100 animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={<FolderOpen className="w-10 h-10" />}
                title="还没有项目"
                description="创建你的第一个提示词项目"
                action={{
                  label: "新建项目",
                  onClick: () => createProject.mutate({ title: "新项目", description: "", intent: "general" }),
                }}
              />
            ) : (
              <StaggerContainer className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 gap-3" : "space-y-2"}>
                {filtered.map((project) => (
                  <StaggerItem key={project.id}>
                    <motion.div
                      whileHover={{ scale: 1.01, x: 2 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setSelectedId(project.id)}
                      className={`p-4 rounded-2xl cursor-pointer transition-all ${
                        selectedId === project.id
                          ? "bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 shadow-sm"
                          : "bg-white/80 backdrop-blur-sm border border-slate-100 hover:border-slate-200"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-slate-800 text-sm truncate">{project.title}</h3>
                            <Badge variant="outline" className={`text-[10px] rounded-md ${STATUS_COLORS[project.status || "draft"] || ""}`}>
                              {statusLabel(project.status || "draft")}
                            </Badge>
                          </div>
                          {project.description && (
                            <p className="text-xs text-slate-400 truncate">{project.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {project.updatedAt ? new Date(project.updatedAt).toLocaleDateString("zh-CN") : ""}
                            </span>
                            {project.domain && (
                              <Badge variant="outline" className={`text-[10px] ${DOMAIN_COLORS[project.domain] || ""}`}>
                                {project.domain}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <ChevronRight className={`w-4 h-4 shrink-0 mt-1 ${selectedId === project.id ? "text-apple-blue" : "text-slate-300"}`} />
                      </div>
                    </motion.div>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            )}
          </div>
        </div>

        {/* Right Panel — Detail / Overview */}
        <AnimatePresence>
          {selectedId && selectedProject && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 360, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="hidden lg:block shrink-0 border-l border-slate-100/80 bg-white/50 backdrop-blur-sm overflow-y-auto"
            >
              <div className="w-[360px] p-5 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800">项目概览</h3>
                  <button
                    onClick={() => setSelectedId(null)}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    关闭
                  </button>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-slate-800 text-sm">{selectedProject.title}</h4>
                  {selectedProject.description && (
                    <p className="text-xs text-slate-500">{selectedProject.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className={`text-xs ${STATUS_COLORS[selectedProject.status || "draft"] || ""}`}>
                      {statusLabel(selectedProject.status || "draft")}
                    </Badge>
                    {selectedProject.domain && (
                      <Badge variant="outline" className={`text-xs ${DOMAIN_COLORS[selectedProject.domain || "general"] || ""}`}>
                        {domainLabel(selectedProject.domain || "general")}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <Button
                    className="w-full rounded-xl bg-gradient-to-r from-apple-blue to-apple-purple text-white"
                    onClick={() => navigate(`/projects/${selectedProject.id}`)}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    进入项目详情
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full rounded-xl"
                    onClick={() => setSelectedId(null)}
                  >
                    返回列表
                  </Button>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <p className="text-xs text-slate-400 mb-2">生命周期阶段</p>
                  <div className="space-y-2">
                    {["draft", "ready", "executing", "completed"].map((stage) => (
                      <div
                        key={stage}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
                          selectedProject.status === stage
                            ? "bg-blue-50 text-apple-blue font-medium"
                            : "text-slate-400"
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full ${
                          selectedProject.status === stage ? "bg-apple-blue" : "bg-slate-200"
                        }`} />
                        {statusLabel(stage)}
                        {selectedProject.status === stage && (
                          <span className="ml-auto text-[10px]">当前</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
