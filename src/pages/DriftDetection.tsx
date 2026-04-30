import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Activity,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Minus,
  GitCompare,
  Sparkles,
  Plus,
  Trash2,
} from "lucide-react";

interface VersionEntry {
  id: string;
  version: string;
  text: string;
}

export default function DriftDetectionPage() {
  const [versions, setVersions] = useState<VersionEntry[]>([
    { id: "1", version: "v1", text: "" },
    { id: "2", version: "v2", text: "" },
  ]);

  const detectQuery = trpc.drift.detect.useQuery(
    {
      versions: versions.map((v) => ({ version: v.version, text: v.text })),
    },
    { enabled: versions.every((v) => v.text.trim().length > 0) && versions.length >= 2 }
  );

  const addVersion = () => {
    const nextNum = versions.length + 1;
    setVersions([...versions, { id: String(nextNum), version: `v${nextNum}`, text: "" }]);
  };

  const removeVersion = (id: string) => {
    if (versions.length <= 2) return;
    setVersions(versions.filter((v) => v.id !== id));
  };

  const updateVersion = (id: string, field: "version" | "text", value: string) => {
    setVersions(versions.map((v) => (v.id === id ? { ...v, [field]: value } : v)));
  };

  const handleDetect = () => {
    detectQuery.refetch();
  };

  const result = detectQuery.data;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-5 h-5 text-rose-500" />
          <h1 className="text-2xl font-semibold text-slate-900">Drift Detection</h1>
        </div>
        <p className="text-sm text-slate-400">
          基于词频向量 + Cosine Similarity 检测提示词版本的漂移趋势
        </p>
      </div>

      {/* Version Inputs */}
      <Card className="mb-8 border-0 shadow-sm rounded-2xl bg-white/80">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-800">
              版本历史
            </CardTitle>
            <Button size="sm" variant="outline" onClick={addVersion} className="rounded-lg text-xs">
              <Plus className="w-3.5 h-3.5 mr-1" />
              添加版本
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          {versions.map((v, idx) => (
            <div key={v.id} className="flex gap-3">
              <div className="w-20 shrink-0">
                <input
                  value={v.version}
                  onChange={(e) => updateVersion(v.id, "version", e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-rose-300 focus:outline-none"
                  placeholder="版本号"
                />
              </div>
              <Textarea
                value={v.text}
                onChange={(e) => updateVersion(v.id, "text", e.target.value)}
                placeholder={`输入第 ${idx + 1} 个版本的提示词内容...`}
                className="min-h-[60px] resize-none rounded-xl border-slate-200 focus:border-rose-300 focus:ring-rose-200 text-sm"
              />
              {versions.length > 2 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeVersion(v.id)}
                  className="shrink-0 h-auto rounded-lg text-slate-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}

          <Button
            onClick={handleDetect}
            disabled={!versions.every((v) => v.text.trim()) || detectQuery.isFetching}
            className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white"
          >
            {detectQuery.isFetching ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <GitCompare className="w-4 h-4 mr-2" />
            )}
            检测漂移
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Overall */}
          <Card
            className={`border-0 shadow-sm rounded-2xl ${
              result.hasDrift
                ? "bg-gradient-to-r from-red-50/80 to-white ring-1 ring-red-100"
                : "bg-gradient-to-r from-emerald-50/80 to-white ring-1 ring-emerald-100"
            }`}
          >
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                    result.hasDrift ? "bg-red-100" : "bg-emerald-100"
                  }`}
                >
                  {result.hasDrift ? (
                    <AlertTriangle className="w-8 h-8 text-red-600" />
                  ) : (
                    <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-lg font-semibold text-slate-800">
                      {result.hasDrift ? "检测到漂移" : "未检测到漂移"}
                    </h2>
                    <Badge
                      variant="outline"
                      className={
                        result.hasDrift ? "border-red-200 text-red-700" : "border-emerald-200 text-emerald-700"
                      }
                    >
                      漂移度 {(result.driftScore * 100).toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <span>趋势:</span>
                    {result.trend === "degrading" ? (
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    ) : result.trend === "improving" ? (
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Minus className="w-4 h-4 text-slate-400" />
                    )}
                    <span>
                      {result.trend === "degrading"
                        ? "恶化"
                        : result.trend === "improving"
                          ? "改善"
                          : "稳定"}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Similarity Chart */}
          <Card className="border-0 shadow-sm rounded-2xl bg-white/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-800">
                版本相似度
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {result.checks.map((check) => (
                <div key={check.version} className="flex items-center gap-3">
                  <span className="text-sm text-slate-600 w-12">{check.version}</span>
                  <Progress
                    value={check.similarityToBaseline * 100}
                    className="flex-1 h-2"
                  />
                  <span
                    className={`text-sm font-semibold w-14 text-right ${
                      check.similarityToBaseline < 0.5
                        ? "text-red-600"
                        : check.similarityToBaseline < 0.7
                          ? "text-amber-600"
                          : "text-emerald-600"
                    }`}
                  >
                    {(check.similarityToBaseline * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <Card className="border-0 shadow-sm rounded-2xl bg-white/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  告警
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-2">
                  {result.warnings.map((w, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                      {w}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Suggestions */}
          <Card className="border-0 shadow-sm rounded-2xl bg-gradient-to-r from-indigo-50/80 to-white ring-1 ring-indigo-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                建议
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-2">
                {result.suggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    {s}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
