import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { flushSync } from "react-dom"
import { useNavigate } from "react-router"
import { toast } from "sonner"
import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"
import { trpc } from "@/providers/trpc"

import { GenerateErrorState } from "@/components/generate/GenerateErrorState"
import { GenerateLoadingState } from "@/components/generate/GenerateLoadingState"
import { GenerateResultState } from "@/components/generate/GenerateResultState"
import type { GenResult } from "@/components/generate/types"
import { validateGenResult } from "@/components/generate/utils"

interface Props {
  intent: string
  answers?: Record<string, string>
  stepMode: boolean
  inline?: boolean
  onClose: () => void
  onSaved?: () => void
}

export default function GenerateModal({ intent, answers, stepMode, inline, onClose, onSaved }: Props) {
  const { t, i18n } = useTranslation()
  const [result, setResult] = useState<GenResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [activeStep, setActiveStep] = useState(1)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState(0)
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set())
  const [isGenerating, setIsGenerating] = useState(false)
  const hasStartedRef = useRef(false)
  const mountedRef = useRef(true)
  useEffect(() => () => { mountedRef.current = false }, [])

  // Stable refs for values that mutate too often to be effect dependencies
  const answersRef = useRef(answers)
  useEffect(() => { answersRef.current = answers }, [answers])
  const stepModeRef = useRef(stepMode)
  useEffect(() => { stepModeRef.current = stepMode }, [stepMode])

  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  const generateMutation = trpc.promptForge.generate.useMutation({
    onSuccess: (rawData) => {
      if (!mountedRef.current) return
      setIsGenerating(false)
      const validated = validateGenResult(rawData)
      if (!validated) {
        setErrorMsg(t("generate.errorDesc"))
        return
      }
      setResult(validated)
      setErrorMsg(null)
      setActiveTab(0)

      // Auto-save the first result to library
      if (validated.results.length > 0 && isAuthenticated) {
        const firstItem = validated.results[0]
        autoSaveMutation.mutate({
          title: firstItem.title,
          originalIntent: intent,
          generatedPrompt: firstItem.prompt,
          framework: firstItem.framework,
          domain: validated.analysis.domain,
        })
        setSavedIds((prev) => new Set(prev).add(0))
      }
    },
    onError: (error) => {
      if (!mountedRef.current) return
      setIsGenerating(false)
      const msg = error.message || t("generate.errorTitle")
      setErrorMsg(msg)
      if (msg.includes("API Key")) {
        toast.error(t("settings.modelKeysDesc"), {
          action: { label: t("nav.settings"), onClick: () => { onClose(); navigate("/settings") } },
        })
      }
    },
  })

  const mutateRef = useRef(generateMutation.mutate)
  const generateMutationRef = useRef(generateMutation)
  useEffect(() => { mutateRef.current = generateMutation.mutate; generateMutationRef.current = generateMutation })

  useEffect(() => {
    if (hasStartedRef.current) return
    if (!intent.trim()) { onClose(); return }
    hasStartedRef.current = true
    queueMicrotask(() => {
      setIsGenerating(true)
      mutateRef.current({ intent: intent.trim(), answers: answersRef.current, stepMode: stepModeRef.current, language: i18n.language === 'en-US' ? 'en' : 'zh' })
    })
     
  }, [intent, onClose, i18n.language])

  useEffect(() => {
    if (!isGenerating) return
    const steps = [1, 2, 3]
    let idx = 0
    const interval = setInterval(() => {
      idx = (idx + 1) % steps.length
      setActiveStep(steps[idx])
    }, 1500)
    return () => clearInterval(interval)
  }, [isGenerating])

  const utils = trpc.useUtils()
  const saveMutation = trpc.promptForge.saveToLibrary.useMutation({
    onSuccess: () => {
      toast.success(t("prompt.saveToLibrary"))
      utils.promptForge.getLibrary.invalidate()
      onSaved?.()
    },
    onError: (e) => toast.error(e.message),
  })
  const saveMutateRef = useRef(saveMutation.mutate)
  useEffect(() => { saveMutateRef.current = saveMutation.mutate })

  const autoSaveMutation = trpc.promptForge.saveToLibrary.useMutation({
    onSuccess: () => {
      toast.success(t("prompt.saved"))
      utils.promptForge.getLibrary.invalidate()
    },
    onError: (e) => {
      // silent fail for auto-save
      console.warn("Auto-save failed:", e.message)
    },
  })

  const handleSave = useCallback((index: number) => {
    if (!isAuthenticated) { toast.info(t("home.toastLoginRequired")); return }
    if (!result) return
    const item = result.results[index]
    saveMutateRef.current({
      title: item.title,
      originalIntent: intent,
      generatedPrompt: item.prompt,
      framework: item.framework,
      domain: result.analysis.domain,
    })
    setSavedIds((prev) => new Set(prev).add(index))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, result, intent, t])

  const handleCopy = useCallback(async (text: string, index: number) => {
    try {
      // In Electron with contextIsolation, navigator.clipboard may fail;
      // fall back to execCommand for legacy support
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.left = '-9999px'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 2000)
      toast.success(t("prompt.copySuccess"))
    } catch {
      // silent fail — clipboard unavailable
    }
  }, [t])

  const handleRegenerate = useCallback(() => {
    flushSync(() => {
      setResult(null)
      setErrorMsg(null)
      setActiveStep(1)
      setCopiedIndex(null)
      setActiveTab(0)
      setSavedIds(() => new Set())
    })
    generateMutationRef.current.reset()
    setIsGenerating(true)
    mutateRef.current({ intent: intent.trim(), answers: answersRef.current, stepMode: stepModeRef.current })
     
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intent])

  if (isGenerating) {
    return (
      <GenerateLoadingState
        intent={intent}
        activeStep={activeStep}
        onClose={onClose}
        inline={inline}
      />
    )
  }

  if (errorMsg && !result) {
    return (
      <GenerateErrorState
        errorMsg={errorMsg}
        onClose={onClose}
        onRetry={handleRegenerate}
      />
    )
  }

  if (!result) {
    return (
      <div className={inline ? "bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col p-8 items-center gap-3" : "fixed inset-0 z-[100] bg-white/95 backdrop-blur-md flex flex-col items-center justify-center gap-3"}>
        <p className="text-sm text-slate-500">{t("generate.loadingDesc")}</p>
        <Button onClick={() => mutateRef.current({ intent: intent.trim(), answers: answersRef.current, stepMode: stepModeRef.current, language: i18n.language === 'en-US' ? 'en' : 'zh' })} className="rounded-xl">
          <Sparkles className="w-4 h-4 mr-2" />
          {t("home.startGenerate")}
        </Button>
      </div>
    )
  }

  return (
    <GenerateResultState
      intent={intent}
      result={result}
      activeTab={activeTab}
      copiedIndex={copiedIndex}
      savedIds={savedIds}
      isSaving={saveMutation.isPending}
      onClose={onClose}
      onOpenLibrary={() => { onClose(); navigate("/library") }}
      onRegenerate={handleRegenerate}
      onActiveTabChange={setActiveTab}
      onCopy={handleCopy}
      onSave={handleSave}
    />
  )
}
