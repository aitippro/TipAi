import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { DiffViewer } from "@/components/optimizer/DiffViewer";
import { HistoryPanel } from "@/components/optimizer/HistoryPanel";
import { IterationTrajectory } from "@/components/optimizer/IterationTrajectory";
import { ScrollReveal } from "@/components/effects/ScrollReveal";
import { StaggerContainer, StaggerItem } from "@/components/effects/StaggerContainer";
import { TiltCard } from "@/components/effects/TiltCard";
import { EmptyState } from "@/components/EmptyState";
import type { OptimizationResult } from "../../api/types/shared";
import {
  Sparkles as _Sparkles,
  History,
  Copy,
  Check,
  Zap,
  Layers,
  Minimize2,
  Loader2,
  ArrowLeft,
  BrainCircuit,
  GitCompare,
  Wand2,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface _OptimizationResult {
  optimizedPrompt: string;
  improvements: string[];
  technique: string;
  strategy?: string;
}


function isStaticResult(r: unknown): r is _OptimizationResult {
  return !!r && typeof (r as Record<string, unknown>).optimizedPrompt === "string";
}

function isOproResult(r: unknown): r is OptimizationResult {
  return !!r && typeof (r as Record<string, unknown>).finalPrompt === "string";
}

/* ------------------------------------------------------------------ */

export type OptimizeMode = "static" | "opro";
export type StaticStrategy = "general" | "structured" | "concise";
export type DecodeType = "greedy" | "sampling" | "self-consistency";

const staticStrategies = [
  {
    value: "general" as StaticStrategy,
    label: "通用优化",
    description: "基于CRISPE/CO-STAR框架的全面优化，适合大多数场景",
    icon: Zap,
  },
  {
    value: "structured" as StaticStrategy,
    label: "结构化",
    description: "添加步骤分解和思维链引导，适合复杂任务",
    icon: Layers,
  },
  {
    value: "concise" as StaticStrategy,
    label: "精简",
    description: "删除冗余，保留核心，追求最高信息密度",
    icon: Minimize2,
  },
];

const decodeStrategyOptions: { value: DecodeType; label: string; desc: string }[] = [
  { value: "greedy", label: "Greedy", desc: "确定性最高，成本最低" },
  { value: "sampling", label: "Sampling", desc: "平衡质量与成本" },
  { value: "self-consistency", label: "Self-Consistency", desc: "多路径投票，质量最高，成本最高" },
];

/* ------------------------------------------------------------------ */

export default function Optimizer() {
  const [originalPrompt, setOriginalPrompt] = useState("");
  const [optimizeMode, setOptimizeMode] = useState<OptimizeMode>("static");
  const [selectedStrategy, setSelectedStrategy] = useState<StaticStrategy>("general");
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // OPRO config
  const [maxIterations, setMaxIterations] = useState([3]);
  const [candidatesPerIteration, setCandidatesPerIteration] = useState([5]);
  const [targetScore, setTargetScore] = useState([9]);
  const [decodeType, setDecodeType] = useState<DecodeType>("sampling");

  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const optimizeMutation = trpc.optimizer.optimize.useMutation({
    onSuccess: () => toast.success("提示词优化完成！"),
    onError: (error) => toast.error(error.message || "优化失败，请重试"),
  });

  const oproMutation = trpc.optimizer.optimizeOPRO.useMutation({
    onSuccess: () => toast.success("OPRO 自动优化完成！"),
    onError: (error) => toast.error(error.message || "OPRO 优化失败，请重试"),
  });

  const { data: historyData, refetch: refetchHistory } = trpc.optimizer.history.useQuery(
    undefined,
    { enabled: isAuthenticated && showHistory }
  );

  const result = optimizeMutation.data || oproMutation.data;

  const handleOptimize = () => {
    if (!originalPrompt.trim()) {
      toast.error("请输入需要优化的提示词");
      return;
    }
    if (!isAuthenticated) {
      toast.info("请先登录");
      navigate("/login");
      return;
    }
    if (optimizeMode === "static") {
      optimizeMutation.mutate({
        prompt: originalPrompt.trim(),
        domain: "general",
        strategy: selectedStrategy,
      });
    } else {
      oproMutation.mutate({
        prompt: originalPrompt.trim(),
        domain: "general",
        maxIterations: maxIterations[0],
        candidatesPerIteration: candidatesPerIteration[0],
        targetScore: targetScore[0],
        decodeStrategy: { type: decodeType },
      });
    }
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("已复制到剪贴板");
  };

  const loadFromHistory = (item: { originalPrompt: string; optimizedPrompt?: string; strategy?: string; domain?: string }) => {
    setOriginalPrompt(item.originalPrompt);
    if (item.strategy && ["general", "structured", "concise"].includes(item.strategy)) {
      setSelectedStrategy(item.strategy as StaticStrategy);
    }
    setShowHistory(false);
    toast.success("已加载历史记录");
  };

  const isPending = optimizeMutation.isPending || oproMutation.isPending;

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col overflow-hidden bg-background"
    >
      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b border-border/50 flex items-center gap-4"
      >
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1"
        >
          <h1 className="text-xl font-semibold tracking-tight"
          >提示词优化器</h1>
          <p className="text-muted-foreground text-xs mt-0.5"
          >一键优化你的提示词，让AI输出更精准</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)} className="rounded-lg"
        >
          <History className="w-4 h-4 mr-2" />
          历史
        </Button>
      </div>

      <div className="flex-1 flex overflow-hidden"
      >
        {/* Left — Original Input */}
        <div className="w-[45%] min-w-[320px] max-w-[520px] flex flex-col border-r border-border/50 bg-slate-50/30"
        >
          <ScrollReveal className="shrink-0 px-5 py-4 space-y-4 overflow-y-auto"
          >
            {/* Mode Cards */}
            <div className="grid grid-cols-2 gap-2"
            >
              <TiltCard maxTilt={3} scale={1.02}
              >
                <button
                  onClick={() => setOptimizeMode("static")}
                  className={`w-full flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                    optimizeMode === "static"
                      ? "border-apple-blue bg-apple-blue/5 shadow-sm"
                      : "border-border/50 hover:border-apple-blue/30 bg-white"
                  }`}
                >
                  <Zap className={`w-4 h-4 mb-1.5 ${optimizeMode === "static" ? "text-apple-blue" : "text-muted-foreground"}`} />
                  <span className={`text-xs font-medium ${optimizeMode === "static" ? "text-apple-blue" : ""}`}
                  >静态优化</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5"
                  >单轮策略，快速出结果</span>
                </button>
              </TiltCard>
              <TiltCard maxTilt={3} scale={1.02}
              >
                <button
                  onClick={() => setOptimizeMode("opro")}
                  className={`w-full flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                    optimizeMode === "opro"
                      ? "border-apple-blue bg-apple-blue/5 shadow-sm"
                      : "border-border/50 hover:border-apple-blue/30 bg-white"
                  }`}
                >
                  <BrainCircuit className={`w-4 h-4 mb-1.5 ${optimizeMode === "opro" ? "text-apple-blue" : "text-muted-foreground"}`} />
                  <span className={`text-xs font-medium ${optimizeMode === "opro" ? "text-apple-blue" : ""}`}
                  >OPRO 自动优化</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5"
                  >多轮迭代，自动评估</span>
                </button>
              </TiltCard>
            </div>

            {/* Strategy (static) */}
            {optimizeMode === "static" && (
              <StaggerContainer className="space-y-2"
              >
                {staticStrategies.map((strategy) => {
                  const Icon = strategy.icon;
                  return (
                    <StaggerItem key={strategy.value}
                    >
                      <button
                        onClick={() => setSelectedStrategy(strategy.value)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                          selectedStrategy === strategy.value
                            ? "border-apple-blue bg-apple-blue/5 shadow-sm"
                            : "border-border/50 hover:border-apple-blue/30 bg-white"
                        }`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${selectedStrategy === strategy.value ? "text-apple-blue" : "text-muted-foreground"}`} />
                        <div>
                          <span className={`text-xs font-medium ${selectedStrategy === strategy.value ? "text-apple-blue" : ""}`}
                          >{strategy.label}</span>
                          <p className="text-[10px] text-muted-foreground mt-0.5"
                          >{strategy.description}</p>
                        </div>
                      </button>
                    </StaggerItem>
                  );
                })}
              </StaggerContainer>
            )}

            {/* OPRO config */}
            {optimizeMode === "opro" && (
              <Card className="border-border/50 rounded-xl"
              >
                <CardContent className="p-4 space-y-4"
                >
                  <div className="space-y-1.5"
                  >
                    <div className="flex items-center justify-between"
                    >
                      <label className="text-xs font-medium"
                      >最大迭代轮次</label>
                      <span className="text-xs text-apple-blue font-medium"
                      >{maxIterations[0]} 轮</span>
                    </div>
                    <Slider value={maxIterations} onValueChange={setMaxIterations} min={1} max={5} step={1} />
                  </div>
                  <div className="space-y-1.5"
                  >
                    <div className="flex items-center justify-between"
                    >
                      <label className="text-xs font-medium"
                      >每轮候选数</label>
                      <span className="text-xs text-apple-blue font-medium"
                      >{candidatesPerIteration[0]} 个</span>
                    </div>
                    <Slider value={candidatesPerIteration} onValueChange={setCandidatesPerIteration} min={3} max={8} step={1} />
                  </div>
                  <div className="space-y-1.5"
                  >
                    <div className="flex items-center justify-between"
                    >
                      <label className="text-xs font-medium"
                      >目标分数</label>
                      <span className="text-xs text-apple-blue font-medium"
                      >{targetScore[0]}/10</span>
                    </div>
                    <Slider value={targetScore} onValueChange={setTargetScore} min={5} max={10} step={0.5} />
                  </div>
                  <div className="space-y-1.5"
                  >
                    <label className="text-xs font-medium"
                    >解码策略</label>
                    <div className="grid grid-cols-3 gap-2"
                    >
                      {decodeStrategyOptions.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setDecodeType(opt.value)}
                          className={`p-2 rounded-lg border text-left transition-all ${
                            decodeType === opt.value
                              ? "border-apple-blue bg-apple-blue/5"
                              : "border-border/50 hover:border-apple-blue/30"
                          }`}
                        >
                          <div className={`text-[10px] font-medium ${decodeType === opt.value ? "text-apple-blue" : ""}`}
                          >{opt.label}</div>
                          <div className="text-[9px] text-muted-foreground mt-0.5"
                          >{opt.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Input Area */}
            <div className="space-y-3"
            >
              <Textarea
                placeholder="在这里粘贴你需要优化的提示词…"
                value={originalPrompt}
                onChange={(e) => setOriginalPrompt(e.target.value)}
                className="min-h-[160px] resize-none border-border/50 focus-visible:ring-apple-blue/30 font-mono text-sm leading-relaxed rounded-xl"
              />
              <div className="flex items-center justify-between"
              >
                <span className="text-xs text-muted-foreground"
                >{originalPrompt.length} / 5000 字符</span>
                <Button
                  onClick={handleOptimize}
                  disabled={isPending || !originalPrompt.trim()}
                  className="rounded-xl bg-gradient-to-r from-apple-blue to-apple-purple text-white shadow-md"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {optimizeMode === "opro" ? "OPRO 优化中…" : "优化中…"}
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 mr-2" />
                      {optimizeMode === "opro" ? "启动 OPRO" : "开始优化"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </ScrollReveal>
        </div>

        {/* Right — Result / Comparison */}
        <div className="flex-1 flex flex-col min-w-0 bg-background"
        >
          {!result ? (
            <div className="flex-1 flex items-center justify-center p-8"
            >
              <EmptyState
                icon={<GitCompare className="w-10 h-10" />}
                title="准备优化"
                description="在左侧输入提示词并点击优化，结果将在这里显示"
              />
            </div>
          ) : (
            <ScrollReveal className="flex-1 p-5 space-y-4 overflow-y-auto"
            >
              {/* Improvements badges (static only) */}
              {isStaticResult(result) && (
                <StaggerContainer className="flex flex-wrap gap-2"
                >
                  {result.improvements.map((improvement, idx) => (
                    <StaggerItem key={idx}
                    >
                      <Badge variant="secondary" className="bg-apple-blue/10 text-apple-blue hover:bg-apple-blue/20 border-0 text-xs"
                      >
                        ✦ {improvement}
                      </Badge>
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              )}

              {/* Diff / Trajectory */}
              {isOproResult(result) ? (
                <IterationTrajectory result={result} />
              ) : (
                <Card className="border-border/50 shadow-apple rounded-2xl"
                >
                  <CardHeader className="pb-3"
                  >
                    <div className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2"
                      >
                        <GitCompare className="w-4 h-4 text-apple-blue" />
                        <CardTitle className="text-sm font-medium"
                        >优化对比</CardTitle>
                      </div>
                      <div className="flex items-center gap-2"
                      >
                        {isStaticResult(result) && (
                          <Badge variant="outline" className="text-xs rounded-md"
                          >{result.technique}</Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleCopy(
                              (result as { optimizedPrompt?: string; finalPrompt?: string }).optimizedPrompt
                              || (result as { optimizedPrompt?: string; finalPrompt?: string }).finalPrompt
                              || ""
                            )}
                          className="rounded-lg h-8 px-2"
                        >
                          {copied ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isStaticResult(result) && (
                      <DiffViewer
                        original={originalPrompt}
                        optimized={result.optimizedPrompt}
                      />
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Action bar */}
              <div className="flex justify-end gap-2 pt-2"
              >
                <Button
                  variant="outline"
                  onClick={() => {
                    optimizeMutation.reset();
                    oproMutation.reset();
                  }}
                  className="rounded-xl"
                >
                  重新优化
                </Button>
                <Button
                  onClick={() =>
                    handleCopy(isOproResult(result) ? result.finalPrompt : (isStaticResult(result) ? result.optimizedPrompt : ""))}
                  className="rounded-xl bg-gradient-to-r from-apple-blue to-apple-purple text-white"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      已复制
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      复制结果
                    </>
                  )}
                </Button>
              </div>
            </ScrollReveal>
          )}
        </div>

        {/* History Drawer (collapsible) */}
        {showHistory && (
          <div className="w-80 border-l border-border/50 bg-slate-50/30 overflow-y-auto"
          >
            <HistoryPanel
              history={historyData || []}
              onSelect={loadFromHistory}
              onRefresh={refetchHistory}
            />
          </div>
        )}
      </div>
    </div>
  );
}
