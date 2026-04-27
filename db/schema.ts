import {
  mysqlTable,
  mysqlEnum,
  serial,
  varchar,
  text,
  timestamp,
  int,
  bigint,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  // User table with all fields
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  // Local login support (for dev/test environments)
  username: varchar("username", { length: 255 }).unique(),
  password: varchar("password", { length: 255 }),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

// Legacy tables (kept for db:push compatibility)
export const projects = mysqlTable("projects", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  domain: varchar("domain", { length: 100 }).default("general").notNull(),
  status: mysqlEnum("status", ["draft", "ready", "executing", "completed", "archived"]).default("draft").notNull(),
  intent: text("intent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export const steps = mysqlTable("steps", {
  id: serial("id").primaryKey(),
  projectId: bigint("projectId", { mode: "number", unsigned: true }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  prompt: text("prompt").notNull(),
  orderNum: int("orderNum").notNull().default(0),
  status: mysqlEnum("status", ["pending", "ready", "executing", "completed", "skipped", "error"]).default("pending").notNull(),
  output: text("output"),
  model: varchar("model", { length: 100 }).default("kimi"),
  temperature: varchar("temperature", { length: 10 }).default("0.7"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export const domainPackages = mysqlTable("domain_packages", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 100 }),
  category: varchar("category", { length: 100 }),
  isActive: int("isActive").default(1).notNull(),
  prompt: text("prompt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const promptOptimizations = mysqlTable("prompt_optimizations", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  originalPrompt: text("originalPrompt").notNull(),
  optimizedPrompt: text("optimizedPrompt").notNull(),
  improvements: text("improvements"),
  domain: varchar("domain", { length: 100 }).default("general"),
  model: varchar("model", { length: 100 }).default("kimi"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const evaluations = mysqlTable("evaluations", {
  id: serial("id").primaryKey(),
  projectId: bigint("projectId", { mode: "number", unsigned: true }).notNull(),
  stepId: bigint("stepId", { mode: "number", unsigned: true }),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  dimension: mysqlEnum("dimension", ["clarity", "relevance", "completeness", "actionability", "overall"]).notNull(),
  score: int("score").notNull(),
  feedback: text("feedback"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export const userSettings = mysqlTable("user_settings", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull().unique(),
  // API Keys (encrypted at application layer before storage)
  // DO NOT store plaintext API keys. Encrypt with AES-256-GCM + unique IV per key.
  kimiApiKey: varchar("kimiApiKey", { length: 500 }),
  openaiApiKey: varchar("openaiApiKey", { length: 500 }),
  claudeApiKey: varchar("claudeApiKey", { length: 500 }),
  deepseekApiKey: varchar("deepseekApiKey", { length: 500 }),
  // Default preferences
  defaultModel: varchar("defaultModel", { length: 50 }).default("kimi").notNull(),
  defaultFramework: varchar("defaultFramework", { length: 50 }).default("auto").notNull(),
  defaultLanguage: varchar("defaultLanguage", { length: 10 }).default("zh").notNull(),
  // User prompts library
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type UserSettings = typeof userSettings.$inferSelect;

// Prompt Library - user's saved prompts
export const promptLibrary = mysqlTable("prompt_library", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  originalIntent: text("originalIntent"),
  generatedPrompt: text("generatedPrompt").notNull(),
  framework: varchar("framework", { length: 100 }),
  domain: varchar("domain", { length: 100 }).default("general"),
  model: varchar("model", { length: 100 }).default("kimi"),
  rating: int("rating"),
  tags: varchar("tags", { length: 500 }),
  useCount: int("useCount").default(0),
  isFavorite: int("isFavorite").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type PromptLibrary = typeof promptLibrary.$inferSelect;

// Templates - community prompt templates
export const templates = mysqlTable("templates", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  framework: varchar("framework", { length: 100 }),
  domain: varchar("domain", { length: 100 }).default("general"),
  content: text("content").notNull(),
  tags: varchar("tags", { length: 500 }),
  useCount: int("useCount").default(0),
  rating: int("rating"),
  ratingCount: int("ratingCount").default(0),
  isPublic: int("isPublic").default(1),
  isFeatured: int("isFeatured").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Template = typeof templates.$inferSelect;
