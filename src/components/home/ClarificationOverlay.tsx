import { useTranslation } from "react-i18next"
import { MessageSquare, Wand2 } from "lucide-react"

import { Button } from "@/components/ui/button"

import type { ClarificationAnswers, ClarificationQuestion } from "./types"

type ClarificationOverlayProps = {
  questions: ClarificationQuestion[]
  answers: ClarificationAnswers
  onAnswerChange: (questionId: string, value: string) => void
  onSubmit: () => void
  onSkip: () => void
}

export function ClarificationOverlay({
  questions,
  answers,
  onAnswerChange,
  onSubmit,
  onSkip,
}: ClarificationOverlayProps) {
  const { t } = useTranslation()
  const requiredCount = questions.filter((question) => question.required !== false).length
  const optionalCount = questions.filter((question) => question.required === false).length

  return (
    <div className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-md flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-violet-500" />
          <span className="text-sm font-semibold text-slate-800">{t("generate.clarifyTitle")}</span>
          <span className="text-xs text-slate-400 ml-2">
            {requiredCount} {t("clarify.requiredCount")} · {optionalCount} {t("clarify.optionalCount")}
          </span>
        </div>
        {questions.some((question) => question.required === false) && (
          <button onClick={onSkip} className="text-xs text-slate-400 hover:text-slate-600">
            {t("clarify.skipOptional")}
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
          <p className="text-sm text-slate-500">{t("generate.clarifyDesc")}</p>
          {questions.map((question, index) => {
            const isRequired = question.required !== false
            const value = answers[question.id] ?? ""

            return (
              <div key={question.id} className="space-y-3" data-question-required={isRequired}>
                <div className="flex items-start gap-2">
                  <span className={`w-6 h-6 rounded-full text-xs flex items-center justify-center shrink-0 font-medium ${
                    isRequired ? "bg-red-100 text-red-600" : "bg-violet-100 text-violet-600"
                  }`}>
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800">
                      {question.question}
                      {isRequired && <span className="text-red-500 ml-1">*</span>}
                      {!isRequired && <span className="text-slate-400 text-xs ml-1">({t("clarify.optional")})</span>}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{question.why}</p>
                  </div>
                </div>
                {question.type === "choice" && question.options ? (
                  <div className="flex flex-wrap gap-2 ml-8">
                    {question.options.map((option) => (
                      <label key={option} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:border-violet-300 cursor-pointer transition-all text-xs text-slate-600 hover:bg-violet-50">
                        <input
                          type="radio"
                          name={question.id}
                          value={option}
                          checked={value === option}
                          onChange={(e) => onAnswerChange(question.id, e.target.value)}
                          className="accent-violet-600"
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => onAnswerChange(question.id, e.target.value)}
                    placeholder={isRequired ? t("clarify.requiredPlaceholder") : t("clarify.optionalPlaceholder")}
                    className="ml-8 w-full text-sm px-3 py-2 rounded-xl border border-slate-200 focus:border-violet-300 focus:ring-2 focus:ring-violet-100 outline-none transition-all"
                  />
                )}
              </div>
            )
          })}
          <Button
            onClick={onSubmit}
            className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl shadow-lg shadow-violet-200/50 mt-4"
          >
            <Wand2 className="w-4 h-4 mr-2" />
            {t("home.startGenerate")}
          </Button>
        </div>
      </div>
    </div>
  )
}
