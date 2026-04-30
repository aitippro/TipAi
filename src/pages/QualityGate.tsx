import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import {
  Shield,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  ClipboardCheck,
  Sparkles,
} from "lucide-react";

const SEVERITY_ICONS = {
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
} as const;

const SEVERITY_COLORS = {
  error: "text-red-500 bg-red-50 border-red-200",
  warning: "text-amber-500 bg-amber-50 border-amber-200",
  info: "text-blue-500 bg-blue-50 border-blue-200",
} as const;

const SEVERITY_LABELS = {
  error: "错误",
  warning: "警告",
  info: "通过",
} as const;

export default function QualityGatePage() {
  const [prompt, setPrompt] = useState("");
  const [threshold, setThreshold] = useState([70]);
  const [submitted, setSubmitted] = useState(false);

  const checkQuery = trpc.qualityGate.check.useQuery(
    { prompt: prompt.trim(), threshold: threshold[0] },
    { enabled: submitted && !!prompt.trim() }
  );

  const handleCheck = () => {
    if (!prompt.trim()) return;
    setSubmitted(true);
    checkQuery.refetch();
  };

  const result = checkQuery.data;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-5 h-5 text-emerald-500" />
          <h1 className="text-2xl font-semibold text-slate-900">质量门禁</h1>
        </div>
        <p className="text-sm text-slate-400">
          12 项自动化检查，评估提示词质量并给出改进建议
        </p>
      </div>

      {/* Input */}
      <Card className="mb-8 border-0 shadow-sm rounded-2xl bg-white/80">
        <CardContent className="p-5 space-y-4">
          <Textarea
            placeholder="粘贴你的提示词，例如：你是一位资深 Python 工程师。请分析以下代码的性能瓶颈..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[120px] resize-none rounded-xl border-slate-200 focus:border-emerald-300 focus:ring-emerald-200"
          />

          {/* Threshold */}
          <div className="flex items-center gap-4">
            <span className="text-xs font-medium text-slate-500 shrink-0">通过阈值</span>
            <Slider
              value={threshold}
              onValueChange={setThreshold}
              min={50}
              max={95}
              step={5}
              className="flex-1 max-w-[200px]"
            />
            <span className="text-sm font-semibold text-slate-700 w-10">{threshold[0]}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {prompt.length}/5000 字符
            </span>
            <Button
              onClick={handleCheck}
              disabled={!prompt.trim() || checkQuery.isFetching}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {checkQuery.isFetching ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ClipboardCheck className="w-4 h-4 mr-2" />
              )}
              运行检查
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Overall Score */}
          <Card
            className={`border-0 shadow-sm rounded-2xl ${
              result.passed
                ? "bg-gradient-to-r from-emerald-50/80 to-white ring-1 ring-emerald-100"
                : "bg-gradient-to-r from-red-50/80 to-white ring-1 ring-red-100"
            }`}
          >
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                    result.passed ? "bg-emerald-100" : "bg-red-100"
                  }`}
                >
                  {result.passed ? (
                    <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                  ) : (
                    <XCircle className="w-8 h-8 text-red-600" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-lg font-semibold text-slate-800">
                      {result.passed ? "质量门禁通过" : "质量门禁未通过"}
                    </h2>
                    <Badge
                      variant="outline"
                      className={result.passed ? "border-emerald-200 text-emerald-700" : "border-red-200 text-red-700"}
                    >
                      {result.overallScore}/100
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-500">{result.summary}</p>
                  <Progress
                    value={result.overallScore}
                    className="h-2 mt-3"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Check List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {result.checks.map((check) => {
              const Icon = SEVERITY_ICONS[check.severity];
              const colorClass = SEVERITY_COLORS[check.severity];

              return (
                <Card
                  key={check.id}
                  className={`border-0 shadow-sm rounded-2xl transition-all duration-200 ${
                    check.passed ? "bg-white/80" : "bg-white/80"
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-slate-700">
                            {check.name}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-500">
                              {check.score}/10
                            </span>
                            <Badge variant="outline" className={`text-[10px] ${colorClass}`}>
                              {SEVERITY_LABELS[check.severity]}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 mb-1.5">{check.message}</p>
                        {check.suggestion && (
                          <p className="text-[11px] text-slate-400">
                            💡 {check.suggestion}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Top Issues */}
          {result.topIssues.length > 0 && (
            <Card className="border-0 shadow-sm rounded-2xl bg-gradient-to-r from-amber-50/80 to-white ring-1 ring-amber-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  优先改进项
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {result.topIssues.slice(0, 5).map((issue, i) => (
                    <div
                      key={issue.id}
                      className="flex items-start gap-3 p-3 rounded-xl bg-white/60"
                    >
                      <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <div>
                        <span className="text-sm font-medium text-slate-700">
                          {issue.name}
                        </span>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {issue.suggestion}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
