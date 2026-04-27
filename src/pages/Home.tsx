import { useCallback, useRef, useState } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"

import GenerateModal from "@/components/GenerateModal"
import { useAuth } from "@/hooks/useAuth"
import { trpc } from "@/providers/trpc"

import { ClarificationOverlay } from "@/components/home/ClarificationOverlay"
import { HomeHeroSection } from "@/components/home/HomeHeroSection"
import { HowItWorksSection } from "@/components/home/HowItWorksSection"
import { SLASH_COMMANDS } from "@/components/home/config"
import type {
  ClarificationAnswers,
  ClarificationQuestion,
} from "@/components/home/types"

export default function Home() {
  const [intent, setIntent] = useState("")
  const [stepMode, setStepMode] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [pendingAnswers, setPendingAnswers] = useState<ClarificationAnswers>({})
  const [showClarify, setShowClarify] = useState(false)
  const [clarifyQuestions, setClarifyQuestions] = useState<ClarificationQuestion[]>([])
  const [clarifyAnswers, setClarifyAnswers] = useState<ClarificationAnswers>({})

  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const slashMatch = intent.match(/^\/([a-z]*)$/i)
  const showSlashMenu = intent.startsWith("/") && Boolean(slashMatch)
  const slashQuery = showSlashMenu ? (slashMatch?.[1] || "") : ""

  const filteredSlashCommands = slashQuery
    ? SLASH_COMMANDS.filter((c) => c.command.includes(slashQuery.toLowerCase()) || c.name.includes(slashQuery))
    : SLASH_COMMANDS

  const insertSlashCommand = (cmd: string) => {
    setIntent(cmd + " ")
    textareaRef.current?.focus()
  }

  // ---- Clarify mutation ----
  const clarifyMutation = trpc.promptForge.clarify.useMutation({
    onSuccess: (data) => {
      try {
        const d = data as Record<string, unknown>
        const needs = Boolean(d?.needsClarification)
        const questions = Array.isArray(d?.questions) ? (d.questions as ClarificationQuestion[]) : []
        if (needs && questions.length > 0) {
          setClarifyQuestions(questions)
          setClarifyAnswers({})
          setShowClarify(true)
          return
        }
      } catch { /* ignore parse error */ }
      setPendingAnswers({})
      setShowModal(true)
    },
    onError: () => {
      setPendingAnswers({})
      setShowModal(true)
    },
  })

  const handleStartGenerate = useCallback(() => {
    if (!intent.trim()) { toast.error("请输入你的需求"); return }
    if (!isAuthenticated) { toast.info("请先登录"); navigate("/login"); return }
    setShowClarify(false)
    clarifyMutation.mutate({ intent: intent.trim() })
  }, [intent, isAuthenticated, navigate, clarifyMutation])

  const handleSkipClarify = useCallback(() => {
    setShowClarify(false)
    setPendingAnswers({})
    setShowModal(true)
  }, [])

  const handleClarifyAnswerChange = useCallback((questionId: string, value: string) => {
    setClarifyAnswers((current) => ({ ...current, [questionId]: value }))
  }, [])

  const handleSubmitClarify = useCallback(() => {
    const answers: ClarificationAnswers = {}
    const missingRequired: string[] = []
    for (const q of clarifyQuestions) {
      const isRequired = q.required !== false
      const val = clarifyAnswers[q.id]?.trim() ?? ""
      if (val) {
        answers[q.id] = val
      } else if (isRequired) {
        missingRequired.push(q.question)
      }
    }
    if (missingRequired.length > 0) {
      toast.error(`请回答必填项：${missingRequired.join("、")}`)
      return
    }
    setShowClarify(false)
    setPendingAnswers(answers)
    setShowModal(true)
  }, [clarifyAnswers, clarifyQuestions])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleStartGenerate()
    }
  }, [handleStartGenerate])

  return (
    <div className="min-h-screen bg-hero-gradient">
      <HomeHeroSection
        intent={intent}
        stepMode={stepMode}
        showSlashMenu={showSlashMenu}
        isGenerating={clarifyMutation.isPending}
        filteredSlashCommands={filteredSlashCommands}
        textareaRef={textareaRef}
        onIntentChange={setIntent}
        onIntentKeyDown={handleKeyDown}
        onExampleSelect={setIntent}
        onInsertSlashCommand={insertSlashCommand}
        onStepModeToggle={() => setStepMode((current) => !current)}
        onStartGenerate={handleStartGenerate}
      />

      {showClarify && (
        <ClarificationOverlay
          questions={clarifyQuestions}
          answers={clarifyAnswers}
          onAnswerChange={handleClarifyAnswerChange}
          onSubmit={handleSubmitClarify}
          onSkip={handleSkipClarify}
        />
      )}

      {showModal ? (
        <GenerateModal
          intent={intent}
          answers={pendingAnswers}
          stepMode={stepMode}
          onClose={() => setShowModal(false)}
          onSaved={() => setIntent("")}
        />
      ) : null}

      <HowItWorksSection />
    </div>
  )
}
