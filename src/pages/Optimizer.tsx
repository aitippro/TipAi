import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { DiffViewer } from "@/components/optimizer/DiffViewer";
import { HistoryPanel } from "@/components/optimizer/HistoryPanel";
import { IterationTrajectory } from "@/components/optimizer/IterationTrajectory";
import {
  Sparkles,
  History,
  Copy,
  Check,
  Zap,
  Layers,
  Minimize2,
  Loader2,
  ArrowLeft,
  BrainCircuit,
  Target,
  Settings2,
  GitCompare,
} from "lucide-react";

type OptimizeMode = "static" | "opro";
type StaticStrategy = "general" | "structured" | "concise";
type DecodeType = "greedy" | "sampling" | "self-consistency";

interface StaticStrategyOption {
  value: StaticStrategy;
  label: string;
  description: string;
  icon: typeof Zap;
}

const staticStrategies: StaticStrategyOption[] = [
  {
    value: "general",
    label: "通用优化",
    description: "基于CRISPE/CO-STAR框架的全面优化，适合大多数场景",
    icon: Zap,
  },
  {
    value: "structured",
    label: "结构化",
    description: "添加步骤分解和思维链引导，适合复杂任务",
    icon: Layers,
  },
  {
    value: "concise",
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

export default function Optimizer() {
  const [originalPrompt, setOriginalPrompt] = useState("");
  const [optimizeMode, setOptimizeMode] = useState<OptimizeMode>("static");
  const [selectedStrategy, setSelectedStrategy] = useState<StaticStrategy>("general");
  const [activeTab, setActiveTab] = useState("input");
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // OPRO config
  const [maxIterations, setMaxIterations] = useState([3]);
  const [candidatesPerIteration, setCandidatesPerIteration] = useState([5]);
  const [targetScore, setTargetScore] = useState([9]);
  const [decodeType, setDecodeType] = useState<DecodeType>("sampling");

  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Static optimize mutation
  const optimizeMutation = trpc.optimizer.optimize.useMutation({
    onSuccess: () => {
      setActiveTab("result");
      toast.success("提示词优化完成！");
    },
    onError: (error) => {
      toast.error(error.message || "优化失败，请重试");
    },
  });

  // OPRO optimize mutation
  const oproMutation = trpc.optimizer.optimizeOPRO.useMutation({
    onSuccess: () => {
      setActiveTab("result");
      toast.success("OPRO 自动优化完成！");
    },
    onError: (error) => {
      toast.error(error.message || "OPRO 优化失败，请重试");
    },
  });

  const { data: historyData, refetch: refetchHistory } = trpc.optimizer.history.useQuery(
    undefined,
    { enabled: isAuthenticated && showHistory }
  );

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

  const loadFromHistory = (item: {
    originalPrompt: string;
    optimizedPrompt: string;
    strategy?: string;
  }) => {
    setOriginalPrompt(item.originalPrompt);
    if (item.strategy && ["general", "structured", "concise"].includes(item.strategy)) {
      setSelectedStrategy(item.strategy as StaticStrategy);
    }
    setShowHistory(false);
    toast.success("已加载历史记录");
  };

  const isPending = optimizeMutation.isPending || oproMutation.isPending;
  const result = optimizeMutation.data || oproMutation.data;
  const isOproResult = optimizeMode === "opro" && oproMutation.data;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full hover:bg-secondary"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">提示词优化器</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              一键优化你的提示词，让AI输出更精准
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Mode Selection */}
            <Card className="border-border/50 shadow-apple">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <GitCompare className="w-4 h-4 text-apple-blue" />
                  选择优化模式
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => setOptimizeMode("static")}
                    className={`relative flex flex-col items-start p-4 rounded-xl border text-left transition-all duration-200 ${
                      optimizeMode === "static"
                        ? "border-apple-blue bg-apple-blue/5 shadow-sm"
                        : "border-border/50 hover:border-apple-blue/30 hover:bg-secondary/50"
                    }`}
                  >
                    <Zap className={`w-5 h-5 mb-2 ${
                      optimizeMode === "static" ? "text-apple-blue" : "text-muted-foreground"
                    }`} />
                    <span className={`font-medium text-sm ${
                      optimizeMode === "static" ? "text-apple-blue" : "text-foreground"
                    }`}>
                      静态优化
                    </span>
                    <span className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      单轮策略优化，快速出结果
                    </span>
                    {optimizeMode === "static" && (
                      <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-apple-blue" />
                    )}
                  </button>

                  <button
                    onClick={() => setOptimizeMode("opro")}
                    className={`relative flex flex-col items-start p-4 rounded-xl border text-left transition-all duration-200 ${
                      optimizeMode === "opro"
                        ? "border-apple-blue bg-apple-blue/5 shadow-sm"
                        : "border-border/50 hover:border-apple-blue/30 hover:bg-secondary/50"
                    }`}
                  >
                    <BrainCircuit className={`w-5 h-5 mb-2 ${
                      optimizeMode === "opro" ? "text-apple-blue" : "text-muted-foreground"
                    }`} />
                    <span className={`font-medium text-sm ${
                      optimizeMode === "opro" ? "text-apple-blue" : "text-foreground"
                    }`}>
                      OPRO 自动优化
                    </span>
                    <span className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      多轮迭代 + LLM-as-Judge 自动评估，寻找最优提示词
                    </span>
                    {optimizeMode === "opro" && (
                      <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-apple-blue" />
                    )}
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Mode-specific Config */}
            {optimizeMode === "static" ? (
              <Card className="border-border/50 shadow-apple">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-apple-blue" />
                    选择优化策略
                  </CardTitle>
                  <CardDescription>
                    根据你的需求选择最适合的优化方向
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {staticStrategies.map((strategy) => {
                      const Icon = strategy.icon;
                      return (
                        <button
                          key={strategy.value}
                          onClick={() => setSelectedStrategy(strategy.value)}
                          className={`relative flex flex-col items-start p-4 rounded-xl border text-left transition-all duration-200 ${
                            selectedStrategy === strategy.value
                              ? "border-apple-blue bg-apple-blue/5 shadow-sm"
                              : "border-border/50 hover:border-apple-blue/30 hover:bg-secondary/50"
                          }`}
                        >
                          <Icon className={`w-5 h-5 mb-2 ${
                            selectedStrategy === strategy.value ? "text-apple-blue" : "text-muted-foreground"
                          }`} />
                          <span className={`font-medium text-sm ${
                            selectedStrategy === strategy.value ? "text-apple-blue" : "text-foreground"
                          }`}>
                            {strategy.label}
                          </span>
                          <span className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            {strategy.description}
                          </span>
                          {selectedStrategy === strategy.value && (
                            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-apple-blue" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border/50 shadow-apple">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-apple-blue" />
                    OPRO 优化参数
                  </CardTitle>
                  <CardDescription>
                    调整迭代策略，平衡优化质量与成本
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Max Iterations */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">最大迭代轮次</label>
                      <span className="text-sm text-apple-blue font-medium">{maxIterations[0]} 轮</span>
                    </div>
                    <Slider
                      value={maxIterations}
                      onValueChange={setMaxIterations}
                      min={1}
                      max={5}
                      step={1}
                    />
                    <p className="text-xs text-muted-foreground">
                      每轮生成候选提示词并评估，保留最优继续迭代
                    </p>
                  </div>

                  {/* Candidates per iteration */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">每轮候选数</label>
                      <span className="text-sm text-apple-blue font-medium">{candidatesPerIteration[0]} 个</span>
                    </div>
                    <Slider
                      value={candidatesPerIteration}
                      onValueChange={setCandidatesPerIteration}
                      min={3}
                      max={8}
                      step={1}
                    />
                    <p className="text-xs text-muted-foreground">
                      候选越多，找到优质提示词的概率越高，但成本也越高
                    </p>
                  </div>

                  {/* Target Score */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">目标分数</label>
                      <span className="text-sm text-apple-blue font-medium">{targetScore[0]}/10</span>
                    </div>
                    <Slider
                      value={targetScore}
                      onValueChange={setTargetScore}
                      min={5}
                      max={10}
                      step={0.5}
                    />
                    <p className="text-xs text-muted-foreground">
                      达到目标分数后自动停止，避免不必要的迭代
                    </p>
                  </div>

                  {/* Decode Strategy */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">解码策略（成本-质量权衡）</label>
                    <div className="grid grid-cols-3 gap-2">
                      {decodeStrategyOptions.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setDecodeType(opt.value)}
                          className={`p-2.5 rounded-lg border text-left transition-all ${
                            decodeType === opt.value
                              ? "border-apple-blue bg-apple-blue/5"
                              : "border-border/50 hover:border-apple-blue/30"
                          }`}
                        >
                          <div className={`text-xs font-medium ${
                            decodeType === opt.value ? "text-apple-blue" : "text-foreground"
                          }`}>
                            {opt.label}
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">{opt.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Input / Result Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full grid grid-cols-2 bg-secondary/50 p-1 rounded-xl">
                <TabsTrigger value="input" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  输入提示词
                </TabsTrigger>
                <TabsTrigger
                  value="result"
                  disabled={!result}
                  className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  优化结果
                </TabsTrigger>
              </TabsList>

              <TabsContent value="input" className="mt-4 space-y-4">
                <Card className="border-border/50 shadow-apple">
                  <CardContent className="pt-6">
                    <Textarea
                      placeholder="在这里粘贴你需要优化的提示词..."
                      value={originalPrompt}
                      onChange={(e) => setOriginalPrompt(e.target.value)}
                      className="min-h-[200px] resize-none border-border/50 focus-visible:ring-apple-blue/30 font-mono text-sm leading-relaxed"
                    />
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-xs text-muted-foreground">
                        {originalPrompt.length} / 5000 字符
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowHistory(!showHistory)}
                          className="rounded-lg border-border/50"
                        >
                          <History className="w-4 h-4 mr-2" />
                          历史记录
                        </Button>
                        <Button
                          onClick={handleOptimize}
                          disabled={isPending || !originalPrompt.trim()}
                          className="rounded-lg bg-apple-blue hover:bg-apple-blue-dark text-white"
                        >
                          {isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              {optimizeMode === "opro" ? "OPRO 优化中..." : "优化中..."}
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 mr-2" />
                              {optimizeMode === "opro" ? "启动 OPRO 优化" : "开始优化"}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="result" className="mt-4 space-y-4">
                {result && (
                  <>
                    {isOproResult ? (
                      /* OPRO Result */
                      <IterationTrajectory
                        result={oproMutation.data!}
                        baselinePrompt={originalPrompt}
                      />
                    ) : (
                      /* Static Result */
                      <>
                        {/* Improvements Badge */}
                        <div className="flex flex-wrap gap-2">
                          {result.improvements.map((improvement: string, idx: number) => (
                            <Badge
                              key={idx}
                              variant="secondary"
                              className="bg-apple-blue/10 text-apple-blue hover:bg-apple-blue/20 border-0"
                            >
                              {improvement}
                            </Badge>
                          ))}
                        </div>

                        {/* Diff View */}
                        <Card className="border-border/50 shadow-apple">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base font-medium">优化对比</CardTitle>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {result.technique}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCopy(result.optimizedPrompt)}
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
                            <DiffViewer
                              original={originalPrompt}
                              optimized={result.optimizedPrompt}
                            />
                          </CardContent>
                        </Card>
                      </>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setActiveTab("input")}
                        className="rounded-lg border-border/50"
                      >
                        继续优化
                      </Button>
                      <Button
                        onClick={() =>
                          handleCopy(
                            isOproResult
                              ? (result as { finalPrompt: string }).finalPrompt
                              : result.optimizedPrompt
                          )
                        }
                        className="rounded-lg bg-apple-blue hover:bg-apple-blue-dark text-white"
                      >
                        {copied ? (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            已复制
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 mr-2" />
                            复制优化结果
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* History Sidebar */}
          <div className={`${showHistory ? "block" : "hidden lg:block"}`}>
            <HistoryPanel
              history={historyData || []}
              onSelect={loadFromHistory}
              onRefresh={refetchHistory}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
