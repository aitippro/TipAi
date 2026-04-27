export interface GenResult {
  analysis: {
    goal: string
    domain: string
    complexity: string
    audience: string
  }
  recommendations: Array<{
    framework: string
    frameworkName: string
    confidence: number
  }>
  results: Array<{
    title: string
    framework: string
    prompt: string
    explanation: string
    tips: string[]
  }>
  model: string
  slashCmd: { command: string; name: string; targetModel: string } | null
  stepDecomposition: {
    shouldDecompose: boolean
    reason: string
    steps: Array<{
      stepNumber: number
      title: string
      description: string
      inputNeeded: string
      estimatedComplexity: string
    }>
  } | null
}
