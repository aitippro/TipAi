/**
 * Native Addon Polyfill — Real SQLite Implementation
 *
 * When the Rust native binary is unavailable (e.g. Linux x64 .node missing),
 * this module provides genuine business-logic implementations using better-sqlite3.
 *
 * This is NOT a mock. Every function performs real database CRUD operations.
 * When the Rust binary is compiled and present, native.ts prefers it over this polyfill.
 */

import path from "path";
import crypto from "crypto";
import { createRequire } from "module";

const _require = createRequire(import.meta.url);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let db: any = null;

function getDb() {
  if (db) return db;
  const Database = _require("better-sqlite3");

  const dbUrl = process.env.DATABASE_URL || "";
  const dbPath = dbUrl.startsWith("file:")
    ? dbUrl.slice(5)
    : path.join(process.env.USER_DATA_PATH || process.cwd(), "data", "tipai.db");

  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  return db;
}

function nowUnix(): number {
  return Math.floor(Date.now() / 1000);
}

// ============================================================================
// Crypto — matches Rust native/src/crypto/mod.rs format exactly
// PBKDF2-SHA256 (600k iter) + AES-256-GCM with salt+nonce prefix + base64
// ============================================================================

const SALT_LEN = 16;
const NONCE_LEN = 12;
const KEY_LEN = 32;
const PBKDF2_ITER = 600000;

function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, PBKDF2_ITER, KEY_LEN, "sha256");
}

function encrypt(plaintext: string, password: string): string {
  if (!password) return plaintext;
  const salt = crypto.randomBytes(SALT_LEN);
  const nonce = crypto.randomBytes(NONCE_LEN);
  const key = deriveKey(password, salt);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, nonce);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const combined = Buffer.concat([salt, nonce, encrypted, authTag]);
  return combined.toString("base64");
}

function decrypt(ciphertextB64: string, password: string): string {
  if (!password) return ciphertextB64;
  const data = Buffer.from(ciphertextB64, "base64");
  if (data.length < SALT_LEN + NONCE_LEN + 16) {
    throw new Error("Ciphertext too short");
  }
  const salt = data.subarray(0, SALT_LEN);
  const nonce = data.subarray(SALT_LEN, SALT_LEN + NONCE_LEN);
  const authTag = data.subarray(data.length - 16);
  const ciphertext = data.subarray(SALT_LEN + NONCE_LEN, data.length - 16);
  const key = deriveKey(password, salt);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, nonce);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf8");
}

// ============================================================================
// Domain Packages
// ============================================================================

function domainPackageUpsert(data: Record<string, unknown>) {
  const now = nowUnix();
  getDb()
    .prepare(
      `INSERT INTO domain_packages ("key", name, description, icon, category, isActive, prompt, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT("key") DO UPDATE SET
         name = COALESCE(excluded.name, domain_packages.name),
         description = COALESCE(excluded.description, domain_packages.description),
         icon = COALESCE(excluded.icon, domain_packages.icon),
         category = COALESCE(excluded.category, domain_packages.category),
         prompt = COALESCE(excluded.prompt, domain_packages.prompt)`,
    )
    .run(
      data.key,
      data.name,
      data.description ?? null,
      data.icon ?? null,
      data.category ?? null,
      data.isActive ?? 1,
      data.prompt ?? null,
      now,
    );
}

// ============================================================================
// Users
// ============================================================================

function userFindByUnionId(unionId: string) {
  return (
    getDb()
      .prepare(
        `SELECT id, unionId, username, password, name, email, avatar, role,
                datetime(createdAt, 'unixepoch') as created_at,
                datetime(updatedAt, 'unixepoch') as updated_at,
                datetime(lastSignInAt, 'unixepoch') as last_sign_in_at
         FROM users WHERE unionId = ?`,
      )
      .get(unionId) || null
  );
}

function userFindById(id: number) {
  return (
    getDb()
      .prepare(
        `SELECT id, unionId, username, password, name, email, avatar, role,
                datetime(createdAt, 'unixepoch') as created_at,
                datetime(updatedAt, 'unixepoch') as updated_at,
                datetime(lastSignInAt, 'unixepoch') as last_sign_in_at
         FROM users WHERE id = ?`,
      )
      .get(id) || null
  );
}

function userFindByUsername(username: string) {
  return (
    getDb()
      .prepare(
        `SELECT id, unionId, username, password, name, email, avatar, role,
                datetime(createdAt, 'unixepoch') as created_at,
                datetime(updatedAt, 'unixepoch') as updated_at,
                datetime(lastSignInAt, 'unixepoch') as last_sign_in_at
         FROM users WHERE username = ?`,
      )
      .get(username) || null
  );
}

