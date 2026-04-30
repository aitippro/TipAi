import {
  sqliteTable,
  text,
  integer,
  real,
} from "drizzle-orm/sqlite-core";

// ==============================
// SQLite Schema (Electron Desktop)
// Migrated from MySQL for local-first architecture
// ==============================

export const users = sqliteTable("users", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  unionId: text("unionId", { length: 255 }).notNull().unique(),
  // Local login support (for desktop app)
  username: text("username", { length: 255 }).unique(),
  password: text("password", { length: 255 }),
  name: text("name", { length: 255 }),
  email: text("email", { length: 320 }),
  avatar: text("avatar"),
  role: text("role", { length: 20, enum: ["user", "admin"] }).default("user").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$defaultFn(() => new Date()),
  lastSignInAt: integer("lastSignInAt", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const userSettings = sqliteTable("user_settings", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  userId: integer("userId", { mode: "number" }).notNull().unique(),
  // API Keys (encrypted at application layer before storage)
  // DO NOT store plaintext API keys. Encrypt with AES-256-GCM + unique IV per key.
  kimiApiKey: text("kimiApiKey", { length: 500 }),
  openaiApiKey: text("openaiApiKey", { length: 500 }),
  claudeApiKey: text("claudeApiKey", { length: 500 }),
  deepseekApiKey: text("deepseekApiKey", { length: 500 }),
  // Default preferences
  defaultModel: text("defaultModel", { length: 50 }).default("kimi").notNull(),
  defaultFramework: text("defaultFramework", { length: 50 }).default("auto").notNull(),
  defaultLanguage: text("defaultLanguage", { length: 10 }).default("zh").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const promptLibrary = sqliteTable("prompt_library", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  userId: integer("userId", { mode: "number" }).notNull(),
  title: text("title", { length: 255 }).notNull(),
  originalIntent: text("originalIntent"),
  generatedPrompt: text("generatedPrompt").notNull(),
  framework: text("framework", { length: 100 }),
  domain: text("domain", { length: 100 }).default("general"),
  model: text("model", { length: 100 }).default("kimi"),
  rating: integer("rating"),
  tags: text("tags", { length: 500 }),
  useCount: integer("useCount").default(0),
  isFavorite: integer("isFavorite").default(0),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const templates = sqliteTable("templates", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  userId: integer("userId", { mode: "number" }).notNull(),
  title: text("title", { length: 255 }).notNull(),
  description: text("description"),
  framework: text("framework", { length: 100 }),
  domain: text("domain", { length: 100 }).default("general"),
  content: text("content").notNull(),
  tags: text("tags", { length: 500 }),
  useCount: integer("useCount").default(0),
  rating: integer("rating"),
  ratingCount: integer("ratingCount").default(0),
  isPublic: integer("isPublic").default(1),
  isFeatured: integer("isFeatured").default(0),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// Cloud sync tracking
export const cloudSync = sqliteTable("cloud_sync", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  userId: integer("userId", { mode: "number" }).notNull(),
  remoteUrl: text("remoteUrl", { length: 500 }),
  lastSyncAt: integer("lastSyncAt", { mode: "timestamp" }),
  syncStatus: text("syncStatus", { length: 20, enum: ["idle", "syncing", "error", "success"] }).default("idle"),
  errorMessage: text("errorMessage"),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// Projects (for multi-step prompt engineering)
export const projects = sqliteTable("projects", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  userId: integer("userId", { mode: "number" }).notNull(),
  title: text("title", { length: 255 }).notNull(),
  description: text("description"),
  domain: text("domain", { length: 100 }).default("general").notNull(),
  status: text("status", { length: 20, enum: ["draft", "ready", "executing", "completed", "archived"] }).default("draft").notNull(),
  intent: text("intent"),
  clarificationStatus: text("clarificationStatus", { length: 20, enum: ["pending", "in_progress", "completed"] }).default("pending"),
  turnCount: integer("turnCount").default(0),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const steps = sqliteTable("steps", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  projectId: integer("projectId", { mode: "number" }).notNull(),
  title: text("title", { length: 255 }).notNull(),
  description: text("description"),
  prompt: text("prompt").notNull(),
  stage: text("stage", { length: 20, enum: ["clarify", "design", "implement", "test", "deploy", "maintain"] }).default("implement").notNull(),
  orderNum: integer("orderNum").notNull().default(0),
  status: text("status", { length: 20, enum: ["pending", "ready", "executing", "completed", "skipped", "error"] }).default("pending").notNull(),
  output: text("output"),
  parentStepId: integer("parentStepId", { mode: "number" }),
  model: text("model", { length: 100 }).default("kimi"),
  temperature: real("temperature").default(0.7),
  decodeStrategy: text("decode_strategy"),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const promptOptimizations = sqliteTable("prompt_optimizations", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  userId: integer("userId", { mode: "number" }).notNull(),
  originalPrompt: text("originalPrompt").notNull(),
  optimizedPrompt: text("optimizedPrompt").notNull(),
  improvements: text("improvements"),
  domain: text("domain", { length: 100 }).default("general"),
  model: text("model", { length: 100 }).default("kimi"),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const evaluations = sqliteTable("evaluations", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  projectId: integer("projectId", { mode: "number" }).notNull(),
  stepId: integer("stepId", { mode: "number" }),
  userId: integer("userId", { mode: "number" }).notNull(),
  dimension: text("dimension", { length: 20, enum: ["clarity", "relevance", "completeness", "actionability", "overall"] }).notNull(),
  score: integer("score").notNull(),
  feedback: text("feedback"),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const domainPackages = sqliteTable("domain_packages", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  key: text("key", { length: 100 }).notNull().unique(),
  name: text("name", { length: 255 }).notNull(),
  description: text("description"),
  icon: text("icon", { length: 100 }),
  category: text("category", { length: 100 }),
  isActive: integer("isActive").default(1).notNull(),
  prompt: text("prompt"),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// Project conversations for multi-turn clarification dialogues
export const projectConversations = sqliteTable("project_conversations", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  projectId: integer("projectId", { mode: "number" }).notNull(),
  userId: integer("userId", { mode: "number" }).notNull(),
  role: text("role", { length: 20, enum: ["user", "assistant", "system"] }).notNull(),
  content: text("content").notNull(),
  questionId: text("questionId"),
  questionData: text("questionData"),
  answerData: text("answerData"),
  turnNumber: integer("turnNumber").notNull().default(0),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// Project summaries for generated requirement summaries
export const projectSummaries = sqliteTable("project_summaries", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  projectId: integer("projectId", { mode: "number" }).notNull().unique(),
  userId: integer("userId", { mode: "number" }).notNull(),
  summary: text("summary").notNull(),
  requirements: text("requirements"),
  constraints: text("constraints"),
  suggestedFrameworks: text("suggestedFrameworks"),
  rawContext: text("rawContext"),
  isFinalized: integer("isFinalized").default(0),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type UserSettings = typeof userSettings.$inferSelect;
export type PromptLibrary = typeof promptLibrary.$inferSelect;
export type Template = typeof templates.$inferSelect;
export type CloudSync = typeof cloudSync.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Step = typeof steps.$inferSelect;
export type PromptOptimization = typeof promptOptimizations.$inferSelect;
export type Evaluation = typeof evaluations.$inferSelect;
export type DomainPackage = typeof domainPackages.$inferSelect;
export type ProjectConversation = typeof projectConversations.$inferSelect;
export type ProjectSummary = typeof projectSummaries.$inferSelect;
