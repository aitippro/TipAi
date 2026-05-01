use napi::bindgen_prelude::*;
use napi_derive::napi;
use once_cell::sync::Lazy;
use parking_lot::Mutex;
use std::sync::Arc;

mod ai;
mod crypto;
mod db;

use db::connection::Database;

/// Global database handle — initialized once at app startup
static DB: Lazy<Mutex<Option<Arc<Database>>>> = Lazy::new(|| Mutex::new(None));

fn with_db<F, T>(f: F) -> Result<T>
where
    F: FnOnce(&Database) -> Result<T>,
{
    let guard = DB.lock();
    match guard.as_ref() {
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
    *DB.lock() = Some(Arc::new(db));
    Ok(())
}

#[napi]
pub fn db_migrate(migrations_dir: String) -> Result<()> {
    with_db(|db| {
        db.run_migrations(&migrations_dir)
            .map_err(|e| Error::from_reason(format!("Migration failed: {e}")))?;
        Ok(())
    })
}

#[napi]
pub fn db_close() -> Result<()> {
    *DB.lock() = None;
    Ok(())
}

// ── Re-exports ──────────────────────────────────────────────

pub use ai::client::ai_call;
pub use ai::client::ai_call_self_consistency;
pub use crypto::decrypt_aes;
pub use crypto::encrypt_aes;

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
    with_db(|db| {
        db.project_delete(id, user_id)
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
