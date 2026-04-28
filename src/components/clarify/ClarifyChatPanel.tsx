import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import {
  Send,
  ChevronRight,
  Wand2,
  Sparkles,
  X,
  ArrowRight,
  Loader2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { trpc } from "@/providers/trpc"

import { ClarifyMessageBubble } from "./ClarifyMessageBubble"
import { SummaryPanel } from "./SummaryPanel"
import type {
  ClarifyAnswer,
  ClarifyMessage,
  ClarifyQuestion,
  RequirementSummary,
} from "./types"

type ClarifyChatPanelProps = {
  projectId: number
  intent: string
  onClose: () => void
  onComplete: (answers: Record<string, string>, summary: RequirementSummary) => void
}

function generateMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function ClarifyChatPanel({
  projectId,
  intent,
  onClose,
  onComplete,
}: ClarifyChatPanelProps) {
  const [messages, setMessages] = useState<ClarifyMessage[]>([
    {
      id: generateMessageId(),
      role: "system",
      content: "已创建项目并开启需求澄清对话",
    },
    {
      id: generateMessageId(),
      role: "user",
      content: intent,
    },
  ])
  const [currentQuestion, setCurrentQuestion] = useState<ClarifyQuestion | null>(null)
  const [textAnswer, setTextAnswer] = useState("")
  const [selectedOptions, setSelectedOptions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [summary, setSummary] = useState<RequirementSummary | null>(null)
  const [turnNumber, setTurnNumber] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const utils = trpc.useUtils()

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  // Initialize: save intent turn and get first question
  useEffect(() => {
    async function init() {
      setIsLoading(true)
      try {
        // Save initial intent as user turn
        await saveTurn.mutateAsync({
          projectId,
          role: "user",
          content: intent,
          turnNumber: 0,
        })

        // Get first AI question
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
          // No more questions needed, generate summary
          await generateSummaryAndShow()
        }
      } catch (error) {
        toast.error("初始化对话失败")
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }

    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, intent])

  const saveTurn = trpc.project.saveConversationTurn.useMutation()
  const generateNextQuestion = trpc.project.generateNextQuestion.useMutation()
  const generateSummaryMutation = trpc.project.generateSummary.useMutation()
  const updateProject = trpc.project.update.useMutation()

  const generateSummaryAndShow = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await generateSummaryMutation.mutateAsync({ projectId })
      setSummary(result)
    } catch (error) {
      toast.error("生成摘要失败")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }, [projectId, generateSummaryMutation])

  const handleAnswerSubmit = useCallback(async () => {
    if (!currentQuestion) return

    const isText = currentQuestion.type === "text"
    const isChoice = currentQuestion.type === "choice"
    const isMultichoice = currentQuestion.type === "multichoice"

    let answerValue = ""
    let answerData: ClarifyAnswer = {}

    if (isText) {
      if (currentQuestion.required && !textAnswer.trim()) {
        toast.error("请填写回答")
        return
      }
      answerValue = textAnswer.trim()
      answerData = { value: answerValue }
    } else if (isChoice) {
      if (currentQuestion.required && selectedOptions.length === 0) {
        toast.error("请选择一个选项")
        return
      }
      answerValue = selectedOptions[0] || ""
      answerData = { selectedOptions: [answerValue] }
    } else if (isMultichoice) {
      if (currentQuestion.required && selectedOptions.length === 0) {
        toast.error("请至少选择一个选项")
        return
      }
      answerValue = selectedOptions.join(", ")
      answerData = { selectedOptions }
    }

    if (!answerValue && currentQuestion.required) {
      toast.error("请回答此问题")
      return
    }

    setIsLoading(true)

    // Add user answer message
    const userMsg: ClarifyMessage = {
      id: generateMessageId(),
      role: "user",
      content: answerValue || "（跳过）",
      questionData: currentQuestion as unknown as Record<string, unknown>,
      answerData,
      turnNumber,
    }

    setMessages((prev) => [...prev, userMsg])

    try {
      // Save the answer turn
      await saveTurn.mutateAsync({
        projectId,
        role: "user",
        content: answerValue || "（跳过）",
        questionId: currentQuestion.id,
        questionData: currentQuestion as unknown as Record<string, unknown>,
        answerData,
        turnNumber,
      })

      // Clear inputs
      setTextAnswer("")
      setSelectedOptions([])
      setCurrentQuestion(null)

      const nextTurn = turnNumber + 1

      // Add loading indicator
      const loadingId = generateMessageId()
      setMessages((prev) => [
        ...prev,
        { id: loadingId, role: "assistant", content: "", isLoading: true, turnNumber: nextTurn },
      ])

      // Get next question
      const result = await generateNextQuestion.mutateAsync({ id: projectId })

      // Remove loading indicator
      setMessages((prev) => prev.filter((m) => m.id !== loadingId))

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
        // No more questions, update project status and generate summary
        await updateProject.mutateAsync({
          id: projectId,
          clarificationStatus: "completed",
        })
        await generateSummaryAndShow()
      }
    } catch (error) {
      toast.error("发送失败，请重试")
      console.error(error)
      // Remove the user message if failed
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id))
    } finally {
      setIsLoading(false)
    }
  }, [
    currentQuestion,
    textAnswer,
    selectedOptions,
    turnNumber,
    projectId,
    saveTurn,
    generateNextQuestion,
    updateProject,
    generateSummaryAndShow,
  ])

  const handleSkip = useCallback(async () => {
    if (!currentQuestion) return
    if (currentQuestion.required) {
      toast.error("此问题为必填项，不能跳过")
      return
    }

    setIsLoading(true)

    const userMsg: ClarifyMessage = {
      id: generateMessageId(),
      role: "user",
      content: "（跳过）",
      questionData: currentQuestion as unknown as Record<string, unknown>,
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
        await updateProject.mutateAsync({
          id: projectId,
          clarificationStatus: "completed",
        })
        await generateSummaryAndShow()
      }
    } catch (error) {
      toast.error("跳过失败")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }, [currentQuestion, turnNumber, projectId, saveTurn, generateNextQuestion, updateProject, generateSummaryAndShow])

  const toggleOption = useCallback((option: string) => {
    setSelectedOptions((prev) => {
      if (currentQuestion?.type === "choice") {
        return prev.includes(option) ? [] : [option]
      }
      // multichoice
      return prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]
    })
  }, [currentQuestion])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        if (currentQuestion?.type === "text" && !isLoading) {
          handleAnswerSubmit()
        }
      }
    },
    [currentQuestion, isLoading, handleAnswerSubmit]
  )

  const handleProceed = useCallback(() => {
    if (!summary) return

    const answers: Record<string, string> = {}
    messages.forEach((msg) => {
      if (msg.role === "user" && msg.questionData?.id && msg.answerData?.value) {
        answers[msg.questionData.id] = msg.answerData.value
      }
    })

    onComplete(answers, summary)
  }, [messages, summary, onComplete])

  const hasActiveQuestion = currentQuestion !== null && summary === null

  return (
    <div className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-md flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white/80"
      >
        <div className="flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800"
            >需求澄清对话</h2>
            <p className="text-xs text-slate-400"
            >AI 引导式需求收集 · 第 {turnNumber} 轮</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6"
      >
        <div className="max-w-2xl mx-auto space-y-5"
        >
          {messages.map((msg) => (
            <ClarifyMessageBubble key={msg.id} message={msg} />
          ))}
          {isLoading && !messages.some((m) => m.isLoading) && (
            <div className="flex justify-center"
            >
              <div className="flex items-center gap-2 text-slate-400 text-sm"
              >
                <Loader2 className="w-4 h-4 animate-spin" />
                AI 正在思考...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Summary Panel (shown when done) */}
        {summary && (
          <div className="max-w-2xl mx-auto mt-6"
          >
            <SummaryPanel
              summary={summary}
              onProceed={handleProceed}
              onRegenerate={() => generateSummaryAndShow()}
              isGenerating={isLoading}
            />
          </div>
        )}
      </div>

      {/* Input Area */}
      {hasActiveQuestion && (
        <div className="border-t border-slate-100 bg-white/80 px-4 py-4"
        >
          <div className="max-w-2xl mx-auto"
          >
            {/* Question indicator */}
            <div className="flex items-center gap-2 mb-3"
            >
              <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-600 text-xs flex items-center justify-center font-medium"
              >
                {turnNumber}
              </span>
              <span className="text-xs text-slate-400"
              >
                {currentQuestion.required ? "必填" : "选填"} · {currentQuestion.type === "choice" ? "单选" : currentQuestion.type === "multichoice" ? "多选" : "问答"}
              </span>
            </div>

            {/* Choice options */}
            {(currentQuestion.type === "choice" || currentQuestion.type === "multichoice") &&
              currentQuestion.options && (
                <div className="flex flex-wrap gap-2 mb-3"
                >
                  {currentQuestion.options.map((option) => {
                    const isSelected = selectedOptions.includes(option)
                    return (
                      <button
                        key={option}
                        onClick={() => toggleOption(option)}
                        className={`
                          px-4 py-2.5 rounded-xl text-sm font-medium transition-all border
                          ${isSelected
                            ? "bg-violet-50 border-violet-300 text-violet-700 shadow-sm"
                            : "bg-white border-slate-200 text-slate-600 hover:border-violet-200 hover:bg-slate-50"
                          }
                        `}
                      >
                        {option}
                      </button>
                    )
                  })}
                </div>
              )}

            {/* Text input */}
            {currentQuestion.type === "text" && (
              <div className="mb-3"
              >
                <Textarea
                  ref={textareaRef}
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={currentQuestion.required ? "请输入回答..." : "选填，可留空..."}
                  className="min-h-[80px] resize-none rounded-xl border-slate-200 focus-visible:ring-violet-200 focus-visible:border-violet-300 bg-white text-sm"
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between"
            >
              {!currentQuestion.required && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkip}
                  disabled={isLoading}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  跳过此问题
                  <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              )}
              <div className="ml-auto"
              >
                <Button
                  onClick={handleAnswerSubmit}
                  disabled={isLoading || (currentQuestion.type === "text" && currentQuestion.required && !textAnswer.trim())}
                  className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl shadow-lg shadow-violet-200/50"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4 mr-2" />
                  )}
                  {isLoading ? "处理中..." : turnNumber >= 3 ? "继续" : "回答"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
