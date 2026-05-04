import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
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
import type { PromptOptimization } from "../../db/schema";
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
const STATIC_STRATEGIES: StaticStrategy[] = ["general", "structured", "concise"];
export type DecodeType = "greedy" | "sampling" | "self-consistency";

const staticStrategies: { value: StaticStrategy; labelKey: string; descKey: string; icon: typeof Zap }[] = [
  {
    value: "general",
    labelKey: "optimizer.strategyGeneral",
    descKey: "optimizer.strategyGeneralDesc",
    icon: Zap,
  },
  {
    value: "structured",
    labelKey: "optimizer.strategyStructured",
    descKey: "optimizer.strategyStructuredDesc",
    icon: Layers,
  },
  {
    value: "concise",
    labelKey: "optimizer.strategyConcise",
    descKey: "optimizer.strategyConciseDesc",
    icon: Minimize2,
  },
];

const decodeStrategyOptions: { value: DecodeType; label: string; descKey: string }[] = [
  { value: "greedy", label: "Greedy", descKey: "optimizer.decodeGreedyDesc" },
  { value: "sampling", label: "Sampling", descKey: "optimizer.decodeSamplingDesc" },
  { value: "self-consistency", label: "Self-Consistency", descKey: "optimizer.decodeSelfConsistencyDesc" },
];

/* ------------------------------------------------------------------ */

