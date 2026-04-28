import { useState } from "react";
import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { LifecycleBoard } from "@/components/lifecycle/LifecycleBoard";
import {
  FolderOpen, Search, Plus, ChevronRight, Sparkles, BarChart3,
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
  const createProject = trpc.project.create.useMutation({
    onSuccess: (p) => {
      toast.success("项目已创建");
      setSelectedId(p.id);
    },
    onError: (e) => toast.error(e.message),
  });

  const filtered = projects?.filter((p) =>
    !search || p.title.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const stats = {
    total: projects?.length || 0,
    completed: projects?.filter((p) => p.status === "completed").length || 0,
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-32 text-center">
        <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-slate-700 mb-2">请先登录</h2>
        <Button onClick={() => navigate("/login")} className="rounded-xl">去登录</Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">工作台</h1>
          <p className="text-sm text-slate-400 mt-1">管理项目和提示词开发生命周期</p>
        </div>
        <Button
          onClick={() => createProject.mutate({ title: "新项目", intent: "", domain: "general" })}
          className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl"
        >
          <Plus className="w-4 h-4 mr-2" />
          新项目
        </Button>
      </div>

      {/* Stats bar */}
      <Card className="mb-6 border-0 shadow-sm rounded-2xl bg-white/80">
        <CardContent className="p-4 flex items-center gap-6">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-violet-500" />
            <span className="text-sm text-slate-600">
              共 <strong>{stats.total}</strong> 个项目 · <strong>{stats.completed}</strong> 已完成
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Search + Project list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="搜索项目..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-xl"
            />
          </div>

          {isLoading ? (
            <Spinner className="mx-auto mt-8" />
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-400">还没有项目</p>
              <p className="text-xs text-slate-300 mt-1">从首页输入需求，AI 帮你创建第一个项目</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedId(p.id === selectedId ? null : p.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    selectedId === p.id
                      ? "border-violet-200 bg-violet-50"
                      : "border-slate-100 hover:border-slate-200 bg-white"
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
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Lifecycle Board or Detail */}
        <div className="lg:col-span-2">
          {selectedId ? (
            <LifecycleBoard projectId={selectedId} />
          ) : (
            <Card className="border-0 shadow-sm rounded-2xl bg-white/80">
              <CardContent className="p-8 text-center">
                <Sparkles className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-400">选择一个项目查看生命周期</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
