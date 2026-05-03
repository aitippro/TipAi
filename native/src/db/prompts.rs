use rusqlite::{params, OptionalExtension};

use crate::{InsertPrompt, ListOpts, PromptEntry};

use super::connection::{Database, DbResult};

impl Database {
    pub fn prompt_list(&self, user_id: i64, opts: ListOpts) -> DbResult<Vec<PromptEntry>> {
        let mut sql = String::from(
            "SELECT id, userId, title, originalIntent, generatedPrompt, framework,
                    domain, model, rating, tags, useCount, isFavorite,
                    datetime(createdAt, 'unixepoch') as created_at,
                    datetime(updatedAt, 'unixepoch') as updated_at
             FROM prompt_library WHERE userId = ?1",
        );

        let mut params_vec: Vec<rusqlite::types::Value> = vec![user_id.into()];

        if let Some(domain) = opts.domain {
            sql.push_str(&format!(" AND domain = ?{}", params_vec.len() + 1));
            params_vec.push(domain.into());
        }
        if let Some(fav) = opts.is_favorite {
            sql.push_str(&format!(" AND isFavorite = ?{}", params_vec.len() + 1));
            params_vec.push(fav.into());
        }
        if let Some(search) = opts.search {
            sql.push_str(&format!(
                " AND (title LIKE ?{} OR originalIntent LIKE ?{} OR tags LIKE ?{})",
                params_vec.len() + 1,
                params_vec.len() + 1,
                params_vec.len() + 1,
            ));
            let pattern = format!("%{}%", search);
            params_vec.push(pattern.into());
        }

        sql.push_str(" ORDER BY createdAt DESC");

        if let Some(limit) = opts.limit {
            sql.push_str(&format!(" LIMIT ?{}", params_vec.len() + 1));
            params_vec.push(limit.into());
            if let Some(offset) = opts.offset {
                sql.push_str(&format!(" OFFSET ?{}", params_vec.len() + 1));
                params_vec.push(offset.into());
            }
        }

        let mut stmt = self.conn.prepare(&sql)?;
        let rows = stmt.query_map(rusqlite::params_from_iter(params_vec.iter()), |row| {
            Ok(PromptEntry {
                id: row.get(0)?,
                user_id: row.get(1)?,
                title: row.get(2)?,
                original_intent: row.get(3)?,
                generated_prompt: row.get(4)?,
                framework: row.get(5)?,
                domain: row.get(6)?,
                model: row.get(7)?,
                rating: row.get(8)?,
                tags: row.get(9)?,
                use_count: row.get(10)?,
                is_favorite: row.get(11)?,
                created_at: row.get(12)?,
                updated_at: row.get(13)?,
            })
        })?;

        let mut results = Vec::new();
        for row in rows {
            results.push(row?);
        }
        Ok(results)
    }

    pub fn prompt_get_by_id(&self, id: i64, user_id: i64) -> DbResult<Option<PromptEntry>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, userId, title, originalIntent, generatedPrompt, framework,
                    domain, model, rating, tags, useCount, isFavorite,
                    datetime(createdAt, 'unixepoch') as created_at,
                    datetime(updatedAt, 'unixepoch') as updated_at
             FROM prompt_library WHERE id = ?1 AND userId = ?2",
        )?;

        let result = stmt.query_row(params![id, user_id], |row| {
            Ok(PromptEntry {
                id: row.get(0)?,
                user_id: row.get(1)?,
                title: row.get(2)?,
                original_intent: row.get(3)?,
                generated_prompt: row.get(4)?,
                framework: row.get(5)?,
                domain: row.get(6)?,
                model: row.get(7)?,
                rating: row.get(8)?,
                tags: row.get(9)?,
                use_count: row.get(10)?,
                is_favorite: row.get(11)?,
                created_at: row.get(12)?,
                updated_at: row.get(13)?,
            })
        }).optional()?;

        Ok(result)
    }

    pub fn prompt_create(&self, data: InsertPrompt) -> DbResult<PromptEntry> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs() as i64;

        self.conn.execute(
            "INSERT INTO prompt_library (userId, title, originalIntent, generatedPrompt, framework, domain, model, tags, useCount, isFavorite, createdAt, updatedAt)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 0, 0, ?9, ?9)",
            params![
                data.user_id,
                data.title,
                data.original_intent,
                data.generated_prompt,
                data.framework,
                data.domain,
                data.model,
                data.tags,
                now,
            ],
        )?;

        let id = self.conn.last_insert_rowid();
        self.prompt_get_by_id(id, data.user_id)?
            .ok_or_else(|| super::connection::DbError::Other("Insert failed".to_string()))
    }

    pub fn prompt_delete(&self, id: i64, user_id: i64) -> DbResult<()> {
        self.conn.execute(
            "DELETE FROM prompt_library WHERE id = ?1 AND userId = ?2",
            params![id, user_id],
        )?;
        Ok(())
    }

    pub fn prompt_update_favorite(&self, id: i64, user_id: i64, is_favorite: i64) -> DbResult<()> {
        self.conn.execute(
            "UPDATE prompt_library SET isFavorite = ?1 WHERE id = ?2 AND userId = ?3",
            params![is_favorite, id, user_id],
        )?;
        Ok(())
    }
}
