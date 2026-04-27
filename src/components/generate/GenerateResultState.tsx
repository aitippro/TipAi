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
            <h2 className="text-sm font-semibold text-slate-800">生成完成</h2>
            <p className="text-xs text-slate-400 truncate max-w-md">{intent}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={onRegenerate} className="rounded-lg text-slate-500 hover:text-violet-600">
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            重新生成
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
                <span className="text-xs text-slate-400">核心目标</span>
              </div>
              <p className="text-sm font-medium text-slate-800 truncate">{result.analysis.goal || "未识别"}</p>
            </div>
            <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100">
              <div className="flex items-center gap-2 mb-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
                <span className="text-xs text-slate-400">领域</span>
              </div>
              <p className="text-sm font-medium text-slate-800">{result.analysis.domain || "通用"}</p>
            </div>
            <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100">
              <div className="flex items-center gap-2 mb-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-500" />
                <span className="text-xs text-slate-400">复杂度</span>
              </div>
              <Badge variant="outline" className={`text-xs ${COMPLEXITY_COLORS[result.analysis.complexity] || ""}`}>
                {COMPLEXITY_LABELS[result.analysis.complexity] || result.analysis.complexity || "未知"}
              </Badge>
            </div>
            <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100">
              <div className="flex items-center gap-2 mb-1.5">
                <Users className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs text-slate-400">受众</span>
              </div>
              <p className="text-sm font-medium text-slate-800 truncate">{result.analysis.audience || "未指定"}</p>
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
                  {item.framework || `方案 ${index + 1}`}
                </button>
              ))}
            </div>
          )}

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-slate-800 mb-1">{activeResult.title || "生成结果"}</h3>
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
                  {copiedIndex === activeTab ? "已复制" : "复制"}
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
                  <span className="text-sm font-medium text-slate-700">设计说明</span>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed">{activeResult.explanation}</p>
              </div>
            )}

            <div className="relative group">
              <div className="code-block rounded-2xl p-6 overflow-x-auto">
                <pre className="text-sm whitespace-pre-wrap leading-relaxed text-slate-200">{activeResult.prompt || "（提示词内容为空）"}</pre>
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="absolute top-4 right-4 h-8 text-xs opacity-0 group-hover:opacity-100 transition-all bg-white/90 text-slate-800 hover:bg-white rounded-lg shadow-lg"
                onClick={() => onCopy(activeResult.prompt, activeTab)}
              >
                {copiedIndex === activeTab ? <Check className="w-3 h-3 mr-1 text-emerald-500" /> : <Copy className="w-3 h-3 mr-1" />}
                {copiedIndex === activeTab ? "已复制" : "复制"}
              </Button>
            </div>

            {activeResult.tips.length > 0 && (
              <div className="p-5 rounded-2xl bg-violet-50/30 border border-violet-100">
                <h4 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-violet-500" />
                  使用技巧
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
                  建议分步骤执行
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
                        <p className="text-xs text-violet-500 mt-1">输入：{step.inputNeeded}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.recommendations.length > 1 && (
              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-sm font-medium text-slate-500 mb-3">其他推荐框架</h4>
                <div className="flex flex-wrap gap-2">
                  {result.recommendations.slice(1).map((recommendation) => (
                    <div key={recommendation.framework} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-500">
                      <span className="font-medium">{recommendation.frameworkName}</span>
                      <span className="opacity-50">{Math.round(recommendation.confidence * 100)}% 匹配</span>
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
          关闭
        </Button>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={onOpenLibrary} className="rounded-xl border-slate-200">
            <BookOpen className="w-3.5 h-3.5 mr-1.5" />
            查看提示词库
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
