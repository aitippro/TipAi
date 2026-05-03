use napi::bindgen_prelude::*;
use napi_derive::napi;
use std::sync::Mutex;

mod ai;
mod crypto;
mod db;
mod drift;
mod quality;

use db::connection::Database;

/// Global database handle — initialized once at app startup
static DB: Mutex<Option<Database>> = Mutex::new(None);

fn with_db<F, T>(f: F) -> Result<T>
where
    F: FnOnce(&Database) -> Result<T>,
{
    let guard = DB.lock().map_err(|e| Error::from_reason(format!("DB lock error: {e}")))?;
    match guard.as_ref() {
        Some(db) => f(db),
        None => Err(Error::from_reason("Database not initialized. Call dbOpen() first.")),
    }
}

fn with_db_mut<F, T>(f: F) -> Result<T>
where
    F: FnOnce(&mut Database) -> Result<T>,
{
    let mut guard = DB.lock().map_err(|e| Error::from_reason(format!("DB lock error: {e}")))?;
    match guard.as_mut() {
        Some(db) => f(db),
        None => Err(Error::from_reason("Database not initialized. Call dbOpen() first.")),
    }
}

// ── Version ─────────────────────────────────────────────────

#[napi]
pub fn version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

// ── Database Lifecycle ──────────────────────────────────────

#[napi]
pub fn db_open(path: String, secret_key: Option<String>) -> Result<()> {
    let db = Database::open(&path, secret_key.as_deref())
        .map_err(|e| Error::from_reason(format!("Failed to open database: {e}")))?;
    *DB.lock().map_err(|e| Error::from_reason(format!("DB lock error: {e}")))? = Some(db);
    Ok(())
}

#[napi]
pub fn db_migrate(migrations_dir: String) -> Result<()> {
    let mut guard = DB.lock().map_err(|e| Error::from_reason(format!("DB lock error: {e}")))?;
    match guard.as_mut() {
        Some(db) => {
            db.run_migrations(&migrations_dir)
                .map_err(|e| Error::from_reason(format!("Migration failed: {e}")))?;
            Ok(())
        }
        None => Err(Error::from_reason("Database not initialized. Call dbOpen() first.")),
    }
}

#[napi]
pub fn db_close() -> Result<()> {
    let mut guard = DB.lock().unwrap_or_else(|e| e.into_inner());
    *guard = None;
    Ok(())
}

// ── Re-exports ──────────────────────────────────────────────

pub use ai::client::ai_call;
pub use ai::client::ai_call_self_consistency;
pub use drift::{detect_drift, compare_versions, DriftCheck, DriftResult, CompareResult};
pub use quality::{run_quality_gate, QualityCheck, QualityGateResult};

#[napi]
pub fn encrypt(plaintext: String, password: String) -> Result<String> {
    crate::crypto::encrypt(&plaintext, &password)
        .map_err(|e| Error::from_reason(e.to_string()))
}

#[napi]
pub fn decrypt(ciphertext: String, password: String) -> Result<String> {
    crate::crypto::decrypt(&ciphertext, &password)
        .map_err(|e| Error::from_reason(e.to_string()))
}

// User settings with encrypted API keys
#[napi(object)]
#[derive(Clone, Debug, Default)]
pub struct UserSettings {
    pub user_id: i64,
    pub default_model: String,
    pub default_framework: String,
    pub default_language: String,
    pub has_kimi_key: bool,
    pub has_openai_key: bool,
    pub has_claude_key: bool,
    pub has_deepseek_key: bool,
}

#[napi(object)]
#[derive(Clone, Debug, Default)]
pub struct UpdateSettings {
    pub default_model: Option<String>,
    pub default_framework: Option<String>,
    pub default_language: Option<String>,
    pub kimi_api_key: Option<String>,
    pub openai_api_key: Option<String>,
    pub claude_api_key: Option<String>,
    pub deepseek_api_key: Option<String>,
}

#[napi]
pub fn settings_get(user_id: i64) -> Result<UserSettings> {
    with_db(|db| {
        db.settings_get(user_id)
            .map_err(|e| Error::from_reason(format!("{e}")))
    })
}

