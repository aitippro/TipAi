import { useTranslation } from "react-i18next"
import { Bot, User, Sparkles } from "lucide-react"

import type { ClarifyMessage } from "./types"

type ClarifyMessageBubbleProps = {
  message: ClarifyMessage
}

export function ClarifyMessageBubble({ message }: ClarifyMessageBubbleProps) {
  const { t } = useTranslation()
  const isUser = message.role === "user"
  const isAssistant = message.role === "assistant"

  if (message.role === "system") {
    return (
      <div className="flex justify-center my-2">
        <div className="text-xs text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div className="shrink-0">
        {isUser ? (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shadow-sm">
            <User className="w-4 h-4 text-white" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-sm">
            <Bot className="w-4 h-4 text-white" />
          </div>
        )}
      </div>

      {/* Message content */}
      <div className={`flex-1 max-w-[80%] ${isUser ? "flex justify-end" : ""}`}>
        <div
          className={`
            px-4 py-3 rounded-2xl text-sm leading-relaxed
            ${isUser
              ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-tr-sm"
              : "bg-white border border-slate-100 text-slate-800 rounded-tl-sm shadow-sm"
            }
          `}
        >
          {message.isLoading ? (
            <div className="flex items-center gap-2 text-slate-400">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span className="text-xs">{t("generate.aiThinking")}</span>
            </div>
          ) : (
            <>
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
              {isAssistant && message.questionData?.why && (
                <p className="text-xs text-slate-400 mt-2 italic border-t border-slate-100 pt-2">
                  💡 {message.questionData.why}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
