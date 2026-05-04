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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let db: any = null;

function getDb() {
  if (db) return db;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require("better-sqlite3");

  const dbUrl = process.env.DATABASE_URL || "";
  const dbPath = dbUrl.startsWith("file:")
    ? dbUrl.slice(5)
    : path.join(process.cwd(), "electron", "data", "tipai.db");

  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  return db;
}

function nowUnix(): number {
  return Math.floor(Date.now() / 1000);
}

// ============================================================================
// Projects
// ============================================================================

function projectList(userId: number) {
  return getDb()
    .prepare(
      `SELECT id, userId, title, description, domain, status, intent,
              clarificationStatus, turnCount,
              datetime(createdAt, 'unixepoch') as created_at,
              datetime(updatedAt, 'unixepoch') as updated_at
       FROM projects WHERE userId = ?
       ORDER BY updatedAt DESC`,
    )
    .all(userId);
}

function projectCreate(data: Record<string, unknown>) {
  const now = nowUnix();
  const result = getDb()
    .prepare(
      `INSERT INTO projects (userId, title, description, domain, status, intent, clarificationStatus, turnCount, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', 0, ?, ?)`,
    )
    .run(
      data.user_id,
      data.title,
      data.description ?? null,
      data.domain ?? "general",
      data.status ?? "draft",
      data.intent ?? null,
      now,
      now,
    );
  return projectGetById(Number(result.lastInsertRowid), Number(data.user_id));
}

function projectDelete(id: number, userId: number) {
  const db = getDb();
  const del = db.transaction((pid: number, uid: number) => {
    db.prepare("DELETE FROM steps WHERE projectId = ?").run(pid);
    db.prepare("DELETE FROM projects WHERE id = ? AND userId = ?").run(pid, uid);
  });
  del(id, userId);
}

