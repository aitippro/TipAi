import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Search,
  Loader2,
  Sparkles,
  Layers,
  ArrowUpRight,
  GitCompare,
  Target,
  BrainCircuit,
  Network,
} from "lucide-react";
import { FrameworkGraphCanvas } from "@/components/framework/FrameworkGraphCanvas";

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : score >= 60
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-slate-50 text-slate-600 border-slate-200";
  return (
    <Badge variant="outline" className={`${color} font-semibold`}>
      {score} 分
    </Badge>
  );
}

function ComplexityBadge({ complexity }: { complexity: string }) {
  const map: Record<string, string> = {
    simple: "简单",
    medium: "中等",
    complex: "复杂",
  };
  const color =
    complexity === "simple"
      ? "bg-green-50 text-green-700"
      : complexity === "medium"
        ? "bg-blue-50 text-blue-700"
        : "bg-purple-50 text-purple-700";
  return (
    <Badge className={`${color} text-[10px]`}>{map[complexity] ?? complexity}</Badge>
  );
}

export default function FrameworkMatchPage() {
  const [intent, setIntent] = useState("");
  const [submittedIntent, setSubmittedIntent] = useState("");

  const matchQuery = trpc.framework.match.useQuery(
    { intent: submittedIntent },
    { enabled: !!submittedIntent }
  );

  const graphQuery = trpc.framework.graph.useQuery();

  const handleMatch = () => {
    if (!intent.trim()) return;
    setSubmittedIntent(intent.trim());
  };

  const result = matchQuery.data;
  const isLoading = matchQuery.isLoading;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <BrainCircuit className="w-5 h-5 text-violet-500" />
          <h1 className="text-2xl font-semibold text-slate-900">智能框架匹配</h1>
        </div>
        <p className="text-sm text-slate-400">
          输入你的任务意图，AI 将从 20 个提示词框架中为你推荐最合适的方案
        </p>
      </div>

      {/* Input */}
      <Card className="mb-8 border-0 shadow-sm rounded-2xl bg-white/80">
        <CardContent className="p-5">
          <Textarea
            placeholder="描述你的任务意图，例如：帮我写一个 Python 爬虫程序，需要从豆瓣电影抓取 top250 列表..."
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            className="min-h-[100px] resize-none rounded-xl border-slate-200 focus:border-violet-300 focus:ring-violet-200"
          />
          <div className="flex items-center justify-between mt-4">
            <span className="text-xs text-slate-400">
              {intent.length}/2000 字符
            </span>
            <Button
              onClick={handleMatch}
              disabled={!intent.trim() || isLoading}
              className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              匹配框架
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Tabs defaultValue="recommendations" className="space-y-6">
          <TabsList className="rounded-xl bg-white/80 border border-slate-100">
            <TabsTrigger value="recommendations" className="rounded-lg text-xs">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              推荐框架
            </TabsTrigger>
            <TabsTrigger value="combinations" className="rounded-lg text-xs">
              <Layers className="w-3.5 h-3.5 mr-1.5" />
              组合推荐
            </TabsTrigger>
            <TabsTrigger value="analysis" className="rounded-lg text-xs">
              <Target className="w-3.5 h-3.5 mr-1.5" />
              意图分析
            </TabsTrigger>
            <TabsTrigger value="graph" className="rounded-lg text-xs">
              <Network className="w-3.5 h-3.5 mr-1.5" />
              知识图谱
            </TabsTrigger>
          </TabsList>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations" className="space-y-4">
            {result.recommendations.length === 0 && (
              <div className="text-center py-12 text-slate-400 text-sm">
                未找到匹配的框架，请尝试更详细地描述你的任务
              </div>
            )}

            {result.recommendations.map((rec, idx) => (
              <Card
                key={rec.framework}
                className={`border-0 shadow-sm rounded-2xl transition-all duration-200 ${
                  idx === 0
                    ? "bg-gradient-to-r from-violet-50/80 to-white ring-1 ring-violet-100"
                    : "bg-white/80"
                }`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
                          idx === 0
                            ? "bg-violet-100 text-violet-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {idx + 1}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800">
                          {rec.frameworkName}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <code className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
                            {rec.framework}
                          </code>
                          {rec.matchDimensions.map((dim) => (
                            <Badge
                              key={dim}
                              variant="outline"
                              className="text-[10px] text-slate-500 border-slate-200"
                            >
                              {dim}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <ScoreBadge score={rec.score} />
                  </div>

                  <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                    {rec.reason}
                  </p>

                  {/* Alternatives */}
                  {rec.alternatives.length > 0 && (
                    <div className="mb-3">
                      <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                        相似备选
                      </span>
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        {rec.alternatives.map((alt) => (
                          <Badge
                            key={alt.key}
                            variant="outline"
                            className="text-[11px] cursor-pointer hover:bg-slate-50"
                          >
                            <GitCompare className="w-3 h-3 mr-1" />
                            {alt.name}
                            <span className="ml-1 text-slate-400">
                              {Math.round(alt.similarity * 100)}%
                            </span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Upgrade */}
                  {rec.upgradeTo && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                      <span>可升级至</span>
                      <Badge
                        variant="outline"
                        className="text-[11px] border-emerald-200 text-emerald-700 bg-emerald-50"
                      >
                        {rec.upgradeTo.name}
                      </Badge>
                      <span className="text-slate-400">{rec.upgradeTo.reason}</span>
                    </div>
                  )}

                  {/* Complements */}
                  {rec.complements.length > 0 && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                      <Layers className="w-3.5 h-3.5 text-blue-500" />
                      <span>可组合</span>
                      <div className="flex gap-1.5">
                        {rec.complements.map((c) => (
                          <Badge
                            key={c.key}
                            variant="outline"
                            className="text-[11px] border-blue-200 text-blue-700 bg-blue-50"
                          >
                            {c.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Combinations Tab */}
          <TabsContent value="combinations" className="space-y-4">
            {result.combinations.length === 0 && (
              <div className="text-center py-12 text-slate-400 text-sm">
                当前意图复杂度较低，单框架即可满足需求
              </div>
            )}
            {result.combinations.map((combo, idx) => (
              <Card
                key={idx}
                className="border-0 shadow-sm rounded-2xl bg-gradient-to-r from-indigo-50/60 to-white ring-1 ring-indigo-100"
              >
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                      <Layers className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">
                        {combo.primary.name} + {combo.secondary.name}
                      </h3>
                      <p className="text-xs text-slate-400">{combo.useCase}</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {combo.reason}
                  </p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Graph Tab */}
          <TabsContent value="graph" className="space-y-4">
            {graphQuery.data ? (
              <>
                <FrameworkGraphCanvas data={graphQuery.data} />
                <p className="text-xs text-slate-400 text-center">
                  基于 20 个提示词框架的知识图谱 · 节点大小代表组件数量 · 悬停查看详情
                </p>
              </>
            ) : (
              <div className="flex items-center justify-center h-[480px] rounded-2xl bg-slate-50/50 border border-slate-100">
                <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
              </div>
            )}
          </TabsContent>

          {/* Analysis Tab */}
          <TabsContent value="analysis" className="space-y-4">
            <Card className="border-0 shadow-sm rounded-2xl bg-white/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-800">
                  意图分类
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                      领域
                    </span>
                    <p className="text-sm font-medium text-slate-700 mt-0.5">
                      {result.classification.domain}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                      子领域
                    </span>
                    <p className="text-sm font-medium text-slate-700 mt-0.5">
                      {result.classification.subDomain}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                      任务类型
                    </span>
                    <p className="text-sm font-medium text-slate-700 mt-0.5">
                      {result.classification.taskType}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                      置信度
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <Progress
                        value={result.classification.confidence * 100}
                        className="h-1.5 flex-1"
                      />
                      <span className="text-xs text-slate-500">
                        {Math.round(result.classification.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                </div>

                {result.classification.matchedKeywords.length > 0 && (
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                      匹配关键词
                    </span>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {result.classification.matchedKeywords.map((kw) => (
                        <Badge
                          key={kw}
                          variant="secondary"
                          className="text-[11px]"
                        >
                          {kw}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm rounded-2xl bg-white/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-800">
                  知识图谱统计
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 text-center">
                    <span className="text-2xl font-bold text-violet-600">
                      {result.graphStats.totalFrameworks}
                    </span>
                    <p className="text-xs text-slate-400 mt-0.5">框架数量</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 text-center">
                    <span className="text-2xl font-bold text-indigo-600">
                      {result.graphStats.totalRelations}
                    </span>
                    <p className="text-xs text-slate-400 mt-0.5">关系数量</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