export default function Optimizer() {
  const { t } = useTranslation();
  const [originalPrompt, setOriginalPrompt] = useState("");
  const [optimizeMode, setOptimizeMode] = useState<OptimizeMode>("static");
  const [selectedStrategy, setSelectedStrategy] = useState<StaticStrategy>("general");
  const [copiedDiff, setCopiedDiff] = useState(false);
  const [copiedAction, setCopiedAction] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const copyActionTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => {
    clearTimeout(copyTimerRef.current);
    clearTimeout(copyActionTimerRef.current);
  }, []);
  const [showHistory, setShowHistory] = useState(false);

  // OPRO config
  const [maxIterations, setMaxIterations] = useState([3]);
  const [candidatesPerIteration, setCandidatesPerIteration] = useState([5]);
  const [targetScore, setTargetScore] = useState([9]);
  const [decodeType, setDecodeType] = useState<DecodeType>("sampling");

  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const optimizeMutation = trpc.optimizer.optimize.useMutation({
    onSuccess: () => toast.success(t("optimizer.toastOptimizeSuccess")),
    onError: (error) => toast.error(error.message || t("optimizer.toastOptimizeError")),
  });

  const oproMutation = trpc.optimizer.optimizeOPRO.useMutation({
    onSuccess: () => toast.success(t("optimizer.toastOproSuccess")),
    onError: (error) => toast.error(error.message || t("optimizer.toastOproError")),
  });

  const { data: historyData, refetch: refetchHistory } = trpc.optimizer.history.useQuery(
    undefined,
    { enabled: isAuthenticated && showHistory }
  );

  const result = optimizeMutation.data || oproMutation.data;

  const handleOptimize = () => {
    if (!originalPrompt.trim()) {
      toast.error(t("optimizer.toastEmptyPrompt"));
      return;
    }
    if (!isAuthenticated) {
      toast.info(t("home.toastLoginRequired"));
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

  const handleCopy = async (text: string, type: "diff" | "action" = "diff") => {
    await navigator.clipboard.writeText(text);
    if (type === "diff") {
      setCopiedDiff(true);
      clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopiedDiff(false), 2000);
    } else {
      setCopiedAction(true);
      clearTimeout(copyActionTimerRef.current);
      copyActionTimerRef.current = setTimeout(() => setCopiedAction(false), 2000);
    }
    toast.success(t("optimizer.toastCopied"));
  };

  const loadFromHistory = (item: PromptOptimization) => {
    setOriginalPrompt(item.originalPrompt || "");
    if (item.strategy && STATIC_STRATEGIES.includes(item.strategy as StaticStrategy)) {
      setSelectedStrategy(item.strategy as StaticStrategy);
    }
    setShowHistory(false);
    toast.success(t("optimizer.toastLoaded"));
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
          >{t("optimizer.title")}</h1>
          <p className="text-muted-foreground text-xs mt-0.5"
          >{t("optimizer.subtitle")}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)} className="rounded-lg"
        >
          <History className="w-4 h-4 mr-2" />
          {t("optimizer.history")}
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
                  >{t("optimizer.staticOptimize")}</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5"
                  >{t("optimizer.staticOptimizeDesc")}</span>
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
                  >{t("optimizer.oproOptimize")}</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5"
                  >{t("optimizer.oproOptimizeDesc")}</span>
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
                          >{t(strategy.labelKey)}</span>
                          <p className="text-[10px] text-muted-foreground mt-0.5"
                          >{t(strategy.descKey)}</p>
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
                      >{t("optimizer.maxIterations")}</label>
                      <span className="text-xs text-apple-blue font-medium"
                      >{t("optimizer.rounds", { count: maxIterations[0] })}</span>
                    </div>
                    <Slider value={maxIterations} onValueChange={setMaxIterations} min={1} max={5} step={1} />
                  </div>
                  <div className="space-y-1.5"
                  >
                    <div className="flex items-center justify-between"
                    >
                      <label className="text-xs font-medium"
                      >{t("optimizer.candidatesPerIteration")}</label>
                      <span className="text-xs text-apple-blue font-medium"
                      >{t("optimizer.candidates", { count: candidatesPerIteration[0] })}</span>
                    </div>
                    <Slider value={candidatesPerIteration} onValueChange={setCandidatesPerIteration} min={3} max={8} step={1} />
                  </div>
                  <div className="space-y-1.5"
                  >
                    <div className="flex items-center justify-between"
                    >
                      <label className="text-xs font-medium"
                      >{t("optimizer.targetScore")}</label>
                      <span className="text-xs text-apple-blue font-medium"
                      >{t("optimizer.scoreOutOf10", { score: targetScore[0] })}</span>
                    </div>
                    <Slider value={targetScore} onValueChange={setTargetScore} min={5} max={10} step={0.5} />
                  </div>
                  <div className="space-y-1.5"
                  >
                    <label className="text-xs font-medium"
                    >{t("optimizer.decodeStrategy")}</label>
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
                          >{t(opt.descKey)}</div>
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
                placeholder={t("optimizer.placeholder")}
                value={originalPrompt}
                onChange={(e) => setOriginalPrompt(e.target.value)}
                className="min-h-[160px] resize-none border-border/50 focus-visible:ring-apple-blue/30 font-mono text-sm leading-relaxed rounded-xl"
              />
              <div className="flex items-center justify-between"
              >
                <span className="text-xs text-muted-foreground"
                >{t("optimizer.charCount", { count: originalPrompt.length })}</span>
                <Button
                  onClick={handleOptimize}
                  disabled={isPending || !originalPrompt.trim()}
                  className="rounded-xl bg-gradient-to-r from-apple-blue to-apple-purple text-white shadow-md"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {optimizeMode === "opro" ? t("optimizer.optimizingOpro") : t("optimizer.optimizing")}
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 mr-2" />
                      {optimizeMode === "opro" ? t("optimizer.startOpro") : t("optimizer.startOptimize")}
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
                title={t("optimizer.emptyTitle")}
                description={t("optimizer.emptyDesc")}
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
                        >{t("optimizer.diffTitle")}</CardTitle>
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
                              || "",
                              "diff"
                            )}
                          className="rounded-lg h-8 px-2"
                        >
                          {copiedDiff ? (
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
                  {t("optimizer.retry")}
                </Button>
                <Button
                  onClick={() =>
                    handleCopy(isOproResult(result) ? result.finalPrompt : (isStaticResult(result) ? result.optimizedPrompt : ""), "action")}
                  className="rounded-xl bg-gradient-to-r from-apple-blue to-apple-purple text-white"
                >
                  {copiedAction ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      {t("common.copied")}
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      {t("optimizer.copyResult")}
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
