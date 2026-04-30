import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Users,
  Loader2,
  Play,
  CheckCircle2,
  Clock,
  Layers,
  GitBranch,
  ListOrdered,
  Sparkles,
} from "lucide-react";

const ROLE_COLORS: Record<string, string> = {
  planner: "bg-blue-50 text-blue-700 border-blue-200",
  executor: "bg-emerald-50 text-emerald-700 border-emerald-200",
  reviewer: "bg-amber-50 text-amber-700 border-amber-200",
  optimizer: "bg-violet-50 text-violet-700 border-violet-200",
  coordinator: "bg-rose-50 text-rose-700 border-rose-200",
};

const MODE_ICONS: Record<string, typeof Layers> = {
  sequential: ListOrdered,
  parallel: Layers,
  hierarchical: GitBranch,
};

export default function AgentSwarmPage() {
  const [description, setDescription] = useState("");
  const [mode, setMode] = useState<"sequential" | "parallel" | "hierarchical">("sequential");
  const [selectedRoles, setSelectedRoles] = useState<string[]>(["planner", "executor"]);

  const rolesQuery = trpc.swarm.roles.useQuery();
  const modesQuery = trpc.swarm.modes.useQuery();
  const runMutation = trpc.swarm.run.useMutation();

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  };

  const handleRun = () => {
    if (!description.trim() || selectedRoles.length === 0) return;
    runMutation.mutate({
      description: description.trim(),
      mode,
      roles: selectedRoles as any,
    });
  };

  const result = runMutation.data;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-5 h-5 text-cyan-500" />
          <h1 className="text-2xl font-semibold text-slate-900">Agent Swarm</h1>
        </div>
        <p className="text-sm text-slate-400">
          多智能体协作引擎，5 种角色 × 3 种协作模式
        </p>
      </div>

      {/* Config */}
      <Card className="mb-8 border-0 shadow-sm rounded-2xl bg-white/80">
        <CardContent className="p-5 space-y-5">
          {/* Description */}
          <Textarea
            placeholder="描述你的任务，例如：分析过去一个月的网站流量数据，找出增长趋势和异常点..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[100px] resize-none rounded-xl border-slate-200 focus:border-cyan-300 focus:ring-cyan-200"
          />

          {/* Mode */}
          <div>
            <label className="text-xs font-medium text-slate-500 mb-2 block">协作模式</label>
            <div className="flex gap-2">
              {(modesQuery.data ?? []).map((m) => {
                const Icon = MODE_ICONS[m.mode];
                const isActive = mode === m.mode;
                return (
                  <button
                    key={m.mode}
                    onClick={() => setMode(m.mode as typeof mode)}
                    className={`flex-1 flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-200 ${
                      isActive
                        ? "border-cyan-200 bg-cyan-50/50 ring-1 ring-cyan-100"
                        : "border-slate-100 bg-white hover:border-slate-200"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? "text-cyan-600" : "text-slate-400"}`} />
                    <span className={`text-xs font-medium ${isActive ? "text-cyan-700" : "text-slate-600"}`}>
                      {m.name}
                    </span>
                    <span className="text-[10px] text-slate-400 text-center leading-tight">
                      {m.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Roles */}
          <div>
            <label className="text-xs font-medium text-slate-500 mb-2 block">
              选择角色 ({selectedRoles.length}/5)
            </label>
            <div className="flex flex-wrap gap-2">
              {(rolesQuery.data ?? []).map((r) => {
                const checked = selectedRoles.includes(r.role);
                return (
                  <label
                    key={r.role}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-all duration-200 ${
                      checked
                        ? ROLE_COLORS[r.role]
                        : "border-slate-100 bg-white text-slate-500 hover:border-slate-200"
                    }`}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleRole(r.role)}
                      className="border-current"
                    />
                    <span className="text-xs font-medium">{r.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <Button
            onClick={handleRun}
            disabled={!description.trim() || selectedRoles.length === 0 || runMutation.isPending}
            className="rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white"
          >
            {runMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            运行 Swarm
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="border-0 shadow-sm rounded-2xl bg-white/80">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-50 flex items-center justify-center">
                  <Layers className="w-4 h-4 text-cyan-600" />
                </div>
                <div>
                  <div className="text-lg font-bold text-slate-800">{result.stats.totalTasks}</div>
                  <div className="text-[10px] text-slate-400">任务数</div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm rounded-2xl bg-white/80">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <div className="text-lg font-bold text-slate-800">{result.stats.completedTasks}</div>
                  <div className="text-[10px] text-slate-400">已完成</div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm rounded-2xl bg-white/80">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
                  <Users className="w-4 h-4 text-violet-600" />
                </div>
                <div>
                  <div className="text-lg font-bold text-slate-800">{result.agents.length}</div>
                  <div className="text-[10px] text-slate-400">代理数</div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm rounded-2xl bg-white/80">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <div className="text-lg font-bold text-slate-800">{result.stats.totalTimeMs}ms</div>
                  <div className="text-[10px] text-slate-400">总耗时</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Execution Log */}
          <Card className="border-0 shadow-sm rounded-2xl bg-white/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-800">执行日志</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="p-3 rounded-xl bg-slate-50 font-mono text-xs text-slate-600 space-y-1 max-h-[240px] overflow-y-auto">
                {result.executionLog.map((log, i) => (
                  <div key={i}>{log}</div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Task Results */}
          <div className="space-y-3">
            {result.tasks.map((task) => {
              const agent = result.agents.find((a) => a.role === task.assignedTo);
              const colorClass = ROLE_COLORS[task.assignedTo] || "bg-slate-50 text-slate-700";

              return (
                <Card key={task.id} className="border-0 shadow-sm rounded-2xl bg-white/80">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant="outline" className={`text-[10px] ${colorClass}`}>
                        {agent?.name || task.assignedTo}
                      </Badge>
                      {task.completedAt && task.startedAt && (
                        <span className="text-[10px] text-slate-400">
                          {task.completedAt - task.startedAt}ms
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mb-1">{task.description}</p>
                    {task.output && (
                      <div className="p-3 rounded-xl bg-slate-50">
                        <pre className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
                          {task.output}
                        </pre>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Final Output */}
          <Card className="border-0 shadow-sm rounded-2xl bg-gradient-to-r from-cyan-50/80 to-white ring-1 ring-cyan-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-600" />
                最终输出
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <pre className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
                {result.finalOutput}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
