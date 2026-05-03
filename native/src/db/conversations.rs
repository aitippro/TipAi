use rusqlite::params;

use crate::{ConversationEntry, InsertConversation};

use super::connection::{Database, DbResult};

impl Database {
    pub fn conversation_create(&self, data: InsertConversation) -> DbResult<ConversationEntry> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs() as i64;

        self.conn.execute(
            "INSERT INTO project_conversations (projectId, userId, role, content, questionId, questionData, answerData, turnNumber, createdAt)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                data.project_id,
                data.user_id,
                data.role,
                data.content,
                data.question_id,
                data.question_data,
                data.answer_data,
                data.turn_number.unwrap_or(0),
                now,
            ],
        )?;

        let id = self.conn.last_insert_rowid();
        self.conversation_get_by_id(id)
            .ok_or_else(|| super::connection::DbError::Other("Insert failed".to_string()))
    }

    pub fn conversation_list_by_project(&self, project_id: i64) -> DbResult<Vec<ConversationEntry>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, projectId, userId, role, content, questionId, questionData, answerData, turnNumber,
                    datetime(createdAt, 'unixepoch') as created_at
             FROM project_conversations WHERE projectId = ?1
             ORDER BY turnNumber ASC, createdAt ASC",
        )?;

        let rows = stmt.query_map(params![project_id], |row| {
            Ok(ConversationEntry {
                id: row.get(0)?,
                project_id: row.get(1)?,
                user_id: row.get(2)?,
                role: row.get(3)?,
                content: row.get(4)?,
                question_id: row.get(5)?,
                question_data: row.get(6)?,
                answer_data: row.get(7)?,
                turn_number: row.get(8)?,
                created_at: row.get(9)?,
            })
        })?;

        let mut results = Vec::new();
        for row in rows {
            results.push(row?);
        }
        Ok(results)
    }

    fn conversation_get_by_id(&self, id: i64) -> Option<ConversationEntry> {
        self.conn.query_row(
            "SELECT id, projectId, userId, role, content, questionId, questionData, answerData, turnNumber,
                    datetime(createdAt, 'unixepoch') as created_at
             FROM project_conversations WHERE id = ?1",
            params![id],
            |row| {
                Ok(ConversationEntry {
                    id: row.get(0)?,
                    project_id: row.get(1)?,
                    user_id: row.get(2)?,
                    role: row.get(3)?,
                    content: row.get(4)?,
                    question_id: row.get(5)?,
                    question_data: row.get(6)?,
                    answer_data: row.get(7)?,
                    turn_number: row.get(8)?,
                    created_at: row.get(9)?,
                })
            },
        ).ok()
    }
}
