import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { TreeCanvas } from "@/components/tot/TreeCanvas";
import {
  Search,
  Loader2,
  GitBranch,
  Target,
  Clock,
  Layers,
  Sparkles,
  ArrowRight,
} from "lucide-react";

export default function TreeOfThoughtsPage() {
  const [problem, setProblem] = useState("");
  const [strategy, setStrategy] = useState<"bfs" | "dfs">("bfs");
  const [breadth, setBreadth] = useState([3]);
  const [maxDepth, setMaxDepth] = useState([4]);

  const solveMutation = trpc.tot.solve.useMutation();

  const handleSolve = () => {
    if (!problem.trim()) return;
    solveMutation.mutate({
      problem: problem.trim(),
      strategy,
      breadth: breadth[0],
      maxDepth: maxDepth[0],
    });
  };

  const result = solveMutation.data;
  const isLoading = solveMutation.isPending;
  const error = solveMutation.error;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <GitBranch className="w-5 h-5 text-violet-500" />
          <h1 className="text-2xl font-semibold text-slate-900">Tree of Thoughts</h1>
        </div>
        <p className="text-sm text-slate-400">
          让 AI 以树形结构探索多条推理路径，找到最优解
        </p>
      </div>

      {/* Input + Config */}
      <Card className="mb-8 border-0 shadow-sm rounded-2xl bg-white/80">
        <CardContent className="p-5 space-y-5">
          <Textarea
            placeholder="输入一个问题，例如：如何在 O(n) 时间复杂度内找到数组中第 k 大的元素？"
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            className="min-h-[80px] resize-none rounded-xl border-slate-200 focus:border-violet-300 focus:ring-violet-200"
          />

          {/* Config */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Strategy */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-2 block">
                搜索策略
              </label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={strategy === "bfs" ? "default" : "outline"}
                  onClick={() => setStrategy("bfs")}
                  className={`rounded-lg text-xs flex-1 ${strategy === "bfs" ? "bg-violet-600 hover:bg-violet-700" : ""}`}
                >
                  BFS
                </Button>
                <Button
                  size="sm"
                  variant={strategy === "dfs" ? "default" : "outline"}
                  onClick={() => setStrategy("dfs")}
                  className={`rounded-lg text-xs flex-1 ${strategy === "dfs" ? "bg-violet-600 hover:bg-violet-700" : ""}`}
                >
                  DFS
                </Button>
              </div>
            </div>

            {/* Breadth */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-2 block">
                分支数: {breadth[0]}
              </label>
              <Slider
                value={breadth}
                onValueChange={setBreadth}
                min={2}
                max={5}
                step={1}
                className="py-2"
              />
            </div>

            {/* Max Depth */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-2 block">
                最大深度: {maxDepth[0]}
              </label>
              <Slider
                value={maxDepth}
                onValueChange={setMaxDepth}
                min={2}
                max={6}
                step={1}
                className="py-2"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {problem.length}/2000 字符
            </span>
            <Button
              onClick={handleSolve}
              disabled={!problem.trim() || isLoading}
              className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              开始推理
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
          推理失败：{error.message}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="border-0 shadow-sm rounded-2xl bg-white/80">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
                  <Layers className="w-4 h-4 text-violet-600" />
                </div>
                <div>
                  <div className="text-lg font-bold text-slate-800">{result.stats.totalNodes}</div>
                  <div className="text-[10px] text-slate-400">总节点</div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm rounded-2xl bg-white/80">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Target className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <div className="text-lg font-bold text-slate-800">{result.stats.maxDepth}</div>
                  <div className="text-[10px] text-slate-400">最大深度</div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm rounded-2xl bg-white/80">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <div className="text-lg font-bold text-slate-800">{result.stats.evaluatedNodes}</div>
                  <div className="text-[10px] text-slate-400">已评估</div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm rounded-2xl bg-white/80">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <div className="text-lg font-bold text-slate-800">{result.stats.elapsedMs}ms</div>
                  <div className="text-[10px] text-slate-400">耗时</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tree Visualization */}
          <Card className="border-0 shadow-sm rounded-2xl bg-white/80">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-slate-800">
                  推理树可视化
                </CardTitle>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-violet-500 rounded" />
                    <span className="text-[10px] text-slate-400">最优路径</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-slate-300 rounded dash-border" />
                    <span className="text-[10px] text-slate-400">探索路径</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <TreeCanvas
                tree={result.tree}
                rootId={result.rootId}
                bestPath={result.bestPath.map((n) => n.id)}
              />
            </CardContent>
          </Card>

          {/* Best Path */}
          <Card className="border-0 shadow-sm rounded-2xl bg-gradient-to-r from-violet-50/80 to-white ring-1 ring-violet-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Target className="w-4 h-4 text-violet-600" />
                最优推理路径
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap items-center gap-2">
                {result.bestPath.map((node, idx) => (
                  <div key={node.id} className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="text-xs py-1.5 px-2.5 border-violet-200 bg-white"
                    >
                      <span className="text-violet-600 font-bold mr-1.5">{idx + 1}</span>
                      <span className="text-slate-700">{node.content}</span>
                      {node.value !== null && (
                        <span className="ml-1.5 text-[10px] text-slate-400">
                          ({node.value}分)
                        </span>
                      )}
                    </Badge>
                    {idx < result.bestPath.length - 1 && (
                      <ArrowRight className="w-3.5 h-3.5 text-violet-300" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