#[napi]
pub fn settings_update(user_id: i64, data: UpdateSettings) -> Result<()> {
    with_db(|db| {
        db.settings_update(user_id, data)
            .map_err(|e| Error::from_reason(format!("{e}")))
    })
}

#[napi]
pub fn settings_get_api_key(user_id: i64, provider: String) -> Result<Option<String>> {
    with_db(|db| {
        db.settings_get_api_key(user_id, &provider)
            .map_err(|e| Error::from_reason(format!("{e}")))
    })
}

// ── User CRUD ───────────────────────────────────────────────

#[napi(object)]
#[derive(Clone, Debug, Default)]
pub struct User {
    pub id: i64,
    pub union_id: String,
    pub username: Option<String>,
    pub password: Option<String>,
    pub name: Option<String>,
    pub email: Option<String>,
    pub avatar: Option<String>,
    pub role: String,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub last_sign_in_at: Option<String>,
}

#[napi(object)]
#[derive(Clone, Debug, Default)]
pub struct InsertUser {
    pub union_id: String,
    pub username: Option<String>,
    pub password: Option<String>,
    pub name: Option<String>,
    pub email: Option<String>,
    pub avatar: Option<String>,
    pub role: Option<String>,
}

#[napi]
pub fn user_find_by_union_id(union_id: String) -> Result<Option<User>> {
    with_db(|db| {
        db.user_find_by_union_id(&union_id)
            .map_err(|e| Error::from_reason(format!("{e}")))
    })
}

#[napi]
pub fn user_upsert(data: InsertUser) -> Result<User> {
    with_db(|db| {
        db.user_upsert(data)
            .map_err(|e| Error::from_reason(format!("{e}")))
    })
}

#[napi]
pub fn user_find_by_id(id: i64) -> Result<Option<User>> {
    with_db(|db| {
        db.user_find_by_id(id)
            .map_err(|e| Error::from_reason(format!("{e}")))
    })
}

#[napi]
pub fn user_find_by_username(username: String) -> Result<Option<User>> {
    with_db(|db| {
        db.user_find_by_username(&username)
            .map_err(|e| Error::from_reason(format!("{e}")))
    })
}

// ── Prompt Library ──────────────────────────────────────────

