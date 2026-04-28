import { CheckCircle2, Lightbulb, AlertCircle, BookOpen, Wand2 } from "lucide-react"
import { Button } from "@/components/ui/button"

import type { RequirementSummary } from "./types"

type SummaryPanelProps = {
  summary: RequirementSummary
  onProceed: () => void
  onRegenerate: () => void
  isGenerating?: boolean
}

export function SummaryPanel({ summary, onProceed, onRegenerate, isGenerating }: SummaryPanelProps) {
  return (
    <div className="bg-gradient-to-br from-white to-slate-50/50 rounded-2xl border border-slate-100 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
          <CheckCircle2 className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-slate-800">需求澄清完成</h3>
          <p className="text-xs text-slate-500">AI 已分析并总结你的需求</p>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Summary */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <span>需求摘要</span>
          </div>
          <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4">
            <p className="text-sm text-slate-700 leading-relaxed">{summary.summary}</p>
          </div>
        </div>

        {/* Requirements */}
        {summary.requirements.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>核心需求</span>
              <span className="text-xs text-slate-400 ml-auto">{summary.requirements.length} 项</span>
            </div>
            <ul className="space-y-2">
              {summary.requirements.map((req, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 text-xs flex items-center justify-center font-medium">
                    {idx + 1}
                  </span>
                  <span className="flex-1 pt-0.5">{req}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Constraints */}
        {summary.constraints.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span>约束条件</span>
            </div>
            <ul className="space-y-1.5">
              {summary.constraints.map((constraint, idx) => (
                <li key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                  <span className="w-1 h-1 rounded-full bg-amber-400" />
                  {constraint}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Suggested Frameworks */}
        {summary.suggestedFrameworks.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <BookOpen className="w-4 h-4 text-violet-500" />
              <span>推荐框架</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {summary.suggestedFrameworks.map((framework, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 bg-violet-50 text-violet-700 text-xs rounded-lg border border-violet-100 font-medium"
                >
                  {framework}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Analysis */}
        <div className="pt-4 border-t border-slate-100">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-xs text-slate-400 mb-1">目标领域</div>
              <div className="text-sm font-medium text-slate-700 capitalize">
                {summary.intentAnalysis.domain}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-slate-400 mb-1">复杂度</div>
              <div className="text-sm font-medium text-slate-700">
                {summary.intentAnalysis.complexity === "simple"
                  ? "简单"
                  : summary.intentAnalysis.complexity === "medium"
                    ? "中等"
                    : "复杂"}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1 rounded-xl border-slate-200 hover:bg-slate-50"
            onClick={onRegenerate}
            disabled={isGenerating}
          >
            重新生成
          </Button>
          <Button
            className="flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-violet-200/50"
            onClick={onProceed}
            disabled={isGenerating}
          >
            <Wand2 className="w-4 h-4 mr-2" />
            生成提示词
          </Button>
        </div>
      </div>
    </div>
  )
}
