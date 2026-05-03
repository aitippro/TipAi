/*
 * TipAi Native Addon — TypeScript Type Definitions
 * Generated from Rust NAPI-RS exports (tipai-core v1.2.2)
 *
 * DO NOT EDIT MANUALLY unless adding new exports.
 * Rebuild: cd native && npm run build
 */

// ============================================================================
// Core
// ============================================================================

/** Returns the native addon crate version (e.g. "1.2.2") */
export function version(): string

/** Open SQLite database at path. Optional secretKey enables AES-256-GCM encryption at rest. */
export function dbOpen(path: string, secretKey?: string): void

/** Run pending `.sql` migrations from directory. */
export function dbMigrate(migrationsDir: string): void

/** Close the global database handle. */
export function dbClose(): void

// ============================================================================
// Crypto
// ============================================================================

/** AES-256-GCM encrypt. Empty password = pass-through. */
export function encrypt(plaintext: string, password: string): string

/** AES-256-GCM decrypt. Empty password = pass-through. */
export function decrypt(ciphertext: string, password: string): string

// ============================================================================
// AI Client
// ============================================================================

export interface AiCallRequest {
  provider: string
  apiKey: string
  modelId?: string
  baseUrl?: string
  systemPrompt: string
  userMessage: string
  temperature?: number
  maxTokens?: number
  timeoutMs?: number
}

export interface AiCallResponse {
  content: string
  error?: string
}

/** Single AI provider HTTP call (async). */
export function aiCall(req: AiCallRequest): Promise<AiCallResponse>

/** Multi-path sampling + voting (async). sampleCount clamped 3-10. */
export function aiCallSelfConsistency(req: AiCallRequest, sampleCount?: number): Promise<AiCallResponse>

// ============================================================================
// User Settings
// ============================================================================

export interface UserSettings {
  userId: number
  defaultModel: string
  defaultFramework: string
  defaultLanguage: string
  hasKimiKey: boolean
  hasOpenaiKey: boolean
  hasClaudeKey: boolean
  hasDeepseekKey: boolean
}

export interface UpdateSettings {
  defaultModel?: string
  defaultFramework?: string
  defaultLanguage?: string
  kimiApiKey?: string
  openaiApiKey?: string
  claudeApiKey?: string
  deepseekApiKey?: string
}

export function settingsGet(userId: number): UserSettings
export function settingsUpdate(userId: number, data: UpdateSettings): void
export function settingsGetApiKey(userId: number, provider: string): string | undefined

// ============================================================================
// Users
// ============================================================================

export interface User {
  id: number
  unionId: string
  username?: string
  password?: string
  name?: string
  email?: string
  avatar?: string
  role: string
  createdAt?: string
  updatedAt?: string
  lastSignInAt?: string
}

export interface InsertUser {
  unionId: string
  username?: string
  password?: string
  name?: string
  email?: string
  avatar?: string
  role?: string
}

export function userFindByUnionId(unionId: string): User | undefined
export function userFindById(id: number): User | undefined
export function userFindByUsername(username: string): User | undefined
export function userUpsert(data: InsertUser): User

// ============================================================================
// Prompt Library
// ============================================================================

export interface PromptEntry {
  id: number
  userId: number
  title: string
  originalIntent?: string
  generatedPrompt: string
  framework?: string
  domain?: string
  model?: string
  rating?: number
  tags?: string
  useCount: number
  isFavorite: number
  createdAt?: string
  updatedAt?: string
}

export interface InsertPrompt {
  userId: number
  title: string
  originalIntent?: string
  generatedPrompt: string
  framework?: string
  domain?: string
  model?: string
  tags?: string
}

export interface ListOpts {
  limit?: number
  offset?: number
  domain?: string
  isFavorite?: number
  search?: string
}

export function promptList(userId: number, opts?: ListOpts): PromptEntry[]
export function promptCreate(data: InsertPrompt): PromptEntry
export function promptDelete(id: number, userId: number): void
export function promptUpdateFavorite(id: number, userId: number, isFavorite: number): void

// ============================================================================
// Templates
// ============================================================================

export interface TemplateEntry {
  id: number
  userId: number
  title: string
  description?: string
  framework?: string
  domain?: string
  content: string
  tags?: string
  useCount: number
  rating?: number
  ratingCount: number
  isPublic: number
  isFeatured: number
  createdAt?: string
}

export interface InsertTemplate {
  userId: number
  title: string
  description?: string
  framework?: string
  domain?: string
  content: string
  tags?: string
  isPublic?: number
}

export interface TemplateRateResult {
  newRating: number
  newCount: number
}

export function templateListPublic(): TemplateEntry[]
export function templateListByUser(userId: number): TemplateEntry[]
export function templateCreate(data: InsertTemplate): TemplateEntry
export function templateDelete(id: number, userId: number): void
export function templateUse(id: number): void
export function templateRate(id: number, score: number): TemplateRateResult

// ============================================================================
// Projects
// ============================================================================

export interface ProjectEntry {
  id: number
  userId: number
  title: string
  description?: string
  domain: string
  status: string
  intent?: string
  clarificationStatus?: string
  turnCount: number
  createdAt?: string
  updatedAt?: string
}

export interface InsertProject {
  userId: number
  title: string
  description?: string
  domain?: string
  status?: string
  intent?: string
}

