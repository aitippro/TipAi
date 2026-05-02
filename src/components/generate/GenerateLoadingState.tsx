import { useTranslation } from "react-i18next"
import { Check, Compass, Layers, Loader2, Sparkles, X, Zap } from "lucide-react"

type GenerateLoadingStateProps = {
  intent: string
  activeStep: number
  onClose: () => void
  inline?: boolean
}

const LOADING_STEPS = [
  { icon: Compass, labelKey: "generate.stepAnalyze", step: 1 },
  { icon: Layers, labelKey: "generate.stepFramework", step: 2 },
  { icon: Zap, labelKey: "generate.stepGenerate", step: 3 },
]

export function GenerateLoadingState({
  intent,
  activeStep,
  onClose,
  inline,
}: GenerateLoadingStateProps) {
  const { t } = useTranslation()
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
            <h2 className="text-sm font-semibold text-slate-800">{t("generate.loadingTitle")}</h2>
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

        <h3 className="text-xl font-semibold text-slate-800 mb-2">{t("generate.loadingTitle")}</h3>
        <p className="text-sm text-slate-400 mb-10">{t("generate.loadingDesc")}</p>

        <div className="space-y-3 w-full max-w-sm">
          {LOADING_STEPS.map(({ icon: Icon, labelKey, step }) => (
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
              <span className="text-sm font-medium">{t(labelKey)}</span>
              {activeStep === step && <Loader2 className="w-4 h-4 animate-spin ml-auto text-violet-400" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
