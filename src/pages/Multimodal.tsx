import { useState, useRef } from "react";
import { useSearchParams } from "react-router";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Image,
  FileImage,
  Video,
  Wand2,
  Loader2,
  Copy,
  Check,
  Lightbulb,
  Sparkles,
  Upload,
  X,
} from "lucide-react";

const MODE_ICONS = {
  "text-to-image": Image,
  "image-to-text": FileImage,
  "video-storyboard": Video,
} as const;

const MODE_COLORS = {
  "text-to-image": "text-pink-500 bg-pink-50",
  "image-to-text": "text-blue-500 bg-blue-50",
  "video-storyboard": "text-amber-500 bg-amber-50",
} as const;

const MODE_LABELS = {
  "text-to-image": "文生图",
  "image-to-text": "图生文",
  "video-storyboard": "视频分镜",
} as const;

export default function MultimodalPage() {
  const [searchParams] = useSearchParams();
  const [request, setRequest] = useState("");
  const [mode, setMode] = useState<"text-to-image" | "image-to-text" | "video-storyboard">(() => {
    const urlMode = new URLSearchParams(window.location.search).get("mode");
    return (urlMode && ["text-to-image", "image-to-text", "video-storyboard"].includes(urlMode))
      ? urlMode as "text-to-image" | "image-to-text" | "video-storyboard"
      : "text-to-image";
  });
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);


  const modesQuery = trpc.multimodal.modes.useQuery();
  const generateMutation = trpc.multimodal.generate.useMutation();

  const handleGenerate = () => {
    if (!request.trim()) return;
    const expression = searchParams.get("expression") === "true";
    generateMutation.mutate({
      request: request.trim(),
      mode,
      imageData: imageData || undefined,
      expression,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("请上传图片文件");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageData(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageData(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const result = generateMutation.data;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-pink-500" />
          <h1 className="text-2xl font-semibold text-slate-900">多模态提示词</h1>
        </div>
        <p className="text-sm text-slate-400">
          为文生图、图生文、视频分镜等场景生成优化提示词
        </p>
      </div>

      {/* Mode Selector */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {(modesQuery.data ?? []).map((m) => {
          const Icon = MODE_ICONS[m.value as keyof typeof MODE_ICONS];
          const isActive = mode === m.value;
          return (
            <button
              key={m.value}
              onClick={() => setMode(m.value as typeof mode)}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all duration-200 ${
                isActive
                  ? "border-pink-200 bg-pink-50/50 ring-1 ring-pink-100"
                  : "border-slate-100 bg-white/80 hover:border-slate-200"
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${MODE_COLORS[m.value as keyof typeof MODE_COLORS]}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className={`text-sm font-medium ${isActive ? "text-pink-700" : "text-slate-600"}`}>
                {m.label}
              </span>
              <span className="text-[10px] text-slate-400 text-center leading-tight">
                {m.description}
              </span>
            </button>
          );
        })}
      </div>

      {/* Input */}
      <Card className="mb-8 border-0 shadow-sm rounded-2xl bg-white/80">
        <CardContent className="p-5">
          {mode === "image-to-text" && (
            <div className="mb-4">
              {!imageData ? (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-slate-200 hover:border-pink-300 hover:bg-pink-50/30 transition-colors"
                >
                  <Upload className="w-6 h-6 text-slate-400" />
                  <span className="text-sm text-slate-500">点击上传图片，AI 将直接分析图片内容</span>
                  <span className="text-xs text-slate-400">支持 JPG、PNG、GIF、WebP</span>
                </button>
              ) : (
                <div className="relative inline-block">
                  <img
                    src={imageData}
                    alt="Preview"
                    className="max-h-48 rounded-xl border border-slate-200 object-contain"
                  />
                  <button
                    onClick={handleRemoveImage}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center hover:bg-slate-700"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          )}

          <Textarea
            placeholder={
              mode === "text-to-image"
                ? "描述你想要生成的图像，例如：一只穿着宇航服的猫在月球上漫步"
                : mode === "image-to-text"
                  ? imageData
                    ? "补充你的分析需求（可选），例如：重点分析色彩搭配"
                    : "描述你想要分析的图像内容和目的，例如：分析这张产品图的设计亮点"
                  : "描述你的视频场景，例如：一个程序员在咖啡馆写代码，突然被窗外的流星吸引"
            }
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            className="min-h-[100px] resize-none rounded-xl border-slate-200 focus:border-pink-300 focus:ring-pink-200"
          />
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-3">
              {mode === "image-to-text" && imageData && (
                <Badge variant="outline" className="text-[10px] border-pink-200 text-pink-600">
                  <Sparkles className="w-3 h-3 mr-1" />
                  AI 视觉分析已启用
                </Badge>
              )}
              <span className="text-xs text-slate-400">
                {request.length}/2000 字符
              </span>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={!request.trim() || generateMutation.isPending}
              className="rounded-xl bg-pink-600 hover:bg-pink-700 text-white"
            >
              {generateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4 mr-2" />
              )}
              生成提示词
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Meta */}
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-xs">
              {MODE_LABELS[result.mode]}
            </Badge>
            <span className="text-xs text-slate-400">
              推荐模型: {result.recommendedModel}
            </span>
          </div>

          {/* Prompts */}
          <Tabs defaultValue="0" className="space-y-4">
            <TabsList className="rounded-xl bg-white/80 border border-slate-100">
              {result.generatedPrompts.map((p, i) => (
                <TabsTrigger key={i} value={String(i)} className="rounded-lg text-xs">
                  {p.title}
                </TabsTrigger>
              ))}
            </TabsList>

            {result.generatedPrompts.map((p, i) => (
              <TabsContent key={i} value={String(i)} className="space-y-4">
                <Card className="border-0 shadow-sm rounded-2xl bg-white/80">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold text-slate-800">
                        {p.title}
                      </CardTitle>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopy(p.prompt, i)}
                        className="h-8 w-8 p-0 rounded-lg"
                      >
                        {copiedIndex === i ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4 text-slate-400" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-slate-400">{p.purpose}</p>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-4">
                    <div className="p-4 rounded-xl bg-slate-50">
                      <pre className="text-xs text-slate-700 whitespace-pre-wrap font-mono leading-relaxed">
                        {p.prompt}
                      </pre>
                    </div>

                    {p.negativePrompt && (
                      <div>
                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                          Negative Prompt
                        </span>
                        <div className="p-3 rounded-xl bg-red-50 mt-1.5">
                          <code className="text-[11px] text-red-700">{p.negativePrompt}</code>
                        </div>
                      </div>
                    )}

                    {p.parameters && (
                      <div>
                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                          推荐参数
                        </span>
                        <div className="flex flex-wrap gap-2 mt-1.5">
                          {Object.entries(p.parameters).map(([k, v]) => (
                            <Badge
                              key={k}
                              variant="outline"
                              className="text-[11px] border-slate-200"
                            >
                              {k}: {v}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>

          {/* Tips */}
          <Card className="border-0 shadow-sm rounded-2xl bg-gradient-to-r from-amber-50/80 to-white ring-1 ring-amber-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                使用技巧
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-2">
                {result.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {tip}
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
