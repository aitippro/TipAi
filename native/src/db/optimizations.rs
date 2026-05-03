use rusqlite::params;

use crate::{OptimizationEntry, InsertOptimization};

use super::connection::{Database, DbResult};

impl Database {
    pub fn optimizer_run_create(&self, data: InsertOptimization) -> DbResult<OptimizationEntry> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs() as i64;

        self.conn.execute(
            "INSERT INTO prompt_optimizations (userId, originalPrompt, optimizedPrompt, improvements, domain, model, createdAt)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                data.user_id,
                data.original_prompt,
                data.optimized_prompt,
                data.improvements,
                data.domain,
                data.model,
                now,
            ],
        )?;

        let id = self.conn.last_insert_rowid();
        self.optimizer_get_by_id(id)
            .ok_or_else(|| super::connection::DbError::Other("Insert failed".to_string()))
    }

    pub fn optimizer_run_list(&self, user_id: i64, limit: i64) -> DbResult<Vec<OptimizationEntry>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, userId, originalPrompt, optimizedPrompt, improvements, domain, model,
                    datetime(createdAt, 'unixepoch') as created_at
             FROM prompt_optimizations WHERE userId = ?1 ORDER BY createdAt DESC LIMIT ?2",
        )?;

        let rows = stmt.query_map(params![user_id, limit], |row| {
            Ok(OptimizationEntry {
                id: row.get(0)?,
                user_id: row.get(1)?,
                original_prompt: row.get(2)?,
                optimized_prompt: row.get(3)?,
                improvements: row.get(4)?,
                domain: row.get(5)?,
                model: row.get(6)?,
                created_at: row.get(7)?,
            })
        })?;

        let mut results = Vec::new();
        for row in rows {
            results.push(row?);
        }
        Ok(results)
    }

    fn optimizer_get_by_id(&self, id: i64) -> Option<OptimizationEntry> {
        self.conn.query_row(
            "SELECT id, userId, originalPrompt, optimizedPrompt, improvements, domain, model,
                    datetime(createdAt, 'unixepoch') as created_at
             FROM prompt_optimizations WHERE id = ?1",
            params![id],
            |row| {
                Ok(OptimizationEntry {
                    id: row.get(0)?,
                    user_id: row.get(1)?,
                    original_prompt: row.get(2)?,
                    optimized_prompt: row.get(3)?,
                    improvements: row.get(4)?,
                    domain: row.get(5)?,
                    model: row.get(6)?,
                    created_at: row.get(7)?,
                })
            },
        ).ok()
    }
}
