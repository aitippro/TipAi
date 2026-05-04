// ==========================================
// 纯类型定义（原 Drizzle Schema 迁移）
// 不再依赖 drizzle-orm，仅作为 TypeScript 类型使用
// ==========================================

export interface User {
  id: number;
  unionId: string;
  username?: string | null;
  name?: string | null;
  email?: string | null;
  avatar?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  lastSignInAt?: Date | string;
}

export interface InsertUser {
  unionId: string;
  username?: string;
  name?: string;
  email?: string;
  avatar?: string;
  lastSignInAt?: Date | string;
}

export interface UserSettings {
  id?: number;
  userId: number;
  kimiApiKey?: string | null;
  openaiApiKey?: string | null;
  claudeApiKey?: string | null;
  deepseekApiKey?: string | null;
  defaultModel?: string;
  defaultFramework?: string;
  defaultLanguage?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface PromptLibrary {
  id: number;
  userId: number;
  title: string;
  originalIntent?: string | null;
  generatedPrompt: string;
  framework?: string | null;
  domain?: string | null;
  model?: string | null;
  rating?: number | null;
  tags?: string | null;
  useCount?: number;
  isFavorite?: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface InsertPrompt {
  userId: number;
  title: string;
  originalIntent?: string;
  generatedPrompt: string;
  framework?: string;
  domain?: string;
  model?: string;
  tags?: string;
  isFavorite?: number;
}

export interface UpdatePrompt {
  title?: string;
  originalIntent?: string;
  generatedPrompt?: string;
  framework?: string;
  domain?: string;
  model?: string;
  tags?: string;
  isFavorite?: number;
}

export interface TemplateEntry {
  id: number;
  userId: number;
  title: string;
  description?: string | null;
  framework?: string | null;
  domain?: string | null;
  content: string;
  tags?: string | null;
  useCount?: number;
  rating?: number | null;
  ratingCount?: number;
  isPublic?: number;
  isFeatured?: number;
  createdAt?: Date | string;
}

export interface InsertTemplate {
  userId: number;
  title: string;
  description?: string;
  framework?: string;
  domain?: string;
  content: string;
  tags?: string;
  isPublic?: number;
}

export interface UpdateTemplate {
  title?: string;
  description?: string;
  framework?: string;
  domain?: string;
  content?: string;
  tags?: string;
  isPublic?: number;
}

export interface ProjectEntry {
  id: number;
  userId: number;
  title: string;
  description?: string | null;
  domain?: string | null;
  intent?: string | null;
  framework?: string | null;
  status?: "draft" | "ready" | "executing" | "completed" | "archived";
  clarificationStatus?: "completed" | "pending" | "in_progress";
  turnCount?: number;
  currentStepId?: number | null;
  rating?: number | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface InsertProject {
  userId: number;
  title: string;
  description?: string;
  domain?: string;
  intent?: string;
  framework?: string;
  status?: string;
}

export interface UpdateProject {
  title?: string;
  description?: string;
  domain?: string;
  intent?: string;
  framework?: string;
  status?: string;
  clarificationStatus?: string;
  turnCount?: number;
  currentStepId?: number;
  rating?: number;
}

export interface StepEntry {
  id: number;
  projectId: number;
  title: string;
  description?: string | null;
  stage?: string | null;
  status?: string | null;
  orderIndex?: number;
  parentId?: number | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface InsertStep {
  projectId: number;
  title: string;
  description?: string;
  stage?: string;
  status?: string;
  orderIndex?: number;
  parentId?: number;
}

export interface UpdateStep {
  title?: string;
  description?: string;
  stage?: string;
  status?: string;
  orderIndex?: number;
  parentId?: number;
}

export interface ProjectConversation {
  id: number;
  projectId: number;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: Date | string;
}

export interface ProjectSummary {
  id: number;
  projectId: number;
  summaryType: string;
  content: string;
  createdAt?: Date | string;
}

export interface Evaluation {
  id: number;
  promptId?: number | null;
  projectId?: number | null;
  userId: number;
  score: number;
  dimension: string;
  feedback?: string | null;
  createdAt?: Date | string;
}

export interface DomainPackage {
  id: number;
  domain: string;
  packageName: string;
  description?: string | null;
  prompts?: string | null;
  createdAt?: Date | string;
}

export interface PromptOptimization {
  id: number;
  promptId: number;
  userId: number;
  strategy: string;
  originalPrompt?: string | null;
  optimizedPrompt?: string | null;
  improvements?: string | null;
  domain?: string | null;
  beforeScore?: number | null;
  afterScore?: number | null;
  iterations?: number;
  createdAt?: Date | string;
}
