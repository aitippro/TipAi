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
import { DiffViewer } from "@/components/optimizer/DiffViewer";
import { HistoryPanel } from "@/components/optimizer/HistoryPanel";
import { Sparkles, History, Copy, Check, Zap, Layers, Minimize2, Loader2, ArrowLeft } from "lucide-react";

type Strategy = "general" | "structured" | "concise";

interface StrategyOption {
  value: Strategy;
  label: string;
  description: string;
  icon: typeof Zap;
}

const strategies: StrategyOption[] = [
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

export default function Optimizer() {
  const [originalPrompt, setOriginalPrompt] = useState("");
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy>("general");
  const [activeTab, setActiveTab] = useState("input");
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const optimizeMutation = trpc.optimizer.optimize.useMutation({
    onSuccess: () => {
      setActiveTab("result");
      toast.success("提示词优化完成！");
    },
    onError: (error) => {
      toast.error(error.message || "优化失败，请重试");
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

    optimizeMutation.mutate({
      prompt: originalPrompt.trim(),
      domain: "general",
      strategy: selectedStrategy,
    });
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
      setSelectedStrategy(item.strategy as Strategy);
    }
    setShowHistory(false);
    toast.success("已加载历史记录");
  };

  const result = optimizeMutation.data;

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
            {/* Strategy Selection */}
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
                  {strategies.map((strategy) => {
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
                          disabled={optimizeMutation.isPending || !originalPrompt.trim()}
                          className="rounded-lg bg-apple-blue hover:bg-apple-blue-dark text-white"
                        >
                          {optimizeMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              优化中...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 mr-2" />
                              开始优化
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
                    {/* Improvements Badge */}
                    <div className="flex flex-wrap gap-2">
                      {result.improvements.map((improvement, idx) => (
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
                        onClick={() => handleCopy(result.optimizedPrompt)}
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
