"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  TrendingUp,
  TrendingDown,
  Target,
  Clock,
  Coins,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  Layers,
} from "lucide-react";

interface JudgeResult {
  prompt: string;
  scores: Record<string, number>;
  overall: number;
  feedback: string;
}

interface OPROIteration {
  round: number;
  candidates: JudgeResult[];
  bestCandidate: JudgeResult;
  worstCandidate: JudgeResult;
  topBottomAnalysis: string;
}

interface OPROResult {
  finalPrompt: string;
  finalScore: number;
  originalScore: number;
  improvementPercent: number;
  iterations: OPROIteration[];
  stopReason: string;
  estimatedTokens: number;
  elapsedMs: number;
}

interface IterationTrajectoryProps {
  result: OPROResult;
  baselinePrompt: string;
}

export function IterationTrajectory({ result, baselinePrompt }: IterationTrajectoryProps) {
  const maxScore = 10;
  const scoreColor = (score: number) => {
    if (score >= 8) return "bg-green-500";
    if (score >= 6) return "bg-amber-500";
    return "bg-red-500";
  };

  const stopReasonText: Record<string, string> = {
    target_reached: "达到目标分数",
    no_improvement: "连续多轮无提升",
    max_iterations: "达到最大迭代次数",
    no_new_candidates: "无新候选方案",
  };

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard
          icon={<TrendingUp className="w-4 h-4 text-green-500" />}
          label="最终分数"
          value={`${result.finalScore.toFixed(1)}/10`}
          sub={`+${result.improvementPercent.toFixed(0)}%`}
        />
        <SummaryCard
          icon={<Target className="w-4 h-4 text-apple-blue" />}
          label="原始分数"
          value={`${result.originalScore.toFixed(1)}/10`}
        />
        <SummaryCard
          icon={<Clock className="w-4 h-4 text-muted-foreground" />}
          label="耗时"
          value={`${(result.elapsedMs / 1000).toFixed(1)}s`}
        />
        <SummaryCard
          icon={<Coins className="w-4 h-4 text-amber-500" />}
          label="预估Token"
          value={`${(result.estimatedTokens / 1000).toFixed(1)}k`}
        />
      </div>

      {/* Stop Reason */}
      <div className="flex items-center gap-2 text-sm">
        <AlertCircle className="w-4 h-4 text-muted-foreground" />
        <span className="text-muted-foreground">停止原因：</span>
        <Badge variant="outline" className="text-xs">
          {stopReasonText[result.stopReason] || result.stopReason}
        </Badge>
      </div>

      {/* Score Trajectory */}
      <Card className="border-border/50 shadow-apple">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-apple-blue" />
            分数迭代轨迹
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {/* Baseline */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Baseline（原始提示词）</span>
              <span className="font-medium">{result.originalScore.toFixed(1)}</span>
            </div>
            <Progress value={(result.originalScore / maxScore) * 100} className="h-1.5" />
          </div>

          {/* Each iteration best score */}
          {result.iterations.map((iter) => (
            <div key={iter.round} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  <RotateCcw className="w-3 h-3 text-apple-blue" />
                  第 {iter.round} 轮
                  <Badge variant="secondary" className="text-[10px] h-4 px-1">
                    {iter.candidates.length} 个候选
                  </Badge>
                </span>
                <span className="font-medium text-apple-blue">
                  {iter.bestCandidate.overall.toFixed(1)}
                </span>
              </div>
              <Progress
                value={(iter.bestCandidate.overall / maxScore) * 100}
                className="h-1.5"
              />
            </div>
          ))}

          {/* Final */}
          <div className="space-y-1 pt-1 border-t border-border/30">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-green-600 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                最终最优
              </span>
              <span className="font-bold text-green-600">{result.finalScore.toFixed(1)}</span>
            </div>
            <Progress
              value={(result.finalScore / maxScore) * 100}
              className="h-2 bg-green-100"
            >
              <div className="bg-green-500 h-full w-full flex-1 transition-all rounded-full" />
            </Progress>
          </div>
        </CardContent>
      </Card>

      {/* Iteration Details */}
      <Accordion type="multiple" className="space-y-2">
        {result.iterations.map((iter) => (
          <AccordionItem
            key={iter.round}
            value={`round-${iter.round}`}
            className="border border-border/50 rounded-xl px-4 shadow-apple"
          >
            <AccordionTrigger className="text-sm hover:no-underline py-3">
              <div className="flex items-center gap-3 flex-1">
                <Layers className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">第 {iter.round} 轮</span>
                <div className="flex items-center gap-2 ml-auto mr-4">
                  <Badge className={`text-[10px] h-5 px-1.5 text-white ${scoreColor(iter.bestCandidate.overall)}`}>
                    最优 {iter.bestCandidate.overall.toFixed(1)}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                    最差 {iter.worstCandidate.overall.toFixed(1)}
                  </Badge>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4 space-y-3">
              {/* Candidates mini chart */}
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground mb-1">候选分数分布</p>
                <div className="flex items-end gap-1 h-16">
                  {iter.candidates.map((cand, idx) => {
                    const height = (cand.overall / maxScore) * 100;
                    const isBest = cand.overall === iter.bestCandidate.overall;
                    return (
                      <div
                        key={idx}
                        className="flex-1 flex flex-col items-center gap-1 group"
                        title={`候选 ${idx + 1}: ${cand.overall.toFixed(1)}`}
                      >
                        <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                          {cand.overall.toFixed(1)}
                        </span>
                        <div
                          className={`w-full rounded-t-sm transition-all ${
                            isBest ? "bg-apple-blue" : "bg-apple-blue/30 hover:bg-apple-blue/50"
                          }`}
                          style={{ height: `${Math.max(height, 8)}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dimension scores radar-like bars */}
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">最优候选维度得分</p>
                {Object.entries(iter.bestCandidate.scores).map(([dim, score]) => (
                  <div key={dim} className="flex items-center gap-2">
                    <span className="text-xs w-20 text-muted-foreground capitalize">{dim}</span>
                    <div className="flex-1">
                      <Progress value={score * 10} className="h-1" />
                    </div>
                    <span className="text-xs font-medium w-6 text-right">{score.toFixed(1)}</span>
                  </div>
                ))}
              </div>

              {/* Top-Bottom Analysis */}
              <div className="bg-secondary/30 rounded-lg p-3 text-xs leading-relaxed text-muted-foreground">
                <p className="font-medium text-foreground mb-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  优劣差异分析
                </p>
                {iter.topBottomAnalysis}
              </div>

              {/* Best prompt preview */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-apple-blue">本轮最优提示词</p>
                <div className="bg-muted/50 rounded-lg p-2.5 text-xs font-mono leading-relaxed text-foreground/80 line-clamp-4">
                  {iter.bestCandidate.prompt}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {/* Final Prompt */}
      <Card className="border-apple-blue/20 bg-apple-blue/[0.02] shadow-apple">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-apple-blue">
            <CheckCircle2 className="w-4 h-4" />
            最终优化结果
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm font-mono leading-relaxed whitespace-pre-wrap text-foreground/90">
            {result.finalPrompt}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-secondary/30 rounded-xl p-3">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="text-lg font-semibold">{value}</div>
      {sub && <div className="text-xs text-green-600 font-medium">{sub}</div>}
    </div>
  );
}