function userUpsert(data: Record<string, unknown>) {
  const now = nowUnix();
  // Accept camelCase unionId with snake_case fallback
  const unionId = String(data.unionId || data.union_id || "");
  getDb()
    .prepare(
      `INSERT INTO users (unionId, username, password, name, email, avatar, role, createdAt, updatedAt, lastSignInAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(unionId) DO UPDATE SET
         username = COALESCE(excluded.username, users.username),
         password = COALESCE(excluded.password, users.password),
         name = COALESCE(excluded.name, users.name),
         email = COALESCE(excluded.email, users.email),
         avatar = COALESCE(excluded.avatar, users.avatar),
         role = COALESCE(excluded.role, users.role),
         updatedAt = excluded.updatedAt,
         lastSignInAt = excluded.lastSignInAt`,
    )
    .run(
      unionId,
      data.username ?? null,
      data.password ?? null,
      data.name ?? null,
      data.email ?? null,
      data.avatar ?? null,
      data.role ?? "user",
      now,
      now,
      now,
    );
  return userFindByUnionId(unionId);
}

// ============================================================================
// Projects
// ============================================================================

function projectList(userId: number) {
  return getDb()
    .prepare(
      `SELECT id, userId as user_id, title, description, domain, status, intent,
              clarificationStatus as clarification_status, turnCount as turn_count,
              datetime(createdAt, 'unixepoch') as created_at,
              datetime(updatedAt, 'unixepoch') as updated_at
       FROM projects WHERE userId = ?
       ORDER BY updatedAt DESC`,
    )
    .all(userId);
}

function projectCreate(data: Record<string, unknown>) {
  const now = nowUnix();
  const userId = data.userId ?? data.user_id;
  const result = getDb()
    .prepare(
      `INSERT INTO projects (userId, title, description, domain, status, intent, clarificationStatus, turnCount, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', 0, ?, ?)`,
    )
    .run(
      userId,
      data.title,
      data.description ?? null,
      data.domain ?? "general",
      data.status ?? "draft",
      data.intent ?? null,
      now,
      now,
    );
  return projectGetById(Number(result.lastInsertRowid), Number(userId));
}

function projectDelete(id: number, userId: number) {
  const d = getDb();
  const del = d.transaction((pid: number, uid: number) => {
    d.prepare("DELETE FROM steps WHERE projectId = ?").run(pid);
    d.prepare("DELETE FROM projects WHERE id = ? AND userId = ?").run(pid, uid);
  });
  del(id, userId);
}

function projectGetById(id: number, userId: number) {
  const row = getDb()
    .prepare(
      `SELECT id, userId as user_id, title, description, domain, status, intent,
              clarificationStatus as clarification_status, turnCount as turn_count,
              datetime(createdAt, 'unixepoch') as created_at,
              datetime(updatedAt, 'unixepoch') as updated_at
       FROM projects WHERE id = ? AND userId = ?`,
    )
    .get(id, userId);
  return row || null;
}

function projectUpdate(
  id: number,
  userId: number,
  data: Record<string, unknown>,
) {
  const fields: string[] = [];
  const values: unknown[] = [];

  const map: Record<string, string> = {
    title: "title",
    description: "description",
    status: "status",
    intent: "intent",
    clarificationStatus: "clarificationStatus",
    turnCount: "turnCount",
  };

  for (const [jsKey, sqlKey] of Object.entries(map)) {
    if (data[jsKey] !== undefined) {
      fields.push(`${sqlKey} = ?`);
      values.push(data[jsKey]);
    }
  }

  if (fields.length === 0) return projectGetById(id, userId);

  fields.push("updatedAt = ?");
  values.push(nowUnix());
  values.push(id);
  values.push(userId);

  getDb()
    .prepare(`UPDATE projects SET ${fields.join(", ")} WHERE id = ? AND userId = ?`)
    .run(...values);

  return projectGetById(id, userId);
}

// ============================================================================
// Steps
// ============================================================================

function stepList(projectId: number) {
  return getDb()
    .prepare(
      `SELECT id, projectId as project_id, title, description, prompt, stage,
              orderNum as order_num, status, output, parentStepId as parent_step_id,
              model, temperature, decodeStrategy as decode_strategy,
              datetime(createdAt, 'unixepoch') as created_at,
              datetime(updatedAt, 'unixepoch') as updated_at
       FROM steps WHERE projectId = ? ORDER BY orderNum ASC`,
    )
    .all(projectId);
}

