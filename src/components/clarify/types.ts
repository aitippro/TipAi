export interface ClarifyMessage {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  questionData?: ClarifyQuestion | null
  answerData?: ClarifyAnswer | null
  turnNumber?: number
  isLoading?: boolean
}

export interface ClarifyQuestion {
  id: string
  question: string
  type: "choice" | "text" | "multichoice"
  options?: string[]
  why: string
  required: boolean
}

export interface ClarifyAnswer {
  value?: string
  selectedOptions?: string[]
}

export interface RequirementSummary {
  summary: string
  requirements: string[]
  constraints: string[]
  suggestedFrameworks: string[]
  intentAnalysis: {
    goal: string
    domain: string
    complexity: "simple" | "medium" | "complex"
    audience: string
    tone: string
    style: string
    outputFormat: string
  }
}

export interface ProjectItem {
  id: number
  title: string
  description: string | null
  domain: string
  status: string
  intent: string | null
  clarificationStatus: string | null
  turnCount: number | null
  createdAt: Date | null
  updatedAt: Date | null
}

export interface ProjectConversationTurn {
  id: number
  role: string
  content: string
  questionData?: ClarifyQuestion | null
  answerData?: ClarifyAnswer | null
  turnNumber: number
  createdAt: Date | null
}

export interface ProjectSummaryItem {
  id: number
  summary: string
  requirements: string[]
  constraints: string[]
  suggestedFrameworks: string[]
  isFinalized: number | null
  createdAt: Date | null
}
