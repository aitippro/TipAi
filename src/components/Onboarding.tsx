import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/providers/trpc";
import { Input } from "@/components/ui/input";
import {
  Wand2, Sparkles, Zap, Shield, ArrowRight, Check, Eye, EyeOff,
  Key, Globe, Database,
} from "lucide-react";

const API_MODELS = [
  { key: "kimi", name: "Kimi", placeholder: "sk-...", icon: Sparkles, color: "#7c3aed", site: "platform.moonshot.cn" },
  { key: "openai", name: "OpenAI", placeholder: "sk-...", icon: Globe, color: "#059669", site: "platform.openai.com" },
  { key: "claude", name: "Claude", placeholder: "sk-ant-...", icon: Shield, color: "#ea580c", site: "console.anthropic.com" },
  { key: "deepseek", name: "DeepSeek", placeholder: "sk-...", icon: Database, color: "#2563eb", site: "platform.deepseek.com" },
];

const STEPS = [
  { icon: Wand2, title: "欢迎使用 TipAi", subtitle: "智能提示词工程平台", color: "#7c3aed" },
  { icon: Zap, title: "AI 模型接入", subtitle: "配置你的 API Key", color: "#f59e0b" },
  { icon: Shield, title: "本地安全", subtitle: "你的数据永远留在本地", color: "#059669" },
];

interface Props { onComplete: () => void }

