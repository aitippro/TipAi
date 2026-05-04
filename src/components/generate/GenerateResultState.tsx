import { useTranslation } from "react-i18next"
import {
  ArrowDownToLine,
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  Copy,
  Lightbulb,
  Layers,
  RotateCcw,
  Sparkles,
  Star,
  Target,
  Users,
  X,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import type { GenResult } from "./types"
import { COMPLEXITY_COLORS, COMPLEXITY_LABELS } from "./utils"

type GenerateResultStateProps = {
  intent: string
  result: GenResult
  activeTab: number
  copiedIndex: number | null
  savedIds: Set<number>
  isSaving: boolean
  onClose: () => void
  onOpenLibrary: () => void
  onRegenerate: () => void
  onActiveTabChange: (index: number) => void
  onCopy: (text: string, index: number) => void
  onSave: (index: number) => void
}

export function GenerateResultState({
  intent,
  result,
  activeTab,
  copiedIndex,
  savedIds,
  isSaving,
  onClose,
  onOpenLibrary,
  onRegenerate,
  onActiveTabChange,
  onCopy,
  onSave,
}: GenerateResultStateProps) {
  const { t } = useTranslation()
  const activeResult = result.results[activeTab] || result.results[0]

  if (!activeResult) return null

  return (
    <div className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-md flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <Check className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800">{t("generate.resultTitle")}</h2>
            <p className="text-xs text-slate-400 truncate max-w-md">{intent}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={onRegenerate} className="rounded-lg text-slate-500 hover:text-violet-600">
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            {t("prompt.regenerate")}
          </Button>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="p-4 rounded-2xl bg-violet-50/50 border border-violet-100">
              <div className="flex items-center gap-2 mb-1.5">
                <Target className="w-3.5 h-3.5 text-violet-500" />
                <span className="text-xs text-slate-400">{t("prompt.goal")}</span>
              </div>
              <p className="text-sm font-medium text-slate-800 truncate">{result.analysis.goal || t("common.unknown")}</p>
            </div>
            <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100">
              <div className="flex items-center gap-2 mb-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
                <span className="text-xs text-slate-400">{t("prompt.domain")}</span>
              </div>
              <p className="text-sm font-medium text-slate-800">{result.analysis.domain || t("common.general")}</p>
            </div>
            <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100">
              <div className="flex items-center gap-2 mb-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-500" />
                <span className="text-xs text-slate-400">{t("prompt.complexity")}</span>
              </div>
              <Badge variant="outline" className={`text-xs ${COMPLEXITY_COLORS[result.analysis.complexity] || ""}`}>
                {COMPLEXITY_LABELS[result.analysis.complexity] || result.analysis.complexity || "未知"}
              </Badge>
            </div>
            <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100">
              <div className="flex items-center gap-2 mb-1.5">
                <Users className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs text-slate-400">{t("prompt.audience")}</span>
              </div>
              <p className="text-sm font-medium text-slate-800 truncate">{result.analysis.audience || t("common.unspecified")}</p>
            </div>
          </div>

          {result.results.length > 1 && (
            <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
              {result.results.map((item, index) => (
                <button
                  key={`${item.framework}-${index}`}
                  onClick={() => onActiveTabChange(index)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all whitespace-nowrap ${
                    activeTab === index
                      ? "bg-violet-100 text-violet-800 border border-violet-200 shadow-sm"
                      : "bg-slate-50 text-slate-500 border border-transparent hover:border-slate-200"
                  }`}
                >
                  {index === 0 && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
                  {item.framework || `${t("common.plan")} ${index + 1}`}
                </button>
              ))}
            </div>
          )}

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-slate-800 mb-1">{activeResult.title || t("generate.resultTitle")}</h3>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs bg-violet-50 text-violet-700 border-violet-200">
                    {activeResult.framework || "通用"}
                  </Badge>
                  {result.slashCmd && (
                    <Badge variant="outline" className="text-xs">
                      {result.slashCmd.name}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onCopy(activeResult.prompt, activeTab)}
                  className="rounded-xl border-slate-200"
                >
                  {copiedIndex === activeTab ? <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                  {copiedIndex === activeTab ? t("common.copied") : t("common.copy")}
                </Button>
                <Button
                  size="sm"
                  onClick={() => onSave(activeTab)}
                  disabled={savedIds.has(activeTab) || isSaving}
                  className={`rounded-xl ${savedIds.has(activeTab) ? "bg-emerald-600 hover:bg-emerald-700" : "bg-gradient-to-r from-violet-600 to-indigo-600"}`}
                >
                  {savedIds.has(activeTab) ? (
                    <>
                      <Check className="w-3.5 h-3.5 mr-1.5" />
                      已入库
                    </>
                  ) : (
                    <>
                      <ArrowDownToLine className="w-3.5 h-3.5 mr-1.5" />
                      保存到库
                    </>
                  )}
                </Button>
              </div>
            </div>

            {activeResult.explanation && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium text-slate-700">{t("prompt.explanation")}</span>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed">{activeResult.explanation}</p>
              </div>
            )}

            {/* English Prompt */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{t("prompt.englishPrompt")}</span>
                <span className="text-[10px] text-slate-300">{t("prompt.copyTip")}</span>
              </div>
              <div className="relative group">
                <div className="code-block rounded-2xl p-6 overflow-x-auto">
                  <pre className="text-sm whitespace-pre-wrap leading-relaxed text-slate-200">{activeResult.prompt || t("prompt.emptyContent")}</pre>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute top-4 right-4 h-8 text-xs opacity-0 group-hover:opacity-100 transition-all bg-white/90 text-slate-800 hover:bg-white rounded-lg shadow-lg"
                  onClick={() => onCopy(activeResult.prompt, activeTab)}
                >
                  {copiedIndex === activeTab ? <Check className="w-3 h-3 mr-1 text-emerald-500" /> : <Copy className="w-3 h-3 mr-1" />}
                  {copiedIndex === activeTab ? t("common.copied") : t("prompt.copyEnglish")}
                </Button>
              </div>
            </div>

            {/* Chinese Translation / Breakdown */}
            {activeResult.promptTranslation && (
              <div className="space-y-3">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{t("prompt.chineseExplanation")}</span>
                <div className="p-5 rounded-2xl bg-slate-50/50 border border-slate-100">
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{activeResult.promptTranslation}</p>
                </div>

                {activeResult.breakdown && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeResult.breakdown.role && (
                      <div className="p-3 rounded-xl bg-white border border-slate-100">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider">Role</span>
                        <p className="text-sm text-slate-700 mt-0.5">{activeResult.breakdown.role}</p>
                      </div>
                    )}
                    {activeResult.breakdown.task && (
                      <div className="p-3 rounded-xl bg-white border border-slate-100">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider">Task</span>
                        <p className="text-sm text-slate-700 mt-0.5">{activeResult.breakdown.task}</p>
                      </div>
                    )}
                    {activeResult.breakdown.format && (
                      <div className="p-3 rounded-xl bg-white border border-slate-100">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider">Format</span>
                        <p className="text-sm text-slate-700 mt-0.5">{activeResult.breakdown.format}</p>
                      </div>
                    )}
                    {activeResult.breakdown.examples && (
                      <div className="p-3 rounded-xl bg-white border border-slate-100">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider">Examples</span>
                        <p className="text-sm text-slate-700 mt-0.5">{activeResult.breakdown.examples}</p>
                      </div>
                    )}
                    {activeResult.breakdown.constraints.length > 0 && (
                      <div className="p-3 rounded-xl bg-white border border-slate-100 sm:col-span-2">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider">Constraints</span>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {activeResult.breakdown.constraints.map((c, i) => (
                            <Badge key={i} variant="outline" className="text-[10px] bg-slate-50">{c}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Note: qualityCheck (AI self-evaluation) intentionally excluded —
                    LLMs cannot reliably self-score their own output */}
              </div>
            )}

            {activeResult.tips.length > 0 && (
              <div className="p-5 rounded-2xl bg-violet-50/30 border border-violet-100">
                <h4 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-violet-500" />
                  {t("prompt.tips")}
                </h4>
                <div className="space-y-2.5">
                  {activeResult.tips.map((tip, index) => (
                    <div key={`${tip}-${index}`} className="flex items-start gap-2.5 text-sm text-slate-500">
                      <ArrowRight className="w-3.5 h-3.5 mt-0.5 text-violet-400 shrink-0" />
                      <span className="leading-relaxed">{tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.stepDecomposition?.shouldDecompose && (
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                <h4 className="text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-violet-500" />
                  {t("prompt.stepDecomposition")}
                </h4>
                <p className="text-xs text-slate-400 mb-4">{result.stepDecomposition.reason}</p>
                <div className="space-y-3">
                  {(result.stepDecomposition.steps || []).map((step) => (
                    <div key={step.stepNumber} className="flex items-start gap-3 p-3 rounded-xl bg-white hover:bg-violet-50/30 transition-all border border-slate-100">
                      <div className="w-7 h-7 rounded-full bg-violet-100 text-violet-600 text-xs font-bold flex items-center justify-center shrink-0">
                        {step.stepNumber}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-800">{step.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{step.description}</p>
                        <p className="text-xs text-violet-500 mt-1">{t("prompt.inputNeeded")}: {step.inputNeeded}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.recommendations.length > 1 && (
              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-sm font-medium text-slate-500 mb-3">{t("prompt.otherFrameworks")}</h4>
                <div className="flex flex-wrap gap-2">
                  {result.recommendations.slice(1).map((recommendation) => (
                    <div key={recommendation.framework} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-500">
                      <span className="font-medium">{recommendation.frameworkName}</span>
                      <span className="opacity-50">{Math.round(recommendation.confidence * 100)}% {t("prompt.match")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 py-4 border-t border-slate-100 bg-white/50 flex items-center justify-between">
        <Button size="sm" variant="ghost" onClick={onClose} className="rounded-lg text-slate-500">
          {t("common.close")}
        </Button>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={onOpenLibrary} className="rounded-xl border-slate-200">
            <BookOpen className="w-3.5 h-3.5 mr-1.5" />
            {t("prompt.viewLibrary")}
          </Button>
          <Button
            size="sm"
            onClick={() => onSave(activeTab)}
            disabled={savedIds.has(activeTab) || isSaving}
            className={`rounded-xl ${savedIds.has(activeTab) ? "bg-emerald-600 hover:bg-emerald-700" : "bg-gradient-to-r from-violet-600 to-indigo-600"}`}
          >
            {savedIds.has(activeTab) ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1.5" />
                已入库
              </>
            ) : (
              <>
                <ArrowDownToLine className="w-3.5 h-3.5 mr-1.5" />
                保存到库
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
