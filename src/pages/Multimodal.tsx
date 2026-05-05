import { useState, useRef } from "react";
import { useSearchParams } from "react-router";
import { trpc } from "@/providers/trpc";
import { toast } from "sonner";
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
  FileText,
  Palette,
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
    const urlMode = searchParams.get("mode");
    return (urlMode && ["text-to-image", "image-to-text", "video-storyboard"].includes(urlMode))
      ? urlMode as "text-to-image" | "image-to-text" | "video-storyboard"
      : "text-to-image";
  });
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileData, setFileData] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const modesQuery = trpc.multimodal.modes.useQuery();
  const generateMutation = trpc.multimodal.generate.useMutation({
    onError: (e) => toast.error(e.message || "生成失败，请检查 API Key 和网络"),
  });

  const handleGenerate = () => {
    if (!request.trim()) return;
    const expression = searchParams.get("expression") === "true";
    generateMutation.mutate({
      request: request.trim(),
      mode,
      imageData: imageData || undefined,
      expression,
      fileName: fileName ?? undefined,
      fileContent: fileContent ?? undefined,
      fileData: fileData ?? undefined,
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const ext = file.name.split(".").pop()?.toLowerCase();
    const reader = new FileReader();

    if (ext === "txt") {
      reader.onload = () => {
        setFileContent(reader.result as string);
        setFileData(null);
      };
      reader.readAsText(file);
    } else if (ext === "docx" || ext === "pdf") {
      reader.onload = () => {
        // Base64 encode for server-side parsing
        const bytes = new Uint8Array(reader.result as ArrayBuffer);
        const base64 = btoa(String.fromCharCode(...bytes));
        setFileData(base64);
        setFileContent(null);
      };
      reader.readAsArrayBuffer(file);
    } else {
      alert("请上传 .txt / .docx / .pdf 文件");
    }
  };

  const handleRemoveImage = () => {
    setImageData(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const handleRemoveFile = () => {
    setFileName(null);
    setFileContent(null);
    setFileData(null);
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
          {/* Image upload for text-to-image (reference) or image-to-text (analysis target) */}
          {(mode === "image-to-text" || mode === "text-to-image") && (
            <div className="mb-4">
              {!imageData ? (
                <button
                  onClick={() => imageInputRef.current?.click()}
                  className="w-full flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-slate-200 hover:border-pink-300 hover:bg-pink-50/30 transition-colors"
                >
                  <Upload className="w-6 h-6 text-slate-400" />
                  <span className="text-sm text-slate-500">
                    {mode === "text-to-image"
                      ? "上传参考图片，AI 将参考其风格生成提示词"
                      : "点击上传图片，AI 将直接分析图片内容"}
                  </span>
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
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
            </div>
          )}

          {/* File upload for video-storyboard */}
          {mode === "video-storyboard" && (
            <div className="mb-4">
              {!fileName ? (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-slate-200 hover:border-amber-300 hover:bg-amber-50/30 transition-colors"
                >
                  <FileText className="w-6 h-6 text-slate-400" />
                  <span className="text-sm text-slate-500">
                    上传小说/脚本文件，AI 将分析风格并生成带表情控制的分镜脚本
                  </span>
                  <span className="text-xs text-slate-400">支持 .txt / .docx</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <FileText className="w-4 h-4 text-amber-600" />
                  <span className="text-sm text-amber-800 flex-1">{fileName}</span>
                  <Badge variant="outline" className="text-[10px] border-amber-200 text-amber-600">
                    {(fileContent ?? fileData) ? "已加载" : "加载中"}
                  </Badge>
                  <button
                    onClick={handleRemoveFile}
                    className="w-5 h-5 rounded-full bg-amber-200 text-amber-700 flex items-center justify-center hover:bg-amber-300"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.docx"
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
                  : fileName
                    ? "补充分镜创意说明（可选），例如：每镜 3-5 秒，主角为女性"
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
              {mode === "text-to-image" && imageData && (
                <Badge variant="outline" className="text-[10px] border-pink-200 text-pink-600">
                  <Palette className="w-3 h-3 mr-1" />
                  参考图片已上传
                </Badge>
              )}
              {fileName && (
                <Badge variant="outline" className="text-[10px] border-amber-200 text-amber-600">
                  <FileText className="w-3 h-3 mr-1" />
                  {fileName}
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
            {result.fileName && (
              <span className="text-xs text-slate-400">
                文件: {result.fileName}
              </span>
            )}
          </div>

          {/* Style Analysis Panel */}
          {result.styleAnalysis && (
            <Card className="border-0 shadow-sm rounded-2xl bg-gradient-to-r from-purple-50/80 to-white ring-1 ring-purple-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <Palette className="w-4 h-4 text-purple-500" />
                  风格分析
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="p-3 rounded-xl bg-white/80">
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">主要风格</span>
                    <p className="text-xs font-medium text-slate-700 mt-1">{result.styleAnalysis.primaryStyle}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/80">
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">色彩倾向</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {result.styleAnalysis.colorPalette.map((c) => (
                        <Badge key={c} variant="outline" className="text-[10px] border-purple-200 text-purple-700">{c}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/80">
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">情绪基调</span>
                    <p className="text-xs font-medium text-slate-700 mt-1">{result.styleAnalysis.mood}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/80">
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">题材类型</span>
                    <p className="text-xs font-medium text-slate-700 mt-1">{result.styleAnalysis.genre}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/80">
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">叙事节奏</span>
                    <p className="text-xs font-medium text-slate-700 mt-1">{result.styleAnalysis.pacing}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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

                    {/* Expression Controls Panel */}
                    {p.expressionControls && (
                      <div>
                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                          表情控制面板
                        </span>
                        <Card className="mt-1.5 border border-amber-200 rounded-xl bg-amber-50/50">
                          <CardContent className="p-4 space-y-3">
                            <div className="grid grid-cols-2 gap-3 text-[11px]">
                              <div>
                                <span className="text-slate-400">情感权重</span>
                                <p className="font-medium text-slate-700">{p.expressionControls.sentimentWeight}</p>
                              </div>
                              <div>
                                <span className="text-slate-400">噪声振幅</span>
                                <p className="font-medium text-slate-700">{p.expressionControls.noiseAmplitude}</p>
                              </div>
                              <div>
                                <span className="text-slate-400">噪声种子</span>
                                <p className="font-medium text-slate-700 font-mono">{p.expressionControls.noiseSeed}</p>
                              </div>
                              <div>
                                <span className="text-slate-400">导出格式</span>
                                <p className="font-medium text-slate-700">{p.expressionControls.exportFormats.join(" / ")}</p>
                              </div>
                            </div>
                            {p.expressionControls.punctuationMap.length > 0 && (
                              <div>
                                <span className="text-[10px] text-slate-400">标点 → AU 映射</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {p.expressionControls.punctuationMap.map((pm, pi) => (
                                    <Badge key={pi} variant="outline" className="text-[10px] border-amber-200 text-amber-700">
                                      {pm.punctuation} → {pm.auCodes.join("+")} ({pm.gazeState})
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
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
