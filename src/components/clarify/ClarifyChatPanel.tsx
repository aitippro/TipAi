import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { trpc } from "@/providers/trpc"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import {
  Bot,
  Loader2,
  CheckCircle2,
  Send,
} from "lucide-react"
import { ClarifyMessageBubble } from "./ClarifyMessageBubble"
import { SummaryPanel } from "./SummaryPanel"
import { logger } from "@/lib/logger"
import type {
  ClarifyQuestion,
  ClarifyAnswer,
  ClarifyMessage,
  RequirementSummary,
} from "./types"

interface ClarifyChatPanelProps {
  projectId: number
  intent: string
  onClose?: () => void
  onComplete?: (answers: Record<string, string>, summary: RequirementSummary) => void
}

function generateMessageId(): string {
  return Math.random().toString(36).substring(2, 9)
}

export function ClarifyChatPanel({ projectId, intent, onComplete }: ClarifyChatPanelProps) {
  const [messages, setMessages] = useState<ClarifyMessage[]>([])
  const [currentQuestion, setCurrentQuestion] = useState<ClarifyQuestion | null>(null)
  const [answerText, setAnswerText] = useState("")
  const [selectedOptions, setSelectedOptions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [_turnNumber, setTurnNumber] = useState(0)
  const [errMsg, setErrMsg] = useState<string | null>(null)
  const [summary, setSummary] = useState<RequirementSummary | null>(null)
  const completedRef = useRef(false)
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current)
    }
  }, [])

  const completeOnce = useMemo(() => (answers: Record<string, string>, summary: RequirementSummary) => {
    if (completedRef.current) return
    completedRef.current = true
    onComplete?.(answers, summary)
  }, [onComplete])

  const saveTurn = trpc.project.saveConversationTurn.useMutation()
  const generateNextQuestion = trpc.project.generateNextQuestion.useMutation()
  const generateSummaryMutation = trpc.project.generateSummary.useMutation()

  const generateSummaryAndShow = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await generateSummaryMutation.mutateAsync({ projectId })
      setSummary(result)
      // Auto-proceed to results after brief pause
      autoTimerRef.current = setTimeout(() => completeOnce({}, result), 1800)
    } catch (error) {
        setErrMsg(error instanceof Error ? error.message : "初始化对话失败，请检查 API Key 配置")
        logger.error("ClarifyChat", error instanceof Error ? (error.stack || error.message) : String(error))
      toast.error("生成摘要失败")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }, [projectId, generateSummaryMutation, completeOnce])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  // Initialize: save intent turn and get first question
  useEffect(() => {
    let cancelled = false
    async function init() {
      setIsLoading(true)
      try {
        await saveTurn.mutateAsync({
          projectId,
          role: "user",
          content: intent || "（用户初始需求）",
          turnNumber: 0,
        })
        if (cancelled) return

        const result = await generateNextQuestion.mutateAsync({ id: projectId })

        if (result.needsMoreClarification && result.question) {
          const q: ClarifyQuestion = {
            id: result.question.id,
            question: result.question.question,
            type: result.question.type,
            options: result.question.options,
            why: result.question.why,
            required: result.question.required,
          }

          const assistantMsg: ClarifyMessage = {
            id: generateMessageId(),
            role: "assistant",
            content: q.question,
            questionData: q,
            turnNumber: 1,
          }

          setMessages((prev) => [...prev, assistantMsg])
          setCurrentQuestion(q)
          setTurnNumber(1)
        } else {
          await generateSummaryAndShow()
        }
      } catch (error) {
        setErrMsg(error instanceof Error ? error.message : "初始化对话失败，请检查 API Key 配置")
        logger.error("ClarifyChat", error instanceof Error ? (error.stack || error.message) : String(error))
        toast.error("初始化对话失败")
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }

    init()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, intent])

  const handleAnswerSubmit = useCallback(async (forcedOptions?: string[]) => {
    console.log("[Clarify] handleAnswerSubmit called", { forcedOptions, currentQuestion: currentQuestion?.id, type: currentQuestion?.type })
    if (!currentQuestion) { console.log("[Clarify] no currentQuestion, returning"); return }

    const isText = currentQuestion.type === "text"
    const isMulti = currentQuestion.type === "multichoice" || currentQuestion.type === "choice"
    const finalOptions = forcedOptions || selectedOptions

    let answerValue: string | undefined
    if (isText) {
      answerValue = answerText.trim()
      if (!answerValue) { console.log("[Clarify] text empty, returning"); return }
    }
    if (isMulti && finalOptions.length === 0) {
      console.log("[Clarify] multi with no options, showing toast")
      toast.error("请至少选择一个选项")
      return
    }

    const answerValueStr = isText ? answerValue! : finalOptions.join(", ") || "（未选择）"
    const answerData: ClarifyAnswer = {
      value: answerValueStr,
      selectedOptions: isMulti ? finalOptions : undefined,
    }

    const turnNumber = messages.length + 1

    const userMsg: ClarifyMessage = {
      id: generateMessageId(),
      role: "user",
      content: answerValueStr,
      answerData,
      turnNumber,
    }

    setMessages((prev) => [...prev, userMsg])

    try {
      await saveTurn.mutateAsync({
        projectId,
        role: "user",
        content: userMsg.content,
        questionId: currentQuestion.id,
        questionData: currentQuestion as unknown as Record<string, unknown>,
        answerData: answerData as unknown as Record<string, unknown>,
        turnNumber,
      })

      setSelectedOptions([])
      setCurrentQuestion(null)
      setAnswerText("")

      const nextTurn = turnNumber + 1
      const result = await generateNextQuestion.mutateAsync({ id: projectId })

      if (result.needsMoreClarification && result.question) {
        const q: ClarifyQuestion = {
          id: result.question.id,
          question: result.question.question,
          type: result.question.type,
          options: result.question.options,
          why: result.question.why,
          required: result.question.required,
        }

        const assistantMsg: ClarifyMessage = {
          id: generateMessageId(),
          role: "assistant",
          content: q.question,
          questionData: q,
          turnNumber: nextTurn,
        }

        setMessages((prev) => [...prev, assistantMsg])
        setCurrentQuestion(q)
        setTurnNumber(nextTurn)
      } else {
        await generateSummaryAndShow()
      }
    } catch (error) {
        setErrMsg(error instanceof Error ? error.message : "初始化对话失败，请检查 API Key 配置")
        logger.error("ClarifyChat", error instanceof Error ? (error.stack || error.message) : String(error))
      toast.error("保存回答失败")
      console.error(error)
    }
  }, [currentQuestion, answerText, selectedOptions, messages.length, projectId, saveTurn, generateNextQuestion, generateSummaryAndShow])

  const handleSkip = useCallback(async () => {
    if (!currentQuestion) return

    const turnNumber = messages.length + 1

    const userMsg: ClarifyMessage = {
      id: generateMessageId(),
      role: "user",
      content: "（跳过）",
      answerData: {},
      turnNumber,
    }

    setMessages((prev) => [...prev, userMsg])

    try {
      await saveTurn.mutateAsync({
        projectId,
        role: "user",
        content: "（跳过）",
        questionId: currentQuestion.id,
        questionData: currentQuestion as unknown as Record<string, unknown>,
        answerData: {},
        turnNumber,
      })

      setSelectedOptions([])
      setCurrentQuestion(null)

      const nextTurn = turnNumber + 1
      const result = await generateNextQuestion.mutateAsync({ id: projectId })

      if (result.needsMoreClarification && result.question) {
        const q: ClarifyQuestion = {
          id: result.question.id,
          question: result.question.question,
          type: result.question.type,
          options: result.question.options,
          why: result.question.why,
          required: result.question.required,
        }

        const assistantMsg: ClarifyMessage = {
          id: generateMessageId(),
          role: "assistant",
          content: q.question,
          questionData: q,
          turnNumber: nextTurn,
        }

        setMessages((prev) => [...prev, assistantMsg])
        setCurrentQuestion(q)
        setTurnNumber(nextTurn)
      } else {
        await generateSummaryAndShow()
      }
    } catch (error) {
        setErrMsg(error instanceof Error ? error.message : "初始化对话失败，请检查 API Key 配置")
        logger.error("ClarifyChat", error instanceof Error ? (error.stack || error.message) : String(error))
      toast.error("保存跳过失败")
      console.error(error)
    }
  }, [currentQuestion, messages.length, projectId, saveTurn, generateNextQuestion, generateSummaryAndShow])

  const toggleOption = (option: string) => {
    console.log("[Clarify] toggleOption", option)
    setSelectedOptions((prev) =>
      prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]
    )
  }

  const canSubmit = () => {
    if (!currentQuestion) return false
    if (currentQuestion.type === "text") return answerText.trim().length > 0
    if (currentQuestion.type === "multichoice") return selectedOptions.length > 0
    return true
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm relative">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {errMsg ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
              <span className="text-red-400 text-lg">!</span>
            </div>
            <p className="text-sm text-red-600 font-medium">{errMsg}</p>
            <Button variant="outline" size="sm" className="rounded-xl text-xs" onClick={() => { setErrMsg(null); setIsLoading(true); /* retry by remounting */ window.location.reload(); }}>
              重试
            </Button>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <ClarifyMessageBubble key={msg.id} message={msg} />
            ))}
            {isLoading && !currentQuestion && (
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>AI 思考中...</span>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Summary overlay — full panel cover */}
      {summary && (
        <div className="absolute inset-0 z-20 bg-white overflow-y-auto">
          <SummaryPanel
            summary={summary}
            onProceed={() => completeOnce({}, summary)}
            onRegenerate={generateSummaryAndShow}
            isGenerating={generateSummaryMutation.isPending}
          />
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-slate-100 p-4 bg-slate-50/50">
        {currentQuestion ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <Bot className="w-4 h-4 text-blue-500 mt-1 shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-800">{currentQuestion.question}</p>
                {currentQuestion.why && (
                  <p className="text-xs text-slate-400 mt-1">{currentQuestion.why}</p>
                )}
              </div>
            </div>

            {currentQuestion.type === "choice" && currentQuestion.options && (
              <div className="grid grid-cols-2 gap-2">
                {currentQuestion.options.map((option) => (
                  <Button
                    key={option}
                    variant="outline"
                    className="justify-start text-left h-auto py-2 px-3 rounded-xl"
                    onClick={() => handleAnswerSubmit([option])}
                  >
                    {option}
                  </Button>
                ))}
              </div>
            )}

            {currentQuestion.type === "multichoice" && currentQuestion.options && (
              <div className="space-y-2">
                {currentQuestion.options.map((option) => (
                  <Button
                    key={option}
                    variant={selectedOptions.includes(option) ? "default" : "outline"}
                    className="w-full justify-start rounded-xl"
                    onClick={() => toggleOption(option)}
                  >
                    <CheckCircle2
                      className={`w-4 h-4 mr-2 ${selectedOptions.includes(option) ? "text-white" : "text-slate-300"}`}
                    />
                    {option}
                  </Button>
                ))}
                <Button
                  className="w-full rounded-xl"
                  disabled={!canSubmit()}
                  onClick={() => handleAnswerSubmit()}
                >
                  <Send className="w-4 h-4 mr-2" />
                  确认选择
                </Button>
              </div>
            )}

            {currentQuestion.type === "text" && (
              <div className="space-y-2">
                <Textarea
                  ref={textareaRef}
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  placeholder="请输入您的回答..."
                  className="min-h-[80px] rounded-xl resize-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      if (canSubmit()) handleAnswerSubmit()
                    }
                  }}
                />
                <div className="flex justify-between items-center">
                  {!currentQuestion.required && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-slate-400"
                      onClick={handleSkip}
                    >
                      跳过
                    </Button>
                  )}
                  <Button
                    className="rounded-xl ml-auto"
                    disabled={!canSubmit() || isLoading}
                    onClick={() => handleAnswerSubmit()}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    发送
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : !isLoading ? (
          <div className="flex items-center justify-center gap-2 py-4">
            {summary ? (
              <span className="text-sm text-emerald-600 font-medium">需求澄清已完成</span>
            ) : (
              <div className="flex items-center gap-2 text-slate-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500" />
                </span>
                <span className="text-sm">AI 正在分析你的需求...</span>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