#[napi(object)]
#[derive(Clone, Debug, Default)]
pub struct PromptEntry {
    pub id: i64,
    pub user_id: i64,
    pub title: String,
    pub original_intent: Option<String>,
    pub generated_prompt: String,
    pub framework: Option<String>,
    pub domain: Option<String>,
    pub model: Option<String>,
    pub rating: Option<i64>,
    pub tags: Option<String>,
    pub use_count: i64,
    pub is_favorite: i64,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[napi(object)]
#[derive(Clone, Debug, Default)]
pub struct InsertPrompt {
    pub user_id: i64,
    pub title: String,
    pub original_intent: Option<String>,
    pub generated_prompt: String,
    pub framework: Option<String>,
    pub domain: Option<String>,
    pub model: Option<String>,
    pub tags: Option<String>,
}

#[napi(object)]
#[derive(Clone, Debug, Default)]
pub struct ListOpts {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
    pub domain: Option<String>,
    pub is_favorite: Option<i64>,
    pub search: Option<String>,
}

#[napi]
pub fn prompt_list(user_id: i64, opts: Option<ListOpts>) -> Result<Vec<PromptEntry>> {
    with_db(|db| {
        db.prompt_list(user_id, opts.unwrap_or_default())
            .map_err(|e| Error::from_reason(format!("{e}")))
    })
}

#[napi]
pub fn prompt_create(data: InsertPrompt) -> Result<PromptEntry> {
    with_db(|db| {
        db.prompt_create(data)
            .map_err(|e| Error::from_reason(format!("{e}")))
    })
}

#[napi]
pub fn prompt_delete(id: i64, user_id: i64) -> Result<()> {
    with_db(|db| {
        db.prompt_delete(id, user_id)
            .map_err(|e| Error::from_reason(format!("{e}")))
    })
}

#[napi]
pub fn prompt_update_favorite(id: i64, user_id: i64, is_favorite: i64) -> Result<()> {
    with_db(|db| {
        db.prompt_update_favorite(id, user_id, is_favorite)
            .map_err(|e| Error::from_reason(format!("{e}")))
    })
}

// ── Templates ───────────────────────────────────────────────

#[napi(object)]
#[derive(Clone, Debug, Default)]
pub struct TemplateEntry {
    pub id: i64,
    pub user_id: i64,
    pub title: String,
    pub description: Option<String>,
    pub framework: Option<String>,
    pub domain: Option<String>,
    pub content: String,
    pub tags: Option<String>,
    pub use_count: i64,
    pub rating: Option<i64>,
    pub rating_count: i64,
    pub is_public: i64,
    pub is_featured: i64,
    pub created_at: Option<String>,
}

#[napi(object)]
#[derive(Clone, Debug, Default)]
pub struct InsertTemplate {
    pub user_id: i64,
    pub title: String,
    pub description: Option<String>,
    pub framework: Option<String>,
    pub domain: Option<String>,
    pub content: String,
    pub tags: Option<String>,
    pub is_public: Option<i64>,
}

#[napi]
pub fn template_list_public() -> Result<Vec<TemplateEntry>> {
    with_db(|db| {
        db.template_list_public()
            .map_err(|e| Error::from_reason(format!("{e}")))
    })
}

#[napi]
pub fn template_list_by_user(user_id: i64) -> Result<Vec<TemplateEntry>> {
    with_db(|db| {
        db.template_list_by_user(user_id)
            .map_err(|e| Error::from_reason(format!("{e}")))
    })
}

#[napi]
pub fn template_create(data: InsertTemplate) -> Result<TemplateEntry> {
    with_db(|db| {
        db.template_create(data)
            .map_err(|e| Error::from_reason(format!("{e}")))
    })
}

#[napi]
pub fn template_delete(id: i64, user_id: i64) -> Result<()> {
    with_db(|db| {
        db.template_delete(id, user_id)
            .map_err(|e| Error::from_reason(format!("{e}")))
    })
}

#[napi]
pub fn template_use(id: i64) -> Result<()> {
    with_db(|db| {
        db.template_use(id)
            .map_err(|e| Error::from_reason(format!("{e}")))
    })
}

#[napi]
pub fn template_rate(id: i64, score: i64) -> Result<TemplateRateResult> {
    with_db(|db| {
        db.template_rate(id, score)
            .map_err(|e| Error::from_reason(format!("{e}")))
    })
}

#[napi(object)]
#[derive(Clone, Debug, Default)]
pub struct TemplateRateResult {
    pub new_rating: f64,
    pub new_count: i64,
}

// ── Projects ────────────────────────────────────────────────

#[napi(object)]
#[derive(Clone, Debug, Default)]
pub struct ProjectEntry {
    pub id: i64,
    pub user_id: i64,
    pub title: String,
    pub description: Option<String>,
    pub domain: String,
    pub status: String,
    pub intent: Option<String>,
    pub clarification_status: Option<String>,
    pub turn_count: i64,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[napi(object)]
#[derive(Clone, Debug, Default)]
pub struct InsertProject {
    pub user_id: i64,
    pub title: String,
    pub description: Option<String>,
    pub domain: Option<String>,
    pub status: Option<String>,
    pub intent: Option<String>,
}

#[napi(object)]
#[derive(Clone, Debug, Default)]
pub struct UpdateProject {
    pub title: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub intent: Option<String>,
    pub clarification_status: Option<String>,
    pub turn_count: Option<i64>,
}

#[napi]
pub fn project_list(user_id: i64) -> Result<Vec<ProjectEntry>> {
    with_db(|db| {
        db.project_list(user_id)
            .map_err(|e| Error::from_reason(format!("{e}")))
    })
}

#[napi]
pub fn project_create(data: InsertProject) -> Result<ProjectEntry> {
    with_db(|db| {
        db.project_create(data)
            .map_err(|e| Error::from_reason(format!("{e}")))
    })
}

#[napi]
pub fn project_delete(id: i64, user_id: i64) -> Result<()> {
    with_db_mut(|db| {
        db.project_delete(id, user_id)
            .map_err(|e| Error::from_reason(format!("{e}")))
    })
}

#[napi]
pub fn project_get_by_id(id: i64, user_id: i64) -> Result<Option<ProjectEntry>> {
    with_db(|db| {
        db.project_get_by_id(id, user_id)
            .map_err(|e| Error::from_reason(format!("{e}")))
    })
}

#[napi]
pub fn project_update(id: i64, user_id: i64, data: UpdateProject) -> Result<Option<ProjectEntry>> {
    with_db(|db| {
        db.project_update(id, user_id, data)
            .map_err(|e| Error::from_reason(format!("{e}")))
    })
}

// ── Steps ───────────────────────────────────────────────────

#[napi(object)]
#[derive(Clone, Debug, Default)]
pub struct StepEntry {
    pub id: i64,
    pub project_id: i64,
    pub title: String,
    pub description: Option<String>,
    pub prompt: String,
    pub stage: String,
    pub order_num: i64,
    pub status: String,
    pub output: Option<String>,
    pub parent_step_id: Option<i64>,
    pub model: Option<String>,
    pub temperature: Option<f64>,
    pub decode_strategy: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[napi(object)]
#[derive(Clone, Debug, Default)]
pub struct InsertStep {
    pub project_id: i64,
    pub title: String,
    pub description: Option<String>,
    pub prompt: String,
    pub stage: Option<String>,
    pub order_num: Option<i64>,
    pub parent_step_id: Option<i64>,
    pub model: Option<String>,
    pub temperature: Option<f64>,
    pub decode_strategy: Option<String>,
}

#[napi(object)]
#[derive(Clone, Debug, Default)]
pub struct UpdateStep {
    pub title: Option<String>,
    pub description: Option<String>,
    pub prompt: Option<String>,
    pub status: Option<String>,
    pub output: Option<String>,
    pub model: Option<String>,
    pub temperature: Option<f64>,
}

#[napi]
pub fn step_list(project_id: i64) -> Result<Vec<StepEntry>> {
    with_db(|db| {
        db.step_list(project_id)
            .map_err(|e| Error::from_reason(format!("{e}")))
    })
}

#[napi]
pub fn step_update(id: i64, data: UpdateStep) -> Result<StepEntry> {
    with_db(|db| {
        db.step_update(id, data)
            .map_err(|e| Error::from_reason(format!("{e}")))
    })
}

#[napi]
pub fn step_get_by_id(id: i64) -> Result<Option<StepEntry>> {
    with_db(|db| {
        db.step_get_by_id(id)
            .map_err(|e| Error::from_reason(format!("{e}")))
    })
}

#[napi]
pub fn step_create(data: InsertStep) -> Result<StepEntry> {
    with_db(|db| {
        db.step_create(data)
            .map_err(|e| Error::from_reason(format!("{e}")))
    })
}

// ── Conversations ───────────────────────────────────────────

#[napi(object)]
#[derive(Clone, Debug, Default)]
pub struct ConversationEntry {
    pub id: i64,
    pub project_id: i64,
    pub user_id: i64,
    pub role: String,
    pub content: String,
    pub question_id: Option<String>,
    pub question_data: Option<String>,
    pub answer_data: Option<String>,
    pub turn_number: i64,
    pub created_at: Option<String>,
}

#[napi(object)]
#[derive(Clone, Debug, Default)]
pub struct InsertConversation {
    pub project_id: i64,
    pub user_id: i64,
    pub role: String,
    pub content: String,
    pub question_id: Option<String>,
    pub question_data: Option<String>,
    pub answer_data: Option<String>,
    pub turn_number: Option<i64>,
}

#[napi]
pub fn conversation_create(data: InsertConversation) -> Result<ConversationEntry> {
    with_db(|db| {
        db.conversation_create(data)
            .map_err(|e| Error::from_reason(format!("{e}")))
    })
}

#[napi]
pub fn conversation_list_by_project(project_id: i64) -> Result<Vec<ConversationEntry>> {
    with_db(|db| {
        db.conversation_list_by_project(project_id)
            .map_err(|e| Error::from_reason(format!("{e}")))
    })
}

// ── Summaries ───────────────────────────────────────────────

#[napi(object)]
#[derive(Clone, Debug, Default)]
pub struct SummaryEntry {
    pub id: i64,
    pub project_id: i64,
    pub user_id: i64,
    pub summary: String,
    pub requirements: Option<String>,
    pub constraints: Option<String>,
    pub suggested_frameworks: Option<String>,
    pub raw_context: Option<String>,
    pub is_finalized: i64,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[napi(object)]
#[derive(Clone, Debug, Default)]
pub struct InsertSummary {
    pub project_id: i64,
    pub user_id: i64,
    pub summary: String,
    pub requirements: Option<String>,
    pub constraints: Option<String>,
    pub suggested_frameworks: Option<String>,
    pub raw_context: Option<String>,
    pub is_finalized: Option<i64>,
}

#[napi]
pub fn summary_get_by_project(project_id: i64) -> Result<Option<SummaryEntry>> {
    with_db(|db| {
        db.summary_get_by_project(project_id)
            .map_err(|e| Error::from_reason(format!("{e}")))
    })
}

#[napi]
pub fn summary_upsert(data: InsertSummary) -> Result<SummaryEntry> {
    with_db(|db| {
        db.summary_upsert(data)
            .map_err(|e| Error::from_reason(format!("{e}")))
    })
}

// ── Evaluations ─────────────────────────────────────────────

#[napi(object)]
#[derive(Clone, Debug, Default)]
pub struct EvaluationEntry {
    pub id: i64,
    pub project_id: i64,
    pub step_id: Option<i64>,
    pub user_id: i64,
    pub dimension: String,
    pub score: i64,
    pub feedback: Option<String>,
    pub created_at: Option<String>,
}

#[napi(object)]
#[derive(Clone, Debug, Default)]
pub struct InsertEvaluation {
    pub project_id: i64,
    pub step_id: Option<i64>,
    pub user_id: i64,
    pub dimension: String,
    pub score: i64,
    pub feedback: Option<String>,
}

#[napi(object)]
#[derive(Clone, Debug, Default)]
pub struct EvaluationStats {
    pub total_count: i64,
    pub avg_clarity: Option<f64>,
    pub avg_relevance: Option<f64>,
    pub avg_completeness: Option<f64>,
    pub avg_actionability: Option<f64>,
    pub avg_overall: Option<f64>,
}

#[napi]
pub fn evaluation_create(data: InsertEvaluation) -> Result<EvaluationEntry> {
    with_db(|db| {
        db.evaluation_create(data)
            .map_err(|e| Error::from_reason(format!("{e}")))
    })
}

#[napi]
pub fn evaluation_stats(project_id: Option<i64>) -> Result<EvaluationStats> {
    with_db(|db| {
        db.evaluation_stats(project_id)
            .map_err(|e| Error::from_reason(format!("{e}")))
    })
}

#[napi]
pub fn evaluation_list(project_id: Option<i64>, limit: i64) -> Result<Vec<EvaluationEntry>> {
    with_db(|db| {
        db.evaluation_list(project_id, limit)
            .map_err(|e| Error::from_reason(format!("{e}")))
    })
}

// ── Optimizations ───────────────────────────────────────────

#[napi(object)]
#[derive(Clone, Debug, Default)]
pub struct OptimizationEntry {
    pub id: i64,
    pub user_id: i64,
    pub original_prompt: String,
    pub optimized_prompt: String,
    pub improvements: Option<String>,
    pub domain: Option<String>,
    pub model: Option<String>,
    pub created_at: Option<String>,
}

#[napi(object)]
#[derive(Clone, Debug, Default)]
pub struct InsertOptimization {
    pub user_id: i64,
    pub original_prompt: String,
    pub optimized_prompt: String,
    pub improvements: Option<String>,
    pub domain: Option<String>,
    pub model: Option<String>,
}

#[napi]
pub fn optimizer_run_create(data: InsertOptimization) -> Result<OptimizationEntry> {
    with_db(|db| {
        db.optimizer_run_create(data)
            .map_err(|e| Error::from_reason(format!("{e}")))
    })
}

#[napi]
pub fn optimizer_run_list(user_id: i64, limit: i64) -> Result<Vec<OptimizationEntry>> {
    with_db(|db| {
        db.optimizer_run_list(user_id, limit)
            .map_err(|e| Error::from_reason(format!("{e}")))
    })
}
