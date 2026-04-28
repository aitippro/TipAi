import { useCallback, useRef, useState } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"

import GenerateModal from "@/components/GenerateModal"
import { useAuth } from "@/hooks/useAuth"
import { trpc } from "@/providers/trpc"

import { ClarifyChatPanel } from "@/components/clarify/ClarifyChatPanel"
import type { RequirementSummary } from "@/components/clarify/types"
import { HomeHeroSection } from "@/components/home/HomeHeroSection"
import { HowItWorksSection } from "@/components/home/HowItWorksSection"
import { SLASH_COMMANDS } from "@/components/home/config"

export default function Home() {
  const [intent, setIntent] = useState("")
  const [stepMode, setStepMode] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [pendingAnswers, setPendingAnswers] = useState<Record<string, string>>({})
  const [showClarify, setShowClarify] = useState(false)
  const [clarifyProjectId, setClarifyProjectId] = useState<number | null>(null)

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

  const createProject = trpc.project.create.useMutation()
  const updateProject = trpc.project.update.useMutation()

  const [isCreatingProject, setIsCreatingProject] = useState(false)

  const handleStartGenerate = useCallback(async () => {
    if (!intent.trim()) { toast.error("请输入你的需求"); return }
    if (!isAuthenticated) { toast.info("请先登录"); navigate("/login"); return }

    setIsCreatingProject(true)
    try {
      // Create a project first
      const title = intent.trim().length > 30
        ? intent.trim().substring(0, 30) + "..."
        : intent.trim()

      const project = await createProject.mutateAsync({
        title,
        intent: intent.trim(),
        domain: undefined,
      })

      // Update project to in_progress
      await updateProject.mutateAsync({
        id: project.id,
        clarificationStatus: "in_progress",
      })

      setClarifyProjectId(project.id)
      setShowClarify(true)
    } catch (error) {
      toast.error("创建项目失败，请重试")
      console.error(error)
      // Fallback: open modal directly
      setPendingAnswers({})
      setShowModal(true)
    } finally {
      setIsCreatingProject(false)
    }
  }, [intent, isAuthenticated, navigate, createProject, updateProject])

  const handleCloseClarify = useCallback(() => {
    setShowClarify(false)
    setClarifyProjectId(null)
  }, [])

  const handleClarifyComplete = useCallback((answers: Record<string, string>, _summary: RequirementSummary) => {
    setShowClarify(false)
    setClarifyProjectId(null)
    setPendingAnswers(answers)
    setShowModal(true)
  }, [])

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
        isGenerating={isCreatingProject}
        filteredSlashCommands={filteredSlashCommands}
        textareaRef={textareaRef}
        onIntentChange={setIntent}
        onIntentKeyDown={handleKeyDown}
        onExampleSelect={setIntent}
        onInsertSlashCommand={insertSlashCommand}
        onStepModeToggle={() => setStepMode((current) => !current)}
        onStartGenerate={handleStartGenerate}
      />

      {showClarify && clarifyProjectId !== null && (
        <ClarifyChatPanel
          projectId={clarifyProjectId}
          intent={intent}
          onClose={handleCloseClarify}
          onComplete={handleClarifyComplete}
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
