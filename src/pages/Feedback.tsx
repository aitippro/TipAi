import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Star,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  MessageSquare,
  Sparkles,
  History,
  BarChart3,
} from "lucide-react";

const DIMENSIONS = [
  { key: "clarity", label: "清晰度", desc: "提示词是否清晰易懂" },
  { key: "relevance", label: "相关性", desc: "输出是否与任务高度相关" },
  { key: "completeness", label: "完整性", desc: "是否包含所有必要信息" },
  { key: "actionability", label: "可操作性", desc: "输出是否可直接执行" },
  { key: "overall", label: "总体", desc: "整体满意度" },
] as const;

export default function FeedbackPage() {
  const { isAuthenticated } = useAuth();
  const [scores, setScores] = useState<Record<string, number[]>>({
    clarity: [7],
    relevance: [7],
    completeness: [7],
    actionability: [7],
    overall: [7],
  });
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const statsQuery = trpc.feedback.stats.useQuery({});
  const historyQuery = trpc.feedback.history.useQuery({ limit: 20 });
  const submitMutation = trpc.feedback.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      statsQuery.refetch();
      historyQuery.refetch();
    },
  });

  const handleSubmit = () => {
    if (!isAuthenticated) return;
    submitMutation.mutate({
      projectId: 1, // demo project
      scores: {
        clarity: scores.clarity[0],
        relevance: scores.relevance[0],
        completeness: scores.completeness[0],
        actionability: scores.actionability[0],
        overall: scores.overall[0],
      },
      comment: comment || undefined,
    });
  };

  const stats = statsQuery.data;

  if (!isAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-slate-700 mb-2">需要登录</h2>
        <p className="text-sm text-slate-400">请先登录后再使用反馈闭环功能</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="w-5 h-5 text-indigo-500" />
          <h1 className="text-2xl font-semibold text-slate-900">反馈闭环</h1>
        </div>
        <p className="text-sm text-slate-400">
          5 维度评分收集 → 统计分析 → 数据驱动进化
        </p>
      </div>

      {/* Stats */}
      {stats && stats.totalCount > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="border-0 shadow-sm rounded-2xl bg-white/80">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-slate-800">{stats.totalCount}</div>
              <div className="text-xs text-slate-400">反馈次数</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm rounded-2xl bg-white/80">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-slate-800">
                {stats.avgScores.overall ?? "-"}
              </div>
              <div className="text-xs text-slate-400">总体均分</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm rounded-2xl bg-white/80">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-slate-800">
                {stats.topIssues.length}
              </div>
              <div className="text-xs text-slate-400">待改进项</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Submit Feedback */}
      <Card className="mb-8 border-0 shadow-sm rounded-2xl bg-white/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500" />
            提交反馈
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-5">
          {DIMENSIONS.map((dim) => (
            <div key={dim.key}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-sm font-medium text-slate-700">{dim.label}</span>
                  <span className="text-xs text-slate-400 ml-2">{dim.desc}</span>
                </div>
                <span className="text-sm font-bold text-slate-700 w-6 text-right">
                  {scores[dim.key][0]}
                </span>
              </div>
              <Slider
                value={scores[dim.key]}
                onValueChange={(v) => setScores((s) => ({ ...s, [dim.key]: v }))}
                min={1}
                max={10}
                step={1}
              />
            </div>
          ))}

          <Textarea
            placeholder="补充评论（可选）..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="min-h-[80px] resize-none rounded-xl border-slate-200"
          />

          <Button
            onClick={handleSubmit}
            disabled={submitMutation.isPending || submitted}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {submitMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : submitted ? (
              <Star className="w-4 h-4 mr-2" />
            ) : (
              <MessageSquare className="w-4 h-4 mr-2" />
            )}
            {submitted ? "已提交" : "提交反馈"}
          </Button>
        </CardContent>
      </Card>

      {/* Dimension Stats */}
      {stats && stats.totalCount > 0 && (
        <Card className="mb-8 border-0 shadow-sm rounded-2xl bg-white/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-500" />
              维度分析
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            {DIMENSIONS.map((dim) => {
              const avg = stats.avgScores[dim.key as keyof typeof stats.avgScores];
              const trend = stats.trends[dim.key as keyof typeof stats.trends];
              if (avg === null) return null;

              return (
                <div key={dim.key} className="flex items-center gap-4">
                  <span className="text-sm text-slate-600 w-20">{dim.label}</span>
                  <Progress value={avg * 10} className="flex-1 h-2" />
                  <span className="text-sm font-semibold text-slate-700 w-10 text-right">
                    {avg}
                  </span>
                  {trend === "up" ? (
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                  ) : trend === "down" ? (
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  ) : (
                    <Minus className="w-4 h-4 text-slate-300" />
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Evolution Suggestion */}
      {stats && stats.evolutionSuggestion && (
        <Card className="mb-8 border-0 shadow-sm rounded-2xl bg-gradient-to-r from-indigo-50/80 to-white ring-1 ring-indigo-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              进化建议
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-slate-600">{stats.evolutionSuggestion}</p>
            {stats.topIssues.length > 0 && (
              <div className="mt-4 space-y-2">
                {stats.topIssues.map((issue, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/60"
                  >
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <span className="text-sm font-medium text-slate-700">
                        {DIMENSIONS.find((d) => d.key === issue.dimension)?.label}
                      </span>
                      <span className="text-xs text-slate-400 ml-2">
                        均分 {issue.avgScore}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {issue.suggestion}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* History */}
      {historyQuery.data && historyQuery.data.length > 0 && (
        <Card className="border-0 shadow-sm rounded-2xl bg-white/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <History className="w-4 h-4 text-slate-500" />
              最近反馈
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {historyQuery.data.slice(0, 10).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-[10px]">
                      {DIMENSIONS.find((d) => d.key === item.dimension)?.label}
                    </Badge>
                    <span className="text-sm font-semibold text-slate-700">
                      {item.score}/10
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString("zh-CN") : "—"}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
