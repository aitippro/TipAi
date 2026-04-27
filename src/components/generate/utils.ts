import type { GenResult } from "./types"

export const COMPLEXITY_COLORS: Record<string, string> = {
  simple: "bg-emerald-50 text-emerald-700 border-emerald-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  complex: "bg-rose-50 text-rose-700 border-rose-200",
}

export const COMPLEXITY_LABELS: Record<string, string> = {
  simple: "简单",
  medium: "中等",
  complex: "复杂",
}

export function validateGenResult(raw: unknown): GenResult | null {
  if (!raw || typeof raw !== "object") return null
  const result = raw as Record<string, unknown>

  const rawAnalysis = result.analysis
  if (!rawAnalysis || typeof rawAnalysis !== "object") return null
  const analysisRecord = rawAnalysis as Record<string, unknown>
  const analysis = {
    goal: String(analysisRecord.goal ?? ""),
    domain: String(analysisRecord.domain ?? ""),
    complexity: String(analysisRecord.complexity ?? "medium"),
    audience: String(analysisRecord.audience ?? ""),
  }

  const parsedResults: GenResult["results"] = []
  if (Array.isArray(result.results)) {
    for (const item of result.results) {
      if (!item || typeof item !== "object") continue
      const itemRecord = item as Record<string, unknown>
      const tips: string[] = []
      if (Array.isArray(itemRecord.tips)) {
        for (const tip of itemRecord.tips) {
          tips.push(String(tip))
        }
      }
      parsedResults.push({
        title: String(itemRecord.title ?? "生成结果"),
        framework: String(itemRecord.framework ?? ""),
        prompt: String(itemRecord.prompt ?? ""),
        explanation: String(itemRecord.explanation ?? ""),
        tips,
      })
    }
  }
  if (parsedResults.length === 0) return null

  const recommendations: GenResult["recommendations"] = []
  if (Array.isArray(result.recommendations)) {
    for (const recommendation of result.recommendations) {
      if (!recommendation || typeof recommendation !== "object") continue
      const recommendationRecord = recommendation as Record<string, unknown>
      recommendations.push({
        framework: String(recommendationRecord.framework ?? ""),
        frameworkName: String(recommendationRecord.frameworkName ?? ""),
        confidence: Number(recommendationRecord.confidence ?? 0),
      })
    }
  }

  let slashCmd: GenResult["slashCmd"] = null
  if (result.slashCmd && typeof result.slashCmd === "object") {
    const slashRecord = result.slashCmd as Record<string, unknown>
    slashCmd = {
      command: String(slashRecord.command ?? ""),
      name: String(slashRecord.name ?? ""),
      targetModel: String(slashRecord.targetModel ?? ""),
    }
  }

  let stepDecomposition: GenResult["stepDecomposition"] = null
  if (result.stepDecomposition && typeof result.stepDecomposition === "object") {
    const decompositionRecord = result.stepDecomposition as Record<string, unknown>
    const steps: NonNullable<GenResult["stepDecomposition"]>["steps"] = []
    if (Array.isArray(decompositionRecord.steps)) {
      for (const step of decompositionRecord.steps) {
        if (!step || typeof step !== "object") continue
        const stepRecord = step as Record<string, unknown>
        steps.push({
          stepNumber: Number(stepRecord.stepNumber ?? 0),
          title: String(stepRecord.title ?? ""),
          description: String(stepRecord.description ?? ""),
          inputNeeded: String(stepRecord.inputNeeded ?? ""),
          estimatedComplexity: String(stepRecord.estimatedComplexity ?? ""),
        })
      }
    }
    stepDecomposition = {
      shouldDecompose: Boolean(decompositionRecord.shouldDecompose),
      reason: String(decompositionRecord.reason ?? ""),
      steps,
    }
  }

  return {
    analysis,
    recommendations,
    results: parsedResults,
    model: String(result.model ?? ""),
    slashCmd,
    stepDecomposition,
  }
}
