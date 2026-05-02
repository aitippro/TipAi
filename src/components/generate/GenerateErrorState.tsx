import { useTranslation } from "react-i18next"
import { RotateCcw, X, Zap } from "lucide-react"

import { Button } from "@/components/ui/button"

type GenerateErrorStateProps = {
  errorMsg: string
  onClose: () => void
  onRetry: () => void
}

export function GenerateErrorState({
  errorMsg,
  onClose,
  onRetry,
}: GenerateErrorStateProps) {
  const { t } = useTranslation()
  return (
    <div className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-md flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <h2 className="text-sm font-semibold text-slate-800">{t("generate.loadingTitle")}</h2>
        <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
          <Zap className="w-8 h-8 text-red-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-800 mb-2">{t("generate.errorTitle")}</h3>
        <p className="text-sm text-slate-400 mb-6 max-w-md text-center">{errorMsg}</p>
        <div className="flex gap-3">
          <Button onClick={onRetry} variant="outline" className="rounded-xl">
            <RotateCcw className="w-4 h-4 mr-2" />
            {t("generate.retry")}
          </Button>
          <Button onClick={onClose} className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600">
            {t("generate.backToEdit")}
          </Button>
        </div>
      </div>
    </div>
  )
}
