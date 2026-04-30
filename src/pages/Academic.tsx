import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen,
  Loader2,
  Quote,
  FileText,
  Copy,
  Check,
  Sparkles,
  Download,
} from "lucide-react";

export default function AcademicPage() {
  const [citationText, setCitationText] = useState("");
  const [citationFormat, setCitationFormat] = useState<"apa" | "mla" | "gb7714" | "ieee" | "chicago">("apa");
  const [copied, setCopied] = useState(false);

  const formatsQuery = trpc.academic.formats.useQuery();
  const citationsQuery = trpc.academic.citations.useQuery(
    { text: citationText.trim(), format: citationFormat },
    { enabled: !!citationText.trim() }
  );

  const handleGenerateCitations = () => {
    if (!citationText.trim()) return;
    citationsQuery.refetch();
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="w-5 h-5 text-sky-500" />
          <h1 className="text-2xl font-semibold text-slate-900">学术合作</h1>
        </div>
        <p className="text-sm text-slate-400">
          引用生成与实验复现报告工具
        </p>
      </div>

      <Tabs defaultValue="citations" className="space-y-6">
        <TabsList className="rounded-xl bg-white/80 border border-slate-100">
          <TabsTrigger value="citations" className="rounded-lg text-xs">
            <Quote className="w-3.5 h-3.5 mr-1.5" />
            引用生成
          </TabsTrigger>
          <TabsTrigger value="repro" className="rounded-lg text-xs">
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            实验复现
          </TabsTrigger>
        </TabsList>

        {/* Citations Tab */}
        <TabsContent value="citations" className="space-y-6">
          <Card className="border-0 shadow-sm rounded-2xl bg-white/80">
            <CardContent className="p-5 space-y-4">
              <Textarea
                placeholder="粘贴你的提示词或论文摘要，系统将提取关键词并生成学术引用..."
                value={citationText}
                onChange={(e) => setCitationText(e.target.value)}
                className="min-h-[120px] resize-none rounded-xl border-slate-200 focus:border-sky-300 focus:ring-sky-200"
              />

              {/* Format Selector */}
              <div className="flex flex-wrap gap-2">
                {(formatsQuery.data ?? []).map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setCitationFormat(f.value as typeof citationFormat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      citationFormat === f.value
                        ? "border-sky-200 bg-sky-50 text-sky-700"
                        : "border-slate-100 bg-white text-slate-500 hover:border-slate-200"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <Button
                onClick={handleGenerateCitations}
                disabled={!citationText.trim() || citationsQuery.isFetching}
                className="rounded-xl bg-sky-600 hover:bg-sky-700 text-white"
              >
                {citationsQuery.isFetching ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Quote className="w-4 h-4 mr-2" />
                )}
                生成引用
              </Button>
            </CardContent>
          </Card>

          {citationsQuery.data && (
            <div className="space-y-4">
              {/* Keywords */}
              <div className="flex flex-wrap gap-1.5">
                {citationsQuery.data.extractedKeywords.map((kw) => (
                  <Badge key={kw} variant="secondary" className="text-[11px]">
                    {kw}
                  </Badge>
                ))}
              </div>

              {/* Citations */}
              {citationsQuery.data.citations.map((cite, i) => (
                <Card key={i} className="border-0 shadow-sm rounded-2xl bg-white/80">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <Badge variant="outline" className="text-[10px] mb-2">
                          [{i + 1}]
                        </Badge>
                        <p className="text-sm text-slate-700 leading-relaxed">{cite}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopy(cite)}
                        className="shrink-0 h-8 w-8 p-0 rounded-lg"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4 text-slate-400" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Reproducibility Tab */}
        <TabsContent value="repro" className="space-y-6">
          <ReproducibilityPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ReproducibilityPanel() {
  const [title, setTitle] = useState("");
  const [steps, setSteps] = useState([
    { description: "", prompt: "", output: "" },
  ]);
  const [reportMd, setReportMd] = useState("");

  const reproQuery = trpc.academic.reproducibility.useQuery(
    {
      title: title.trim() || "实验报告",
      steps: steps.map((s, i) => ({
        step: i + 1,
        description: s.description || `步骤 ${i + 1}`,
        prompt: s.prompt || "",
        output: s.output || "",
        parameters: {},
      })),
    },
    { enabled: false }
  );

  const addStep = () => {
    setSteps([...steps, { description: "", prompt: "", output: "" }]);
  };

  const updateStep = (idx: number, field: string, value: string) => {
    setSteps(steps.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  };

  const generateReport = async () => {
    const result = await reproQuery.refetch();
    if (result.data?.markdown) {
      setReportMd(result.data.markdown);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm rounded-2xl bg-white/80">
        <CardContent className="p-5 space-y-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="实验标题"
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-sky-300 focus:outline-none"
          />

          {steps.map((step, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-slate-50 space-y-3">
              <span className="text-xs font-medium text-slate-400">步骤 {idx + 1}</span>
              <input
                value={step.description}
                onChange={(e) => updateStep(idx, "description", e.target.value)}
                placeholder="步骤描述"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-sky-300 focus:outline-none"
              />
              <Textarea
                value={step.prompt}
                onChange={(e) => updateStep(idx, "prompt", e.target.value)}
                placeholder="提示词"
                className="min-h-[60px] resize-none rounded-xl border-slate-200 text-sm"
              />
              <Textarea
                value={step.output}
                onChange={(e) => updateStep(idx, "output", e.target.value)}
                placeholder="输出结果"
                className="min-h-[60px] resize-none rounded-xl border-slate-200 text-sm"
              />
            </div>
          ))}

          <div className="flex gap-2">
            <Button variant="outline" onClick={addStep} className="rounded-xl text-xs">
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              添加步骤
            </Button>
            <Button onClick={generateReport} className="rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs">
              <FileText className="w-3.5 h-3.5 mr-1" />
              生成报告
            </Button>
          </div>
        </CardContent>
      </Card>

      {reportMd && (
        <Card className="border-0 shadow-sm rounded-2xl bg-white/80">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-800">复现报告</CardTitle>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  const blob = new Blob([reportMd], { type: "text/markdown" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${title || "report"}.md`;
                  a.click();
                }}
                className="h-8 rounded-lg text-xs"
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                下载 Markdown
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="p-4 rounded-xl bg-slate-50 font-mono text-xs text-slate-600 whitespace-pre-wrap leading-relaxed max-h-[400px] overflow-y-auto">
              {reportMd}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