function stepGetById(id: number) {
  return (
    getDb()
      .prepare(
        `SELECT id, projectId as project_id, title, description, prompt, stage,
                orderNum as order_num, status, output, parentStepId as parent_step_id,
                model, temperature, decodeStrategy as decode_strategy,
                datetime(createdAt, 'unixepoch') as created_at,
                datetime(updatedAt, 'unixepoch') as updated_at
         FROM steps WHERE id = ?`,
      )
      .get(id) || null
  );
}

function stepCreate(data: Record<string, unknown>) {
  const now = nowUnix();
  const projectId = data.projectId ?? data.project_id;
  const orderNum = data.orderNum ?? data.order_num ?? 0;
  const parentStepId = data.parentStepId ?? data.parent_step_id ?? null;
  const decodeStrategy = data.decodeStrategy ?? data.decode_strategy ?? null;
  const result = getDb()
    .prepare(
      `INSERT INTO steps
       (projectId, title, description, prompt, stage, orderNum, status, output,
        parentStepId, model, temperature, decodeStrategy, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(projectId, data.title, data.description ?? null, data.prompt, data.stage ?? "implement", orderNum, "pending", null, parentStepId, data.model ?? "kimi", data.temperature ?? 0.7, decodeStrategy, now, now);

  return stepGetById(result.lastInsertRowid as number);
}

function stepUpdate(id: number, data: Record<string, unknown>) {
  const fields: string[] = [];
  const values: unknown[] = [];

  const map: Record<string, string> = {
    title: "title",
    description: "description",
    prompt: "prompt",
    status: "status",
    output: "output",
    model: "model",
    temperature: "temperature",
    // Handle both camelCase and snake_case for parentStepId
    parentStepId: "parentStepId",
  };

  for (const [jsKey, sqlKey] of Object.entries(map)) {
    if (data[jsKey] !== undefined) {
      fields.push(`${sqlKey} = ?`);
      values.push(data[jsKey]);
    }
  }

  if (fields.length === 0) return stepGetById(id);

  fields.push("updatedAt = ?");
  values.push(nowUnix());
  values.push(id);

  getDb()
    .prepare(`UPDATE steps SET ${fields.join(", ")} WHERE id = ?`)
    .run(...values);

  return stepGetById(id);
}

function stepDelete(id: number, projectId: number) {
  getDb()
    .prepare("DELETE FROM steps WHERE id = ? AND projectId = ?")
    .run(id, projectId);
}

// ============================================================================
// Conversations
// ============================================================================

function conversationCreate(data: Record<string, unknown>) {
  const now = nowUnix();
  const projectId = data.projectId ?? data.project_id;
  const userId = data.userId ?? data.user_id;
  const role = data.role;
  const content = data.content;
  const questionId = data.questionId ?? data.question_id ?? null;
  const questionData = data.questionData ?? data.question_data ?? null;
  const answerData = data.answerData ?? data.answer_data ?? null;
  const turnNumber = data.turnNumber ?? data.turn_number ?? 0;
  const result = getDb()
    .prepare(
      `INSERT INTO project_conversations
       (projectId, userId, role, content, questionId, questionData, answerData, turnNumber, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(projectId, userId, role, content, questionId, questionData, answerData, turnNumber, now);

  return {
    id: result.lastInsertRowid,
    project_id: projectId,
    user_id: userId,
    role,
    content,
    question_id: questionId,
    question_data: questionData,
    answer_data: answerData,
    turn_number: turnNumber,
    created_at: new Date(now * 1000).toISOString(),
  };
}

function conversationListByProject(projectId: number) {
  return getDb()
    .prepare(
      `SELECT id, projectId as project_id, userId as user_id, role, content,
              questionId as question_id, questionData as question_data,
              answerData as answer_data, turnNumber as turn_number,
              datetime(createdAt, 'unixepoch') as created_at
       FROM project_conversations WHERE projectId = ? ORDER BY turnNumber ASC, createdAt ASC`,
    )
    .all(projectId);
}

// ============================================================================
// Summaries
// ============================================================================

function summaryGetByProject(projectId: number) {
  const row = getDb()
    .prepare(
      `SELECT id, projectId as project_id, userId as user_id, summary,
              requirements, constraints, suggestedFrameworks as suggested_frameworks,
              rawContext as raw_context, isFinalized as is_finalized,
              datetime(createdAt, 'unixepoch') as created_at,
              datetime(updatedAt, 'unixepoch') as updated_at
       FROM project_summaries WHERE projectId = ?`,
    )
    .get(projectId);
  return row || null;
}

function summaryUpsert(data: Record<string, unknown>) {
  const now = nowUnix();
  const projectId = data.projectId ?? data.project_id;
  const userId = data.userId ?? data.user_id;
  const suggestedFrameworks = data.suggestedFrameworks ?? data.suggested_frameworks ?? null;
  const rawContext = data.rawContext ?? data.raw_context ?? null;
  const isFinalized = data.isFinalized ?? data.is_finalized ?? 0;
  const existing = getDb()
    .prepare("SELECT id FROM project_summaries WHERE projectId = ?")
    .get(projectId);

  if (existing) {
    getDb()
      .prepare(
        `UPDATE project_summaries SET
         summary = ?, requirements = ?, constraints = ?,
         suggestedFrameworks = ?, rawContext = ?, isFinalized = ?, updatedAt = ?
         WHERE projectId = ?`,
      )
      .run(data.summary, data.requirements ?? null, data.constraints ?? null, suggestedFrameworks, rawContext, isFinalized, now, projectId);
  } else {
    getDb()
      .prepare(
        `INSERT INTO project_summaries
         (projectId, userId, summary, requirements, constraints, suggestedFrameworks, rawContext, isFinalized, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(projectId, userId, data.summary, data.requirements ?? null, data.constraints ?? null, suggestedFrameworks, rawContext, isFinalized, now, now);
  }

  return summaryGetByProject(projectId as number);
}

// ============================================================================
// Evaluations (Feedback)
// ============================================================================

function evaluationCreate(data: Record<string, unknown>) {
  const now = nowUnix();
  const projectId = data.projectId ?? data.project_id;
  const stepId = data.stepId ?? data.step_id ?? null;
  const userId = data.userId ?? data.user_id;
  const result = getDb()
    .prepare(
      `INSERT INTO evaluations
       (projectId, stepId, userId, dimension, score, feedback, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(projectId, stepId, userId, data.dimension, data.score, data.feedback ?? null, now);

  return {
    id: result.lastInsertRowid,
    project_id: projectId,
    step_id: stepId,
    user_id: userId,
    dimension: data.dimension,
    score: data.score,
    feedback: data.feedback ?? null,
    created_at: new Date(now * 1000).toISOString(),
  };
}

function evaluationStats(projectId: number | null) {
  const whereClause = projectId !== null ? "WHERE projectId = ?" : "";
  const params = projectId !== null ? [projectId] : [];

  const row = getDb()
    .prepare(
      `SELECT
        COUNT(*) as total_count,
        AVG(CASE WHEN dimension = 'clarity' THEN score END) as avg_clarity,
        AVG(CASE WHEN dimension = 'relevance' THEN score END) as avg_relevance,
        AVG(CASE WHEN dimension = 'completeness' THEN score END) as avg_completeness,
        AVG(CASE WHEN dimension = 'actionability' THEN score END) as avg_actionability,
        AVG(CASE WHEN dimension = 'overall' THEN score END) as avg_overall
       FROM evaluations ${whereClause}`,
    )
    .get(...params);

  return {
    total_count: row?.total_count ?? 0,
    avg_clarity: row?.avg_clarity ?? null,
    avg_relevance: row?.avg_relevance ?? null,
    avg_completeness: row?.avg_completeness ?? null,
    avg_actionability: row?.avg_actionability ?? null,
    avg_overall: row?.avg_overall ?? null,
  };
}

function evaluationList(projectId: number | null, limit: number) {
  const whereClause = projectId !== null ? "WHERE projectId = ?" : "";
  const params = projectId !== null ? [projectId, limit] : [limit];

  return getDb()
    .prepare(
      `SELECT id, projectId as project_id, stepId as step_id, userId as user_id,
              dimension, score, feedback,
              datetime(createdAt, 'unixepoch') as created_at
       FROM evaluations ${whereClause} ORDER BY createdAt DESC LIMIT ?`,
    )
    .all(...params);
}

// ============================================================================
// Prompt Library
// ============================================================================

function promptList(userId: number, opts?: Record<string, unknown>) {
  let sql = `SELECT id, userId as user_id, title, originalIntent as original_intent,
                    generatedPrompt as generated_prompt, framework,
                    domain, model, rating, tags, useCount as use_count,
                    isFavorite as is_favorite,
                    datetime(createdAt, 'unixepoch') as created_at,
                    datetime(updatedAt, 'unixepoch') as updated_at
             FROM prompt_library WHERE userId = ?`;
  const params: unknown[] = [userId];

  if (opts?.domain) {
    sql += " AND domain = ?";
    params.push(opts.domain);
  }
  if (opts?.isFavorite !== undefined) {
    sql += " AND isFavorite = ?";
    params.push(opts.isFavorite);
  }
  if (opts?.search) {
    sql += " AND (title LIKE ? OR tags LIKE ?)";
    params.push(`%${opts.search}%`, `%${opts.search}%`);
  }
  sql += " ORDER BY updatedAt DESC LIMIT ? OFFSET ?";
  params.push(opts?.limit ?? 50, opts?.offset ?? 0);

  return getDb().prepare(sql).all(...params);
}

function promptCreate(data: Record<string, unknown>) {
  const now = nowUnix();
  const result = getDb()
    .prepare(
      `INSERT INTO prompt_library
       (userId, title, originalIntent, generatedPrompt, framework, domain, model, tags, useCount, isFavorite, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      data.user_id,
      data.title,
      data.original_intent ?? null,
      data.generated_prompt,
      data.framework ?? null,
      data.domain ?? "general",
      data.model ?? "kimi",
      data.tags ?? null,
      0,
      0,
      now,
      now,
    );

  const row = getDb()
    .prepare("SELECT * FROM prompt_library WHERE id = ?")
    .get(result.lastInsertRowid);
  return row;
}

function promptDelete(id: number, userId: number) {
  getDb()
    .prepare("DELETE FROM prompt_library WHERE id = ? AND userId = ?")
    .run(id, userId);
}

function promptUpdateFavorite(id: number, userId: number, isFavorite: number) {
  getDb()
    .prepare("UPDATE prompt_library SET isFavorite = ? WHERE id = ? AND userId = ?")
    .run(isFavorite, id, userId);
}

// ============================================================================
// Templates
// ============================================================================

function templateListPublic() {
  return getDb()
    .prepare(
      `SELECT id, userId as user_id, title, description, framework, domain,
              content, tags, useCount as use_count, rating, ratingCount as rating_count,
              isPublic as is_public, isFeatured as is_featured,
              datetime(createdAt, 'unixepoch') as created_at
       FROM templates WHERE isPublic = 1 ORDER BY useCount DESC`,
    )
    .all();
}

function templateListByUser(userId: number) {
  return getDb()
    .prepare(
      `SELECT id, userId as user_id, title, description, framework, domain,
              content, tags, useCount as use_count, rating, ratingCount as rating_count,
              isPublic as is_public, isFeatured as is_featured,
              datetime(createdAt, 'unixepoch') as created_at
       FROM templates WHERE userId = ? ORDER BY createdAt DESC`,
    )
    .all(userId);
}

function templateCreate(data: Record<string, unknown>) {
  const now = nowUnix();
  const result = getDb()
    .prepare(
      `INSERT INTO templates
       (userId, title, description, framework, domain, content, tags, isPublic, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      data.user_id,
      data.title,
      data.description ?? null,
      data.framework ?? null,
      data.domain ?? "general",
      data.content,
      data.tags ?? null,
      data.is_public ?? 1,
      now,
    );

  const row = getDb()
    .prepare("SELECT * FROM templates WHERE id = ?")
    .get(result.lastInsertRowid);
  return row;
}

function templateDelete(id: number, userId: number) {
  getDb()
    .prepare("DELETE FROM templates WHERE id = ? AND userId = ?")
    .run(id, userId);
}

function templateUse(id: number) {
  getDb()
    .prepare("UPDATE templates SET useCount = useCount + 1 WHERE id = ?")
    .run(id);
}

function templateRate(id: number, score: number) {
  const row = getDb()
    .prepare("SELECT rating, ratingCount FROM templates WHERE id = ?")
    .get(id);

  if (!row) throw new Error("Template not found");

  const currentRating = row.rating ?? 0;
  const currentCount = row.ratingCount ?? 0;
  const newCount = currentCount + 1;
  const newRating =
    currentCount === 0
      ? score
      : Math.round(((currentRating * currentCount + score) / newCount) * 10) /
        10;

  getDb()
    .prepare("UPDATE templates SET rating = ?, ratingCount = ? WHERE id = ?")
    .run(newRating, newCount, id);

  return { newRating, newCount };
}

// ============================================================================
// Optimizer Runs
// ============================================================================

function optimizerRunCreate(data: Record<string, unknown>) {
  const now = nowUnix();
  const userId = data.userId ?? data.user_id;
  const originalPrompt = data.originalPrompt ?? data.original_prompt;
  const optimizedPrompt = data.optimizedPrompt ?? data.optimized_prompt;
  const result = getDb()
    .prepare(
      `INSERT INTO prompt_optimizations
       (userId, originalPrompt, optimizedPrompt, improvements, domain, model, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(userId, originalPrompt, optimizedPrompt, data.improvements ?? null, data.domain ?? "general", data.model ?? "kimi", now);

  return {
    id: result.lastInsertRowid,
    user_id: userId,
    original_prompt: originalPrompt,
    optimized_prompt: optimizedPrompt,
    improvements: data.improvements ?? null,
    domain: data.domain ?? "general",
    model: data.model ?? "kimi",
    created_at: new Date(now * 1000).toISOString(),
  };
}

function optimizerRunList(userId: number, limit: number) {
  return getDb()
    .prepare(
      `SELECT id, userId as user_id, originalPrompt as original_prompt,
              optimizedPrompt as optimized_prompt, improvements,
              domain, model,
              datetime(createdAt, 'unixepoch') as created_at
       FROM prompt_optimizations WHERE userId = ? ORDER BY createdAt DESC LIMIT ?`,
    )
    .all(userId, limit);
}

// ============================================================================
// AI Client (fallback — calls provider HTTP APIs directly)
// ============================================================================

async function aiCall(req: Record<string, unknown>): Promise<Record<string, unknown>> {
  const provider = String(req.provider || "deepseek");
  const apiKey = String(req.apiKey || "");
  const modelId = String(req.modelId || "deepseek-chat");
  const baseUrl = String(req.baseUrl || "");
  const systemPrompt = String(req.systemPrompt || "");
  const userMessage = String(req.userMessage || "");
  const temperature = Number(req.temperature ?? 0.7);
  const maxTokens = Number(req.maxTokens ?? 2048);
  const timeoutMs = Number(req.timeoutMs ?? 30000);

  if (!apiKey) {
    return { content: "", error: "API key not provided" };
  }

  let url: string;
  const body: Record<string, unknown> = {
    model: modelId,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    temperature,
    max_tokens: maxTokens,
  };

  if (provider === "deepseek" || provider === "openai" || provider === "kimi") {
    if (provider === "deepseek") url = baseUrl || "https://api.deepseek.com/v1/chat/completions";
    else if (provider === "openai") url = baseUrl || "https://api.openai.com/v1/chat/completions";
    else url = baseUrl || "https://api.moonshot.cn/v1/chat/completions";
  } else if (provider === "claude") {
    url = baseUrl || "https://api.anthropic.com/v1/messages";
    delete body.messages;
    body.system = systemPrompt;
    body.messages = [{ role: "user", content: userMessage }];
    body.max_tokens = maxTokens;
  } else {
    url = baseUrl || "https://api.deepseek.com/v1/chat/completions";
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Claude uses x-api-key + anthropic-version; others use Authorization: Bearer
    if (provider === "claude") {
      headers["x-api-key"] = apiKey;
      headers["anthropic-version"] = "2023-06-01";
    } else {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      const text = await response.text();
      return { content: "", error: `HTTP ${response.status}: ${text}` };
    }

    const data = await response.json() as Record<string, unknown>;

    let content = "";
    if (provider === "claude") {
      // Anthropic response: { content: [{ type: "text", text: "..." }] }
      const contentArr = data.content as Array<Record<string, unknown>> | undefined;
      content = String(contentArr?.[0]?.text || "");
    } else {
      // OpenAI-compatible response: { choices: [{ message: { content: "..." } }] }
      const choices = data.choices as Array<Record<string, unknown>> | undefined;
      content = String(choices?.[0]?.message
        ? (choices[0].message as Record<string, unknown>).content || ""
        : "");
    }

    return { content, error: undefined };
  } catch (err) {
    return { content: "", error: err instanceof Error ? err.message : String(err) };
  }
}

async function aiCallSelfConsistency(req: Record<string, unknown>, sampleCount?: number): Promise<Record<string, unknown>> {
  const count = Math.max(3, Math.min(10, sampleCount ?? 3));
  const calls = Array.from({ length: count }, () => aiCall(req));
  const results = await Promise.all(calls);

  return {
    results,
    count: results.length,
    successfulCount: results.filter((r) => !r.error).length,
  };
}

// ============================================================================
// Quality Gate / Drift Detection — polyfill 不支持，返回明确错误
// ============================================================================

function runQualityGate(
  _prompt: string,
  _enabledChecks?: string[],
  _threshold?: number,
) {
  throw new Error("质量门禁需要 Rust Native Addon，当前为 JS polyfill 模式，功能不可用");
}

function detectDrift(_versions: string[], _baselineIndex?: number) {
  throw new Error("漂移检测需要 Rust Native Addon，当前为 JS polyfill 模式，功能不可用");
}

function compareVersions(_a: string, _b: string) {
  throw new Error("版本比较需要 Rust Native Addon，当前为 JS polyfill 模式，功能不可用");
}


// ============================================================================
// Settings — per-user API key and preference storage
// ============================================================================

let _settingsTableEnsured = false;

function ensureSettingsTable(): void {
  if (_settingsTableEnsured) return;
  getDb().exec(`CREATE TABLE IF NOT EXISTS user_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL UNIQUE,
    kimiApiKey TEXT,
    openaiApiKey TEXT,
    claudeApiKey TEXT,
    deepseekApiKey TEXT,
    defaultModel TEXT NOT NULL DEFAULT 'kimi',
    defaultFramework TEXT NOT NULL DEFAULT 'auto',
    defaultLanguage TEXT NOT NULL DEFAULT 'zh',
    createdAt INTEGER,
    updatedAt INTEGER
  )`);
  _settingsTableEnsured = true;
}

interface SettingsRow {
  userId: number;
  defaultModel: string;
  defaultFramework: string;
  defaultLanguage: string;
  kimiApiKey: string | null;
  openaiApiKey: string | null;
  claudeApiKey: string | null;
  deepseekApiKey: string | null;
}

function settingsGet(userId: number): Record<string, unknown> | null {
  ensureSettingsTable();
  const row = getDb()
    .prepare("SELECT * FROM user_settings WHERE userId = ?")
    .get(userId) as SettingsRow | undefined;

  if (!row) return null;

  return {
    user_id: row.userId,
    default_model: row.defaultModel ?? "kimi",
    default_framework: row.defaultFramework ?? "auto",
    default_language: row.defaultLanguage ?? "zh",
    hasKimiKey: !!row.kimiApiKey,
    hasOpenaiKey: !!row.openaiApiKey,
    hasClaudeKey: !!row.claudeApiKey,
    hasDeepseekKey: !!row.deepseekApiKey,
  };
}

function getEncryptionKey(): string {
  return process.env.APP_SECRET || process.env.API_KEY_SECRET || "";
}

/** Encrypt an API key value if encryption key is available */
function maybeEncrypt(value: string): string {
  const key = getEncryptionKey();
  if (!key) return value;
  return encrypt(value, key);
}

/** Decrypt an API key value if it was encrypted */
function maybeDecrypt(value: string): string {
  const key = getEncryptionKey();
  if (!key) return value;
  try {
    return decrypt(value, key);
  } catch {
    // Not encrypted or already plaintext
    return value;
  }
}

const API_KEY_FIELDS = new Set(["kimiApiKey", "openaiApiKey", "claudeApiKey", "deepseekApiKey"]);
// Map snake_case API key field names to camelCase column names
const SNAKE_TO_CAMEL: Record<string, string> = {
  kimi_api_key: "kimiApiKey",
  openai_api_key: "openaiApiKey",
  claude_api_key: "claudeApiKey",
  deepseek_api_key: "deepseekApiKey",
  default_model: "defaultModel",
  default_framework: "defaultFramework",
  default_language: "defaultLanguage",
};

function settingsUpdate(userId: number, data: Record<string, unknown>): void {
  ensureSettingsTable();
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const existing = db
    .prepare("SELECT id FROM user_settings WHERE userId = ?")
    .get(userId) as { id: number } | undefined;

  const allowedFields = [
    "defaultModel", "defaultFramework", "defaultLanguage",
    "kimiApiKey", "openaiApiKey", "claudeApiKey", "deepseekApiKey",
  ];

  if (existing) {
    const fields: string[] = ["updatedAt = ?"];
    const values: unknown[] = [now];

    for (const field of allowedFields) {
      // Check both camelCase and snake_case keys
      let val = data[field];
      if (val === undefined) {
        const snakeKey = Object.keys(SNAKE_TO_CAMEL).find(k => SNAKE_TO_CAMEL[k] === field) || "";
        val = snakeKey ? data[snakeKey] : undefined;
      }
      if (val !== undefined) {
        // Encrypt API key fields before writing
        if (API_KEY_FIELDS.has(field) && typeof val === "string" && val) {
          val = maybeEncrypt(val);
        }
        fields.push(`${field} = ?`);
        values.push(val);
      }
    }

    values.push(userId);
    db.prepare(
      `UPDATE user_settings SET ${fields.join(", ")} WHERE userId = ?`,
    ).run(...values);
  } else {
    const cols: string[] = ["userId", "createdAt", "updatedAt"];
    const vals: unknown[] = [userId, now, now];
    const placeholders: string[] = ["?", "?", "?"];

    for (const field of allowedFields) {
      // Check both camelCase and snake_case keys
      let val = data[field];
      if (val === undefined) {
        const snakeKey = Object.keys(SNAKE_TO_CAMEL).find(k => SNAKE_TO_CAMEL[k] === field) || "";
        val = snakeKey ? data[snakeKey] : undefined;
      }
      if (val !== undefined) {
        // Encrypt API key fields before writing
        if (API_KEY_FIELDS.has(field) && typeof val === "string" && val) {
          val = maybeEncrypt(val);
        }
        cols.push(field);
        vals.push(val);
        placeholders.push("?");
      }
    }

    db.prepare(
      `INSERT INTO user_settings (${cols.join(", ")}) VALUES (${placeholders.join(", ")})`,
    ).run(...vals);
  }
}

function settingsGetApiKey(userId: number, provider: string): string | undefined {
  ensureSettingsTable();
  const columnMap: Record<string, string> = {
    kimi: "kimiApiKey",
    openai: "openaiApiKey",
    claude: "claudeApiKey",
    deepseek: "deepseekApiKey",
  };

  const column = columnMap[provider];
  if (!column) return undefined;

  const row = getDb()
    .prepare(`SELECT ${column} FROM user_settings WHERE userId = ?`)
    .get(userId) as Record<string, unknown> | undefined;

  if (!row) return undefined;
  const val = row[column];
  if (!val) return undefined;
  // Decrypt stored API key
  return maybeDecrypt(String(val));
}
// ============================================================================
// Export polyfill object (snake_case API matching native/index.d.ts)
// ============================================================================

export const nativePolyfill = {
  version: () => "1.0.0-polyfill",
  dbOpen: () => {
    /* no-op: polyfill opens DB on first use */
  },
  dbClose: () => {
    if (db) {
      db.close();
      db = null;
    }
  },
  dbMigrate: (migrationsDir: string) => {
    const fs = _require("fs");
    if (!fs.existsSync(migrationsDir)) return;

    const d = getDb();

    d.exec(`
      CREATE TABLE IF NOT EXISTS __migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL UNIQUE,
        appliedAt TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    const applied = new Set(
      d.prepare("SELECT filename FROM __migrations").all().map((r: Record<string, unknown>) => r.filename as string)
    );

    const pending = fs.readdirSync(migrationsDir)
      .filter((f: string) => f.endsWith(".sql"))
      .sort()
      .filter((f: string) => !applied.has(f));

    if (pending.length === 0) return;

    const insert = d.prepare("INSERT INTO __migrations (filename) VALUES (?)");
    for (const filename of pending) {
      const sql = fs.readFileSync(path.join(migrationsDir, filename), "utf-8");
      d.transaction(() => {
        d.exec(sql);
        insert.run(filename);
      })();
    }
  },

  // Crypto
  encrypt,
  decrypt,

  // Domain Packages
  domainPackageUpsert,

  // Users
  userFindByUnionId,
  userFindById,
  userUpsert,

  // Projects
  projectList,
  projectCreate,
  projectDelete,
  projectGetById,
  projectUpdate,

  // Steps
  stepList,
  stepGetById,
  stepCreate,
  stepUpdate,
  stepDelete,

  // Conversations
  conversationCreate,
  conversationListByProject,

  // Summaries
  summaryGetByProject,
  summaryUpsert,

  // Evaluations
  evaluationCreate,
  evaluationStats,
  evaluationList,

  // Prompts
  promptList,
  promptCreate,
  promptDelete,
  promptUpdateFavorite,

  // Templates
  templateListPublic,
  templateListByUser,
  templateCreate,
  templateDelete,
  templateUse,
  templateRate,

  // Optimizer
  optimizerRunCreate,
  optimizerRunList,
  userFindByUsername,
  settingsGet,
  settingsUpdate,
  settingsGetApiKey,

  // AI
  aiCall,
  aiCallSelfConsistency,

  // Quality / Drift
  runQualityGate,
  detectDrift,
  compareVersions,
};
