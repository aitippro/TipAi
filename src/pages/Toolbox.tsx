import { useNavigate } from "react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Download, Key, Wand2, ArrowRight } from "lucide-react";

const TOOLS = [
  {
    id: "optimizer",
    title: "提示词优化器",
    description: "一键优化你的提示词，策略选择 + Diff 对比",
    icon: Zap,
    color: "text-amber-600",
    bg: "bg-amber-50",
    path: "/optimizer",
    available: true,
  },
  {
    id: "dynamic-prompt",
    title: "动态提示词生成",
    description: "AI 分析需求 → 生成调优选项 → 实时重生成",
    icon: Wand2,
    color: "text-violet-600",
    bg: "bg-violet-50",
    path: "/",
    available: true,
  },
  {
    id: "export",
    title: "批量导出",
    description: "JSON / Markdown 格式导出，筛选过滤",
    icon: Download,
    color: "text-blue-600",
    bg: "bg-blue-50",
    path: "/export",
    available: true,
  },
  {
    id: "api-keys",
    title: "API Key 管理",
    description: "多模型密钥管理 (AES-256-GCM 加密)",
    icon: Key,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    path: "/settings",
    available: true,
  },
  {
    id: "ollama",
    title: "Ollama 本地模型",
    description: "离线模式，断网也能用",
    icon: Zap,
    color: "text-slate-600",
    bg: "bg-slate-50",
    path: "/settings",
    available: true,
  },
];

export default function ToolboxPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">工具箱</h1>
        <p className="text-sm text-slate-400 mt-1">所有提示词工程工具集中管理</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          return (
            <Card
              key={tool.id}
              className="border-0 shadow-sm rounded-2xl bg-white/80 hover:shadow-md transition-all duration-250 ease-apple hover:scale-[1.01] cursor-pointer group"
              onClick={() => tool.available && navigate(tool.path)}
            >
              <CardContent className="p-5">
                <div className={`w-10 h-10 rounded-xl ${tool.bg} flex items-center justify-center mb-4`}>
                  <Icon className={`w-5 h-5 ${tool.color}`} />
                </div>
                <h3 className="font-semibold text-sm text-slate-800 mb-1">{tool.title}</h3>
                <p className="text-xs text-slate-400 mb-4">{tool.description}</p>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px]">
                    {tool.available ? "可用" : "即将上线"}
                  </Badge>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-violet-500 transition-colors" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
