import { useCallback, useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"
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
  onClose: () => void
  onSaved?: () => void
}

export default function GenerateModal({ intent, answers, stepMode, onClose, onSaved }: Props) {
  const [result, setResult] = useState<GenResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [activeStep, setActiveStep] = useState(1)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState(0)
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set())
  const [hasStarted, setHasStarted] = useState(false)

  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  const generateMutation = trpc.promptForge.generate.useMutation({
    onSuccess: (rawData) => {
      const validated = validateGenResult(rawData)
      if (!validated) {
        setErrorMsg("生成结果解析失败，请重试")
        return
      }
      setResult(validated)
      setErrorMsg(null)
      setActiveTab(0)
    },
    onError: (error) => {
      const msg = error.message || "生成失败"
      setErrorMsg(msg)
      if (msg.includes("API Key")) {
        toast.error("请先配置API Key", {
          action: { label: "去设置", onClick: () => { onClose(); navigate("/settings") } },
        })
      }
    },
  })

  const triggerGenerate = useCallback(() => {
    generateMutation.mutate({
      intent: intent.trim(),
      answers,
      stepMode,
    })
  }, [answers, generateMutation, intent, stepMode])

  useEffect(() => {
    if (hasStarted) return
    if (!intent.trim()) { onClose(); return }
    const timer = setTimeout(() => {
      setHasStarted(true)
      triggerGenerate()
    }, 50)
    return () => clearTimeout(timer)
  }, [hasStarted, intent, onClose, triggerGenerate])

  useEffect(() => {
    if (!generateMutation.isPending) return
    const steps = [1, 2, 3]
    let idx = 0
    const interval = setInterval(() => {
      idx = (idx + 1) % steps.length
      setActiveStep(steps[idx])
    }, 1500)
    return () => clearInterval(interval)
  }, [generateMutation.isPending])

  const saveMutation = trpc.promptForge.saveToLibrary.useMutation({
    onSuccess: () => {
      toast.success("已保存到提示词库")
      onSaved?.()
    },
    onError: (e) => toast.error(e.message),
  })

  const handleSave = useCallback((index: number) => {
    if (!isAuthenticated) { toast.info("请先登录"); return }
    if (!result) return
    const item = result.results[index]
    saveMutation.mutate({
      title: item.title,
      originalIntent: intent,
      generatedPrompt: item.prompt,
      framework: item.framework,
      domain: result.analysis.domain,
    })
    setSavedIds((prev) => new Set(prev).add(index))
  }, [isAuthenticated, result, intent, saveMutation])

  const handleCopy = useCallback((text: string, index: number) => {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
    toast.success("已复制到剪贴板")
  }, [])

  const handleRegenerate = useCallback(() => {
    setResult(null)
    setErrorMsg(null)
    setActiveStep(1)
    setCopiedIndex(null)
    setActiveTab(0)
    setSavedIds(new Set())
    triggerGenerate()
  }, [triggerGenerate])

  if (generateMutation.isPending && !result) {
    return (
      <GenerateLoadingState
        intent={intent}
        activeStep={activeStep}
        onClose={onClose}
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

  if (!result) return null

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
