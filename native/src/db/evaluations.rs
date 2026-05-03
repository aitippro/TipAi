use rusqlite::params;

use crate::{EvaluationEntry, EvaluationStats, InsertEvaluation};

use super::connection::{Database, DbResult};

impl Database {
    pub fn evaluation_create(&self, data: InsertEvaluation) -> DbResult<EvaluationEntry> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs() as i64;

        self.conn.execute(
            "INSERT INTO evaluations (projectId, stepId, userId, dimension, score, feedback, createdAt)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                data.project_id,
                data.step_id,
                data.user_id,
                data.dimension,
                data.score,
                data.feedback,
                now,
            ],
        )?;

        let id = self.conn.last_insert_rowid();
        self.evaluation_get_by_id(id)
            .ok_or_else(|| super::connection::DbError::Other("Insert failed".to_string()))
    }

    pub fn evaluation_stats(&self, project_id: Option<i64>) -> DbResult<EvaluationStats> {
        let (where_clause, params_vec): (&str, Vec<rusqlite::types::Value>) = match project_id {
            Some(pid) => ("WHERE projectId = ?1", vec![pid.into()]),
            None => ("", vec![]),
        };

        let sql = format!(
            "SELECT
                COUNT(*) as total_count,
                AVG(CASE WHEN dimension = 'clarity' THEN score END) as avg_clarity,
                AVG(CASE WHEN dimension = 'relevance' THEN score END) as avg_relevance,
                AVG(CASE WHEN dimension = 'completeness' THEN score END) as avg_completeness,
                AVG(CASE WHEN dimension = 'actionability' THEN score END) as avg_actionability,
                AVG(CASE WHEN dimension = 'overall' THEN score END) as avg_overall
             FROM evaluations {}",
            where_clause
        );

        let row = self.conn.query_row(&sql, rusqlite::params_from_iter(params_vec.iter()), |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, Option<f64>>(1)?,
                row.get::<_, Option<f64>>(2)?,
                row.get::<_, Option<f64>>(3)?,
                row.get::<_, Option<f64>>(4)?,
                row.get::<_, Option<f64>>(5)?,
            ))
        })?;

        Ok(EvaluationStats {
            total_count: row.0,
            avg_clarity: row.1,
            avg_relevance: row.2,
            avg_completeness: row.3,
            avg_actionability: row.4,
            avg_overall: row.5,
        })
    }

    pub fn evaluation_list(&self, project_id: Option<i64>, limit: i64) -> DbResult<Vec<EvaluationEntry>> {
        let (where_clause, mut params_vec): (&str, Vec<rusqlite::types::Value>) = match project_id {
            Some(pid) => ("WHERE projectId = ?1", vec![pid.into()]),
            None => ("", vec![]),
        };

        let sql = format!(
            "SELECT id, projectId, stepId, userId, dimension, score, feedback,
                    datetime(createdAt, 'unixepoch') as created_at
             FROM evaluations {} ORDER BY createdAt DESC LIMIT ?{}",
            where_clause,
            params_vec.len() + 1
        );
        params_vec.push(limit.into());

        let mut stmt = self.conn.prepare(&sql)?;
        let rows = stmt.query_map(rusqlite::params_from_iter(params_vec.iter()), |row| {
            Ok(EvaluationEntry {
                id: row.get(0)?,
                project_id: row.get(1)?,
                step_id: row.get(2)?,
                user_id: row.get(3)?,
                dimension: row.get(4)?,
                score: row.get(5)?,
                feedback: row.get(6)?,
                created_at: row.get(7)?,
            })
        })?;

        let mut results = Vec::new();
        for row in rows {
            results.push(row?);
        }
        Ok(results)
    }

    fn evaluation_get_by_id(&self, id: i64) -> Option<EvaluationEntry> {
        self.conn.query_row(
            "SELECT id, projectId, stepId, userId, dimension, score, feedback,
                    datetime(createdAt, 'unixepoch') as created_at
             FROM evaluations WHERE id = ?1",
            params![id],
            |row| {
                Ok(EvaluationEntry {
                    id: row.get(0)?,
                    project_id: row.get(1)?,
                    step_id: row.get(2)?,
                    user_id: row.get(3)?,
                    dimension: row.get(4)?,
                    score: row.get(5)?,
                    feedback: row.get(6)?,
                    created_at: row.get(7)?,
                })
            },
        ).ok()
    }
}