function projectGetById(id: number, userId: number) {
  const row = getDb()
    .prepare(
      `SELECT id, userId, title, description, domain, status, intent,
              clarificationStatus, turnCount,
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
    clarification_status: "clarificationStatus",
    turn_count: "turnCount",
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
// Conversations
// ============================================================================

function conversationCreate(data: Record<string, unknown>) {
  const now = nowUnix();
  const result = getDb()
    .prepare(
      `INSERT INTO project_conversations
       (projectId, userId, role, content, questionId, questionData, answerData, turnNumber, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      data.project_id,
      data.user_id,
      data.role,
      data.content,
      data.question_id ?? null,
      data.question_data ?? null,
      data.answer_data ?? null,
      data.turn_number ?? 0,
      now,
    );

  return {
    id: result.lastInsertRowid,
    project_id: data.project_id,
    user_id: data.user_id,
    role: data.role,
    content: data.content,
    question_id: data.question_id ?? null,
    question_data: data.question_data ?? null,
    answer_data: data.answer_data ?? null,
    turn_number: data.turn_number ?? 0,
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
  const existing = getDb()
    .prepare("SELECT id FROM project_summaries WHERE projectId = ?")
    .get(data.project_id);

  if (existing) {
    getDb()
      .prepare(
        `UPDATE project_summaries SET
         summary = ?, requirements = ?, constraints = ?,
         suggestedFrameworks = ?, rawContext = ?, isFinalized = ?, updatedAt = ?
         WHERE projectId = ?`,
      )
      .run(
        data.summary,
        data.requirements ?? null,
        data.constraints ?? null,
        data.suggested_frameworks ?? null,
        data.raw_context ?? null,
        data.is_finalized ?? 0,
        now,
        data.project_id,
      );
  } else {
    getDb()
      .prepare(
        `INSERT INTO project_summaries
         (projectId, userId, summary, requirements, constraints, suggestedFrameworks, rawContext, isFinalized, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        data.project_id,
        data.user_id,
        data.summary,
        data.requirements ?? null,
        data.constraints ?? null,
        data.suggested_frameworks ?? null,
        data.raw_context ?? null,
        data.is_finalized ?? 0,
        now,
        now,
      );
  }

  return summaryGetByProject(data.project_id as number);
}

// ============================================================================
// Steps
// ============================================================================

function stepGetById(id: number) {
  return (
    getDb()
      .prepare(
        `SELECT id, projectId as project_id, title, description, prompt, stage,
                orderNum as order_num, status, output, parentStepId as parent_step_id,
                model, temperature, decode_strategy,
                datetime(createdAt, 'unixepoch') as created_at,
                datetime(updatedAt, 'unixepoch') as updated_at
         FROM steps WHERE id = ?`,
      )
      .get(id) || null
  );
}

function stepCreate(data: Record<string, unknown>) {
  const now = nowUnix();
  const result = getDb()
    .prepare(
      `INSERT INTO steps
       (projectId, title, description, prompt, stage, orderNum, status, output,
        parentStepId, model, temperature, decode_strategy, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      data.project_id,
      data.title,
      data.description ?? null,
      data.prompt,
      data.stage,
      data.order_num ?? 0,
      "pending",
      null,
      data.parent_step_id ?? null,
      data.model ?? "kimi",
      data.temperature ?? 0.7,
      data.decode_strategy ?? null,
      now,
      now,
    );

  return stepGetById(result.lastInsertRowid as number);
}

// ============================================================================
// Evaluations (Feedback)
// ============================================================================

function evaluationCreate(data: Record<string, unknown>) {
  const now = nowUnix();
  const result = getDb()
    .prepare(
      `INSERT INTO evaluations
       (projectId, stepId, userId, dimension, score, feedback, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      data.project_id,
      data.step_id ?? null,
      data.user_id,
      data.dimension,
      data.score,
      data.feedback ?? null,
      now,
    );

  return {
    id: result.lastInsertRowid,
    project_id: data.project_id,
    step_id: data.step_id ?? null,
    user_id: data.user_id,
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
// Templates
// ============================================================================

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
  const result = getDb()
    .prepare(
      `INSERT INTO prompt_optimizations
       (userId, originalPrompt, optimizedPrompt, improvements, domain, model, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      data.user_id,
      data.original_prompt,
      data.optimized_prompt,
      data.improvements ?? null,
      data.domain ?? "general",
      data.model ?? "kimi",
      now,
    );

  return {
    id: result.lastInsertRowid,
    user_id: data.user_id,
    original_prompt: data.original_prompt,
    optimized_prompt: data.optimized_prompt,
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
// Users
// ============================================================================

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
    userId: row.userId,
    defaultModel: row.defaultModel ?? "kimi",
    defaultFramework: row.defaultFramework ?? "auto",
    defaultLanguage: row.defaultLanguage ?? "zh",
    hasKimiKey: !!row.kimiApiKey,
    hasOpenaiKey: !!row.openaiApiKey,
    hasClaudeKey: !!row.claudeApiKey,
    hasDeepseekKey: !!row.deepseekApiKey,
  };
}

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
      if (data[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(data[field]);
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
      if (data[field] !== undefined) {
        cols.push(field);
        vals.push(data[field]);
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
  return val ? String(val) : undefined;
}
// ============================================================================
// Export polyfill object (snake_case API matching native/index.d.ts)
// ============================================================================

export const nativePolyfill = {
  version: () => "1.2.2-polyfill",
  dbOpen: () => {
    /* no-op: polyfill opens DB on first use */
  },
  dbClose: () => {
    if (db) {
      db.close();
      db = null;
    }
  },
  dbMigrate: () => {
    /* migrations are handled by electron/main.cjs */
  },

  // Project functions
  projectList,
  projectCreate,
  projectDelete,

  // NEW: Ghost call implementations
  projectGetById,
  projectUpdate,
  conversationCreate,
  conversationListByProject,
  summaryGetByProject,
  summaryUpsert,
  stepGetById,
  stepCreate,
  evaluationCreate,
  evaluationStats,
  evaluationList,
  templateUse,
  templateRate,
  optimizerRunCreate,
  optimizerRunList,
  userFindByUsername,
  settingsGet,
  settingsUpdate,
  settingsGetApiKey,
};
