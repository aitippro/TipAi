use rusqlite::params;

use crate::{InsertProject, ProjectEntry, StepEntry, UpdateStep};

use super::connection::{Database, DbResult};

impl Database {
    // ── Projects ─────────────────────────────────────────────

    pub fn project_list(&self, user_id: i64) -> DbResult<Vec<ProjectEntry>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, userId, title, description, domain, status, intent,
                    clarificationStatus, turnCount,
                    datetime(createdAt, 'unixepoch') as created_at,
                    datetime(updatedAt, 'unixepoch') as updated_at
             FROM projects WHERE userId = ?1
             ORDER BY updatedAt DESC",
        )?;

        let rows = stmt.query_map(params![user_id], |row| {
            Ok(ProjectEntry {
                id: row.get(0)?,
                user_id: row.get(1)?,
                title: row.get(2)?,
                description: row.get(3)?,
                domain: row.get(4)?,
                status: row.get(5)?,
                intent: row.get(6)?,
                clarification_status: row.get(7)?,
                turn_count: row.get(8)?,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
            })
        })?;

        let mut results = Vec::new();
        for row in rows {
            results.push(row?);
        }
        Ok(results)
    }

    pub fn project_create(&self, data: InsertProject) -> DbResult<ProjectEntry> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        self.conn.execute(
            "INSERT INTO projects (userId, title, description, domain, status, intent, clarificationStatus, turnCount, createdAt, updatedAt)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'pending', 0, ?7, ?7)",
            params![
                data.user_id,
                data.title,
                data.description,
                data.domain.as_deref().unwrap_or("general"),
                data.status.as_deref().unwrap_or("draft"),
                data.intent,
                now,
            ],
        )?;

        let id = self.conn.last_insert_rowid();
        self.project_list(data.user_id)?
            .into_iter()
            .find(|p| p.id == id)
            .ok_or_else(|| super::connection::DbError::Other("Insert failed".to_string()))
    }

    pub fn project_delete(&self, id: i64, user_id: i64) -> DbResult<()> {
        // Cascade delete steps handled by SQLite foreign keys if configured
        self.conn.execute(
            "DELETE FROM steps WHERE projectId = ?1",
            params![id],
        )?;
        self.conn.execute(
            "DELETE FROM projects WHERE id = ?1 AND userId = ?2",
            params![id, user_id],
        )?;
        Ok(())
    }

    // ── Steps ────────────────────────────────────────────────

    pub fn step_list(&self, project_id: i64) -> DbResult<Vec<StepEntry>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, projectId, title, description, prompt, stage, orderNum, status,
                    output, parentStepId, model, temperature, decode_strategy,
                    datetime(createdAt, 'unixepoch') as created_at,
                    datetime(updatedAt, 'unixepoch') as updated_at
             FROM steps WHERE projectId = ?1
             ORDER BY orderNum ASC",
        )?;

        let rows = stmt.query_map(params![project_id], |row| {
            Ok(StepEntry {
                id: row.get(0)?,
                project_id: row.get(1)?,
                title: row.get(2)?,
                description: row.get(3)?,
                prompt: row.get(4)?,
                stage: row.get(5)?,
                order_num: row.get(6)?,
                status: row.get(7)?,
                output: row.get(8)?,
                parent_step_id: row.get(9)?,
                model: row.get(10)?,
                temperature: row.get(11)?,
                decode_strategy: row.get(12)?,
                created_at: row.get(13)?,
                updated_at: row.get(14)?,
            })
        })?;

        let mut results = Vec::new();
        for row in rows {
            results.push(row?);
        }
        Ok(results)
    }

    pub fn step_update(&self, id: i64, data: UpdateStep) -> DbResult<StepEntry> {
        let mut fields: Vec<String> = Vec::new();
        let mut values: Vec<rusqlite::types::Value> = Vec::new();

        if let Some(v) = data.title {
            fields.push(format!("title = ?{}", values.len() + 1));
            values.push(v.into());
        }
        if let Some(v) = data.description {
            fields.push(format!("description = ?{}", values.len() + 1));
            values.push(v.into());
        }
        if let Some(v) = data.prompt {
            fields.push(format!("prompt = ?{}", values.len() + 1));
            values.push(v.into());
        }
        if let Some(v) = data.status {
            fields.push(format!("status = ?{}", values.len() + 1));
            values.push(v.into());
        }
        if let Some(v) = data.output {
            fields.push(format!("output = ?{}", values.len() + 1));
            values.push(v.into());
        }
        if let Some(v) = data.model {
            fields.push(format!("model = ?{}", values.len() + 1));
            values.push(v.into());
        }
        if let Some(v) = data.temperature {
            fields.push(format!("temperature = ?{}", values.len() + 1));
            values.push(v.into());
        }

        if fields.is_empty() {
            // Nothing to update, fetch and return
            let mut stmt = self.conn.prepare(
                "SELECT id, projectId, title, description, prompt, stage, orderNum, status,
                        output, parentStepId, model, temperature, decode_strategy,
                        datetime(createdAt, 'unixepoch') as created_at,
                        datetime(updatedAt, 'unixepoch') as updated_at
                 FROM steps WHERE id = ?1",
            )?;
            return stmt.query_row(params![id], |row| {
                Ok(StepEntry {
                    id: row.get(0)?,
                    project_id: row.get(1)?,
                    title: row.get(2)?,
                    description: row.get(3)?,
                    prompt: row.get(4)?,
                    stage: row.get(5)?,
                    order_num: row.get(6)?,
                    status: row.get(7)?,
                    output: row.get(8)?,
                    parent_step_id: row.get(9)?,
                    model: row.get(10)?,
                    temperature: row.get(11)?,
                    decode_strategy: row.get(12)?,
                    created_at: row.get(13)?,
                    updated_at: row.get(14)?,
                })
            }).map_err(Into::into);
        }

        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;
        fields.push(format!("updatedAt = ?{}", values.len() + 1));
        values.push(now.into());

        let sql = format!("UPDATE steps SET {} WHERE id = ?{}", fields.join(", "), values.len() + 1);
        values.push(id.into());

        self.conn.execute(&sql, rusqlite::params_from_iter(values.iter()))?;

        let mut stmt = self.conn.prepare(
            "SELECT id, projectId, title, description, prompt, stage, orderNum, status,
                    output, parentStepId, model, temperature, decode_strategy,
                    datetime(createdAt, 'unixepoch') as created_at,
                    datetime(updatedAt, 'unixepoch') as updated_at
             FROM steps WHERE id = ?1",
        )?;
        stmt.query_row(params![id], |row| {
            Ok(StepEntry {
                id: row.get(0)?,
                project_id: row.get(1)?,
                title: row.get(2)?,
                description: row.get(3)?,
                prompt: row.get(4)?,
                stage: row.get(5)?,
                order_num: row.get(6)?,
                status: row.get(7)?,
                output: row.get(8)?,
                parent_step_id: row.get(9)?,
                model: row.get(10)?,
                temperature: row.get(11)?,
                decode_strategy: row.get(12)?,
                created_at: row.get(13)?,
                updated_at: row.get(14)?,
            })
        }).map_err(Into::into)
    }
}
