import { Check, Compass, Layers, Loader2, Sparkles, X, Zap } from "lucide-react"

type GenerateLoadingStateProps = {
  intent: string
  activeStep: number
  onClose: () => void
  inline?: boolean
}

const LOADING_STEPS = [
  { icon: Compass, text: "分析意图与场景", step: 1 },
  { icon: Layers, text: "匹配最佳框架", step: 2 },
  { icon: Zap, text: "生成完美提示词", step: 3 },
]

export function GenerateLoadingState({
  intent,
  activeStep,
  onClose,
  inline,
}: GenerateLoadingStateProps) {
  const wrapperCls = inline
    ? "bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden"
    : "fixed inset-0 z-[100] bg-white/95 backdrop-blur-md flex flex-col"
  return (
    <div className={wrapperCls}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800">生成提示词</h2>
            <p className="text-xs text-slate-400 truncate max-w-md">{intent}</p>
          </div>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors">
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="relative w-24 h-24 mb-10">
          <div className="absolute inset-0 rounded-full bg-violet-100/60 animate-ping" />
          <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center pulse-glow">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
        </div>

        <h3 className="text-xl font-semibold text-slate-800 mb-2">AI 正在为你生成提示词...</h3>
        <p className="text-sm text-slate-400 mb-10">自动分析意图 · 匹配框架 · 生成内容</p>

        <div className="space-y-3 w-full max-w-sm">
          {LOADING_STEPS.map(({ icon: Icon, text, step }) => (
            <div
              key={step}
              className={`flex items-center gap-3 p-4 rounded-2xl transition-all duration-700 ${
                activeStep === step
                  ? "bg-violet-50 text-violet-800 shadow-sm"
                  : activeStep > step
                  ? "text-slate-400"
                  : "text-slate-300"
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all ${
                activeStep === step
                  ? "bg-violet-600 text-white"
                  : activeStep > step
                  ? "bg-emerald-50 text-emerald-500"
                  : "bg-slate-100 text-slate-300"
              }`}>
                {activeStep > step ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
              </div>
              <span className="text-sm font-medium">{text}</span>
              {activeStep === step && <Loader2 className="w-4 h-4 animate-spin ml-auto text-violet-400" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