export interface UpdateProject {
  title?: string
  description?: string
  status?: string
  intent?: string
  clarificationStatus?: string
  turnCount?: number
}

export function projectList(userId: number): ProjectEntry[]
export function projectCreate(data: InsertProject): ProjectEntry
export function projectDelete(id: number, userId: number): void
export function projectGetById(id: number, userId: number): ProjectEntry | undefined
export function projectUpdate(id: number, userId: number, data: UpdateProject): ProjectEntry | undefined

// ============================================================================
// Steps
// ============================================================================

export interface StepEntry {
  id: number
  projectId: number
  title: string
  description?: string
  prompt: string
  stage: string
  orderNum: number
  status: string
  output?: string
  parentStepId?: number
  model?: string
  temperature?: number
  decodeStrategy?: string
  createdAt?: string
  updatedAt?: string
}

export interface InsertStep {
  projectId: number
  title: string
  description?: string
  prompt: string
  stage?: string
  orderNum?: number
  parentStepId?: number
  model?: string
  temperature?: number
  decodeStrategy?: string
}

export interface UpdateStep {
  title?: string
  description?: string
  prompt?: string
  status?: string
  output?: string
  model?: string
  temperature?: number
}

export function stepList(projectId: number): StepEntry[]
export function stepUpdate(id: number, data: UpdateStep): StepEntry
export function stepGetById(id: number): StepEntry | undefined
export function stepCreate(data: InsertStep): StepEntry

// ============================================================================
// Conversations
// ============================================================================

export interface ConversationEntry {
  id: number
  projectId: number
  userId: number
  role: string
  content: string
  questionId?: string
  questionData?: string
  answerData?: string
  turnNumber: number
  createdAt?: string
}

export interface InsertConversation {
  projectId: number
  userId: number
  role: string
  content: string
  questionId?: string
  questionData?: string
  answerData?: string
  turnNumber?: number
}

export function conversationCreate(data: InsertConversation): ConversationEntry
export function conversationListByProject(projectId: number): ConversationEntry[]

// ============================================================================
// Summaries
// ============================================================================

export interface SummaryEntry {
  id: number
  projectId: number
  userId: number
  summary: string
  requirements?: string
  constraints?: string
  suggestedFrameworks?: string
  rawContext?: string
  isFinalized: number
  createdAt?: string
  updatedAt?: string
}

export interface InsertSummary {
  projectId: number
  userId: number
  summary: string
  requirements?: string
  constraints?: string
  suggestedFrameworks?: string
  rawContext?: string
  isFinalized?: number
}

export function summaryGetByProject(projectId: number): SummaryEntry | undefined
export function summaryUpsert(data: InsertSummary): SummaryEntry

// ============================================================================
// Evaluations (Feedback)
// ============================================================================

export interface EvaluationEntry {
  id: number
  projectId: number
  stepId?: number
  userId: number
  dimension: string
  score: number
  feedback?: string
  createdAt?: string
}

export interface InsertEvaluation {
  projectId: number
  stepId?: number
  userId: number
  dimension: string
  score: number
  feedback?: string
}

export interface EvaluationStats {
  totalCount: number
  avgClarity?: number
  avgRelevance?: number
  avgCompleteness?: number
  avgActionability?: number
  avgOverall?: number
}

export function evaluationCreate(data: InsertEvaluation): EvaluationEntry
export function evaluationStats(projectId?: number): EvaluationStats
export function evaluationList(projectId?: number, limit?: number): EvaluationEntry[]

// ============================================================================
// Optimizations
// ============================================================================

export interface OptimizationEntry {
  id: number
  userId: number
  originalPrompt: string
  optimizedPrompt: string
  improvements?: string
  domain?: string
  model?: string
  createdAt?: string
}

export interface InsertOptimization {
  userId: number
  originalPrompt: string
  optimizedPrompt: string
  improvements?: string
  domain?: string
  model?: string
}

export function optimizerRunCreate(data: InsertOptimization): OptimizationEntry
export function optimizerRunList(userId: number, limit?: number): OptimizationEntry[]

// ============================================================================
// Quality Gate (v2.0+ 下沉 Rust)
// ============================================================================

export interface QualityCheck {
  id: string
  name: string
  passed: boolean
  score: number
  message: string
  severity: string
  suggestion: string
}

export interface QualityGateResult {
  overallScore: number
  passed: boolean
  threshold: number
  checks: QualityCheck[]
  summary: string
  topIssues: QualityCheck[]
}

/** Run 12 automated quality checks on a prompt. */
export function runQualityGate(prompt: string, enabledChecks?: string[], threshold?: number): QualityGateResult

// ============================================================================
// Drift Detection (v2.0+ 下沉 Rust)
// ============================================================================

export interface DriftCheck {
  version: string
  similarityToBaseline: number
}

export interface DriftResult {
  driftScore: number
  hasDrift: boolean
  trend: string
  warnings: string[]
  suggestions: string[]
  checks: DriftCheck[]
}

/** Detect prompt drift across versions using TF vectors + cosine similarity. */
export function detectDrift(versions: string[], baselineIndex?: number): DriftResult

/** Compare two text versions and return similarity + token differences. */
export function compareVersions(a: string, b: string): {
  similarity: number
  commonTokens: string[]
  uniqueToA: string[]
  uniqueToB: string[]
}
