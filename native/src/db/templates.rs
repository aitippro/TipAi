use rusqlite::params;

use crate::{InsertTemplate, TemplateEntry};

use super::connection::{Database, DbResult};

impl Database {
    pub fn template_list_public(&self) -> DbResult<Vec<TemplateEntry>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, userId, title, description, framework, domain, content,
                    tags, useCount, rating, ratingCount, isPublic, isFeatured,
                    datetime(createdAt, 'unixepoch') as created_at
             FROM templates WHERE isPublic = 1
             ORDER BY isFeatured DESC, useCount DESC, createdAt DESC",
        )?;

        let rows = stmt.query_map([], |row| {
            Ok(TemplateEntry {
                id: row.get(0)?,
                user_id: row.get(1)?,
                title: row.get(2)?,
                description: row.get(3)?,
                framework: row.get(4)?,
                domain: row.get(5)?,
                content: row.get(6)?,
                tags: row.get(7)?,
                use_count: row.get(8)?,
                rating: row.get(9)?,
                rating_count: row.get(10)?,
                is_public: row.get(11)?,
                is_featured: row.get(12)?,
                created_at: row.get(13)?,
            })
        })?;

        let mut results = Vec::new();
        for row in rows {
            results.push(row?);
        }
        Ok(results)
    }

    pub fn template_list_by_user(&self, user_id: i64) -> DbResult<Vec<TemplateEntry>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, userId, title, description, framework, domain, content,
                    tags, useCount, rating, ratingCount, isPublic, isFeatured,
                    datetime(createdAt, 'unixepoch') as created_at
             FROM templates WHERE userId = ?1
             ORDER BY createdAt DESC",
        )?;

        let rows = stmt.query_map(params![user_id], |row| {
            Ok(TemplateEntry {
                id: row.get(0)?,
                user_id: row.get(1)?,
                title: row.get(2)?,
                description: row.get(3)?,
                framework: row.get(4)?,
                domain: row.get(5)?,
                content: row.get(6)?,
                tags: row.get(7)?,
                use_count: row.get(8)?,
                rating: row.get(9)?,
                rating_count: row.get(10)?,
                is_public: row.get(11)?,
                is_featured: row.get(12)?,
                created_at: row.get(13)?,
            })
        })?;

        let mut results = Vec::new();
        for row in rows {
            results.push(row?);
        }
        Ok(results)
    }

    pub fn template_create(&self, data: InsertTemplate) -> DbResult<TemplateEntry> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        self.conn.execute(
            "INSERT INTO templates (userId, title, description, framework, domain, content, tags, isPublic, useCount, ratingCount, isFeatured, createdAt)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 0, 0, 0, ?9)",
            params![
                data.user_id,
                data.title,
                data.description,
                data.framework,
                data.domain,
                data.content,
                data.tags,
                data.is_public.unwrap_or(1),
                now,
            ],
        )?;

        let id = self.conn.last_insert_rowid();
        self.template_list_by_user(data.user_id)?
            .into_iter()
            .find(|t| t.id == id)
            .ok_or_else(|| super::connection::DbError::Other("Insert failed".to_string()))
    }

    pub fn template_delete(&self, id: i64, user_id: i64) -> DbResult<()> {
        self.conn.execute(
            "DELETE FROM templates WHERE id = ?1 AND userId = ?2",
            params![id, user_id],
        )?;
        Ok(())
    }
}