export function Onboarding({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const updateSettings = trpc.promptForge.updateSettings.useMutation();

  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(false);
    const t = setTimeout(() => setVisible(true), 250);
    return () => clearTimeout(t);
  }, [step]);

  const handleSaveKeys = useCallback(async () => {
    setSaving(true);
    try {
      const payload: Record<string, string> = {};
      Object.entries(keys).forEach(([k, v]) => { if (v?.trim()) payload[`${k}ApiKey`] = v.trim(); });
      if (Object.keys(payload).length > 0) {
        await updateSettings.mutateAsync(payload);
      }
    } catch { /* optional */ }
    setSaving(false);
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      setExiting(true);
      setTimeout(onComplete, 600);
    }
  }, [keys, step, onComplete, updateSettings]);

  const handleNext = () => {
    if (step < STEPS.length - 1) { setStep(s => s + 1); }
    else { handleSaveKeys(); }
  };

  const toggleShow = (k: string) => setShowKeys(p => ({ ...p, [k]: !p[k] }));
  const current = STEPS[step];
  const Icon = current.icon;
  const filledCount = Object.values(keys).filter(v => v?.trim()).length;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-600 ${exiting ? "opacity-0 scale-105 blur-sm" : "opacity-100"}`}>
      <div className="absolute inset-0 transition-all duration-1000" style={{ background: `linear-gradient(135deg, ${current.color}08 0%, #f8fafc 50%, ${current.color}04 100%)` }} />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[600px] h-[600px] rounded-full blur-[120px] transition-all duration-1000" style={{ background: `${current.color}10`, top: '10%', left: '50%', transform: 'translate(-50%, -50%)' }} />
      </div>
      <div className="relative w-full max-w-[440px] mx-6">
        <div className="flex justify-center gap-2 mb-8">
          {STEPS.map((_, i) => (
            <button key={i} onClick={() => i < step && setStep(i)} className="relative h-1 rounded-full transition-all duration-500"
              style={{ width: i === step ? 32 : 8, background: i === step ? current.color : i < step ? '#cbd5e1' : '#e2e8f0' }} />
          ))}
        </div>
        <div className={`bg-white/70 backdrop-blur-2xl rounded-[28px] shadow-2xl border border-white/20 p-8 transition-all duration-600 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
          style={{ boxShadow: `0 25px 80px ${current.color}15, 0 0 0 1px rgba(255,255,255,0.5) inset` }}>

          {step === 0 && (
            <div className="text-center">
              <div className="w-[72px] h-[72px] rounded-[22px] flex items-center justify-center mb-6 mx-auto"
                style={{ background: `linear-gradient(135deg, ${current.color}, ${current.color}dd)`, boxShadow: `0 16px 48px ${current.color}30` }}>
                <Icon className="w-9 h-9 text-white" />
              </div>
              <h2 className="text-[28px] font-bold text-slate-900 tracking-tight mb-2">欢迎使用 TipAi</h2>
              <p className="text-[15px] text-slate-500 mb-2">智能提示词工程平台</p>
              <p className="text-sm text-slate-400 leading-relaxed max-w-xs mx-auto">从模糊需求到精准提示词，AI 引导式工作流帮你完成每一步。</p>
            </div>
          )}

          {step === 1 && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-11 h-11 rounded-[16px] flex items-center justify-center shrink-0"
                  style={{ background: `linear-gradient(135deg, ${current.color}, ${current.color}dd)`, boxShadow: `0 8px 24px ${current.color}25` }}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">AI 模型接入</h2>
                  <p className="text-[13px] text-slate-400">配置 API Key，立即开始使用</p>
                </div>
                {filledCount > 0 && <span className="ml-auto text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: `${current.color}10`, color: current.color }}>{filledCount}/4</span>}
              </div>
              <div className="space-y-2.5">
                {API_MODELS.map((model) => {
                  const MI = model.icon;
                  const hasKey = !!keys[model.key]?.trim();
                  const show = showKeys[model.key];
                  return (
                    <div key={model.key} className="relative group rounded-2xl transition-all duration-300 border"
                      style={{ background: hasKey ? `${model.color}06` : '#f8fafc', borderColor: hasKey ? `${model.color}20` : '#f1f5f9' }}>
                      <div className="flex items-center gap-3 px-4 py-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${model.color}10` }}>
                          <MI className="w-4 h-4" style={{ color: model.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-slate-800">{model.name}</p>
                          <p className="text-[11px] text-slate-400 truncate">{hasKey ? (show ? keys[model.key] : '••••••••') : model.site}</p>
                        </div>
                        <div className="relative flex-1 max-w-[180px]">
                          <Input type={show ? "text" : "password"} placeholder={model.placeholder}
                            value={keys[model.key] || ""} onChange={e => setKeys(p => ({ ...p, [model.key]: e.target.value }))}
                            className="h-8 text-xs rounded-xl border-slate-200 pr-8" />
                          <button onClick={() => toggleShow(model.key)} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-md hover:bg-slate-100 transition-colors">
                            {show ? <EyeOff className="w-3 h-3 text-slate-400" /> : <Eye className="w-3 h-3 text-slate-400" />}
                          </button>
                        </div>
                        {hasKey && <Check className="w-4 h-4 shrink-0" style={{ color: model.color }} />}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-400 mt-4 text-center flex items-center justify-center gap-1">
                <Shield className="w-3 h-3" /> Key 经 AES-256-GCM 加密后存储在本地 SQLite
              </p>
            </>
          )}

          {step === 2 && (
            <div className="text-center">
              <div className="w-[72px] h-[72px] rounded-[22px] flex items-center justify-center mb-6 mx-auto"
                style={{ background: `linear-gradient(135deg, ${current.color}, ${current.color}dd)`, boxShadow: `0 16px 48px ${current.color}30` }}>
                <Icon className="w-9 h-9 text-white" />
              </div>
              <h2 className="text-[28px] font-bold text-slate-900 tracking-tight mb-2">本地安全</h2>
              <p className="text-[15px] text-slate-500 mb-4">你的数据永远留在你的设备上</p>
              <div className="space-y-3">
                {[{ icon: Shield, text: '所有数据存储在本地 SQLite' }, { icon: Key, text: 'API Key 经 AES-256-GCM 加密' }, { icon: Globe, text: '可选 Ollama 本地模型，完全离线' }].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: `${current.color}06` }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${current.color}10` }}>
                      <item.icon className="w-4 h-4" style={{ color: current.color }} />
                    </div>
                    <span className="text-[14px] font-medium text-slate-700">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-6 px-1">
          <button onClick={onComplete} className="text-[13px] text-slate-400 hover:text-slate-600 transition-colors px-3 py-2">以后再说</button>
          <button onClick={handleNext} disabled={saving}
            className="group flex items-center gap-2 px-6 py-3 rounded-2xl text-white font-medium text-[14px] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            style={{ background: `linear-gradient(135deg, ${current.color}, ${current.color}dd)`, boxShadow: `0 8px 32px ${current.color}30` }}>
            {saving ? (
              <span className="flex items-center gap-2"><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>保存中...</span>
            ) : step < STEPS.length - 1 ? (<><ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" /> 继续</>)
            : (<><Check className="w-4 h-4" /> 开始使用</>)}
          </button>
        </div>
      </div>
    </div>
  );
}
