import { useNavigate } from "react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Download, Key, ArrowRight } from "lucide-react";
import { TiltCard } from "@/components/effects/TiltCard";
import { ScrollReveal } from "@/components/effects/ScrollReveal";
import { StaggerContainer, StaggerItem } from "@/components/effects/StaggerContainer";

const TOOLS = [
  {
    id: "optimizer",
    title: "提示词优化器",
    description: "一键优化你的提示词，策略选择 + Diff 对比",
    icon: Zap,
    color: "text-amber-600",
    bg: "from-amber-500/10 to-orange-500/10",
    path: "/optimizer",
    available: true,
  },
  {
    id: "dynamic-prompt",
    title: "动态提示词生成",
    description: "AI 分析需求 → 生成调优选项 → 实时重生成",
    icon: Wand2,
    color: "text-violet-600",
    bg: "from-violet-500/10 to-purple-500/10",
    path: "/",
    available: true,
  },
  {
    id: "export",
    title: "批量导出",
    description: "JSON / Markdown 格式导出，筛选过滤",
    icon: Download,
    color: "text-blue-600",
    bg: "from-blue-500/10 to-cyan-500/10",
    path: "/export",
    available: true,
  },
  {
    id: "api-keys",
    title: "API Key 管理",
    description: "多模型密钥管理 (AES-256-GCM 加密)",
    icon: Key,
    color: "text-emerald-600",
    bg: "from-emerald-500/10 to-teal-500/10",
    path: "/settings",
    available: true,
  },
  {
    id: "ollama",
    title: "Ollama 本地模型",
    description: "离线模式，断网也能用",
    icon: Zap,
    color: "text-slate-600",
    bg: "from-slate-500/10 to-gray-500/10",
    path: "/settings",
    available: true,
  },
];

export default function ToolboxPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-5xl mx-auto px-6 py-14">
      <ScrollReveal>
        <div className="mb-10">
          <h1 className="text-3xl font-semibold text-slate-900 mb-1">工具箱</h1>
          <p className="text-sm text-slate-400">提示词相关的辅助工具集合</p>
        </div>
      </ScrollReveal>

      <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {TOOLS.map((tool) => (
          <StaggerItem key={tool.id}>
            <TiltCard maxTilt={8} scale={1.02}>
              <button
                onClick={() => navigate(tool.path)}
                className={`w-full text-left p-5 rounded-2xl bg-gradient-to-br ${tool.bg} border border-white/40 backdrop-blur-sm hover:shadow-lg transition-shadow`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center ${tool.color}`}>
                    <tool.icon className="w-5 h-5" />
                  </div>
                  {!tool.available && (
                    <Badge variant="outline" className="text-[10px] bg-white/60">即将上线</Badge>
                  )}
                </div>
                <h3 className="text-base font-semibold text-slate-800 mb-1">{tool.title}</h3>
                <p className="text-sm text-slate-500 mb-3">{tool.description}</p>
                <div className="flex items-center text-xs text-slate-400 font-medium group">
                  <span className="group-hover:text-apple-blue transition-colors">打开工具</span>
                  <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            </TiltCard>
          </StaggerItem>
        ))}
      </StaggerContainer>
    </div>
  );
}
