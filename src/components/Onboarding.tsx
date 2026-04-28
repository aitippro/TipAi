import { useState, useEffect, useCallback } from "react";
import { Wand2, Sparkles, Zap, Shield, ArrowRight, Check } from "lucide-react";

const STEPS = [
  {
    icon: Wand2,
    title: "欢迎使用 TipAi",
    subtitle: "智能提示词工程平台",
    description: "从模糊需求到精准提示词，AI 引导式工作流帮你完成每一步。",
    color: "from-violet-500 to-indigo-600",
    bg: "bg-violet-50",
  },
  {
    icon: Sparkles,
    title: "多模型 AI 驱动",
    subtitle: "Kimi · OpenAI · Claude · DeepSeek · Gemini · Ollama",
    description: "配置你的 API Key，选择模型，AI 自动为你生成和优化提示词。支持本地 Ollama，断网也能用。",
    color: "from-amber-500 to-orange-600",
    bg: "bg-amber-50",
  },
  {
    icon: Zap,
    title: "全生命周期管理",
    subtitle: "提示词开发六阶段流水线",
    description: "从需求澄清到部署维护，每个阶段的提示词都有归属。工作台看板让你一目了然。",
    color: "from-emerald-500 to-teal-600",
    bg: "bg-emerald-50",
  },
  {
    icon: Shield,
    title: "本地优先 · 数据安全",
    subtitle: "你的数据永远留在你的设备上",
    description: "所有数据存储在本地 SQLite，API Key 经 AES-256-GCM 加密。无需注册账号，离线也能工作。",
    color: "from-blue-500 to-cyan-600",
    bg: "bg-blue-50",
  },
];

interface Props {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(false);
    const t = setTimeout(() => setVisible(true), 200);
    return () => clearTimeout(t);
  }, [step]);

  const handleNext = useCallback(() => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      setExiting(true);
      setTimeout(onComplete, 500);
    }
  }, [step, onComplete]);

  const current = STEPS[step];
  const Icon = current.icon;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-500 ease-apple ${
        exiting ? "opacity-0 scale-110" : "opacity-100"
      }`}
    >
      {/* Blurred background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-violet-50" />

      {/* Animated background shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className={`absolute -top-40 -right-40 w-80 h-80 rounded-full bg-gradient-to-br ${current.color} opacity-[0.06] blur-3xl transition-all duration-1000`}
        />
        <div
          className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-gradient-to-tr ${current.color} opacity-[0.04] blur-3xl transition-all duration-1000"
        />
      </div>

      <div className="relative w-full max-w-lg mx-6">
        {/* Step indicators */}
        <div className="flex justify-center gap-2 mb-10">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`h-1.5 rounded-full transition-all duration-500 ease-apple ${
                i === step
                  ? `w-8 bg-gradient-to-r ${current.color}`
                  : i < step
                  ? "w-1.5 bg-slate-300"
                  : "w-1.5 bg-slate-200"
              }`}
            />
          ))}
        </div>

        {/* Card */}
        <div
          className={`bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-slate-200/50 border border-white/50 p-8 transition-all duration-500 ease-apple ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {/* Icon */}
          <div
            className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${current.color} flex items-center justify-center mb-6 shadow-lg transition-all duration-500`}
            style={{ boxShadow: `0 8px 32px rgba(99, 102, 241, 0.2)` }}
          >
            <Icon className="w-8 h-8 text-white" />
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-slate-900 mb-1 tracking-tight">
            {current.title}
          </h2>
          <p className="text-sm font-medium bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent mb-4">
            {current.subtitle}
          </p>
          <p className="text-sm text-slate-500 leading-relaxed">
            {current.description}
          </p>
        </div>

        {/* Bottom actions */}
        <div className="flex items-center justify-between mt-8 px-2">
          <button
            onClick={onComplete}
            className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
          >
            跳过
          </button>

          <button
            onClick={handleNext}
            className={`group flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r ${
              current.color
            } text-white font-medium text-sm shadow-lg hover:shadow-xl transition-all duration-250 ease-apple hover:scale-[1.02] active:scale-[0.98]`}
          >
            {step < STEPS.length - 1 ? (
              <>
                继续
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </>
            ) : (
              <>
                开始使用
                <Check className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

