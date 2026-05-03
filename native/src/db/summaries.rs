use rusqlite::{params, OptionalExtension};

use crate::{SummaryEntry, InsertSummary};

use super::connection::{Database, DbResult};

impl Database {
    pub fn summary_get_by_project(&self, project_id: i64) -> DbResult<Option<SummaryEntry>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, projectId, userId, summary, requirements, constraints, suggestedFrameworks, rawContext, isFinalized,
                    datetime(createdAt, 'unixepoch') as created_at,
                    datetime(updatedAt, 'unixepoch') as updated_at
             FROM project_summaries WHERE projectId = ?1",
        )?;

        let summary = stmt
            .query_row(params![project_id], |row| {
                Ok(SummaryEntry {
                    id: row.get(0)?,
                    project_id: row.get(1)?,
                    user_id: row.get(2)?,
                    summary: row.get(3)?,
                    requirements: row.get(4)?,
                    constraints: row.get(5)?,
                    suggested_frameworks: row.get(6)?,
                    raw_context: row.get(7)?,
                    is_finalized: row.get(8)?,
                    created_at: row.get(9)?,
                    updated_at: row.get(10)?,
                })
            })
            .optional()?;

        Ok(summary)
    }

    pub fn summary_upsert(&self, data: InsertSummary) -> DbResult<SummaryEntry> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs() as i64;

        self.conn.execute(
            "INSERT INTO project_summaries
             (projectId, userId, summary, requirements, constraints, suggestedFrameworks, rawContext, isFinalized, createdAt, updatedAt)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?9)
             ON CONFLICT(projectId) DO UPDATE SET
             summary = excluded.summary,
             requirements = excluded.requirements,
             constraints = excluded.constraints,
             suggestedFrameworks = excluded.suggestedFrameworks,
             rawContext = excluded.rawContext,
             isFinalized = excluded.isFinalized,
             updatedAt = excluded.updatedAt",
            params![
                data.project_id,
                data.user_id,
                data.summary,
                data.requirements,
                data.constraints,
                data.suggested_frameworks,
                data.raw_context,
                data.is_finalized.unwrap_or(0),
                now,
            ],
        )?;

        self.summary_get_by_project(data.project_id)?
            .ok_or_else(|| super::connection::DbError::Other("Upsert failed".to_string()))
    }
}
