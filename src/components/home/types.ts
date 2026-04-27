import type { LucideIcon } from "lucide-react"

export interface SlashCommandDefinition {
  command: string
  name: string
  desc: string
  icon: LucideIcon
  color: string
}

export interface ClarificationQuestion {
  id: string
  question: string
  options?: string[]
  type: string
  why: string
  required?: boolean
}

export type ClarificationAnswers = Record<string, string>
