export type TemplateDraftType = "single_prompt" | "multi_step" | "workflow"

export interface TemplateItem {
  id: number
  userId: number
  title: string
  description: string | null
  framework: string | null
  domain: string | null
  content: string
  tags: string | null
  useCount: number | null
  rating: number | null
  ratingCount: number | null
  isPublic: number | null
  isFeatured: number | null
  createdAt: Date | null
}

export interface TemplateDraft {
  title: string
  description: string
  domain: string
  type: TemplateDraftType
  content: string
  tags: string
}

export function createEmptyTemplateDraft(): TemplateDraft {
  return {
    title: "",
    description: "",
    domain: "general",
    type: "single_prompt",
    content: "",
    tags: "",
  }
}
