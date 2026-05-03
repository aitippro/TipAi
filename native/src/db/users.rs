use rusqlite::{params, OptionalExtension};

use crate::{InsertUser, User};

use super::connection::{Database, DbResult};

impl Database {
    pub fn user_find_by_union_id(&self, union_id: &str) -> DbResult<Option<User>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, unionId, username, password, name, email, avatar, role,
                    datetime(createdAt, 'unixepoch') as created_at,
                    datetime(updatedAt, 'unixepoch') as updated_at,
                    datetime(lastSignInAt, 'unixepoch') as last_sign_in_at
             FROM users WHERE unionId = ?1",
        )?;

        let user = stmt
            .query_row(params![union_id], |row| {
                Ok(User {
                    id: row.get(0)?,
                    union_id: row.get(1)?,
                    username: row.get(2)?,
                    password: row.get(3)?,
                    name: row.get(4)?,
                    email: row.get(5)?,
                    avatar: row.get(6)?,
                    role: row.get(7)?,
                    created_at: row.get(8)?,
                    updated_at: row.get(9)?,
                    last_sign_in_at: row.get(10)?,
                })
            })
            .optional()?;

        Ok(user)
    }

    pub fn user_find_by_id(&self, id: i64) -> DbResult<Option<User>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, unionId, username, password, name, email, avatar, role,
                    datetime(createdAt, 'unixepoch') as created_at,
                    datetime(updatedAt, 'unixepoch') as updated_at,
                    datetime(lastSignInAt, 'unixepoch') as last_sign_in_at
             FROM users WHERE id = ?1",
        )?;

        let user = stmt
            .query_row(params![id], |row| {
                Ok(User {
                    id: row.get(0)?,
                    union_id: row.get(1)?,
                    username: row.get(2)?,
                    password: row.get(3)?,
                    name: row.get(4)?,
                    email: row.get(5)?,
                    avatar: row.get(6)?,
                    role: row.get(7)?,
                    created_at: row.get(8)?,
                    updated_at: row.get(9)?,
                    last_sign_in_at: row.get(10)?,
                })
            })
            .optional()?;

        Ok(user)
    }

    pub fn user_find_by_username(&self, username: &str) -> DbResult<Option<User>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, unionId, username, password, name, email, avatar, role,
                    datetime(createdAt, 'unixepoch') as created_at,
                    datetime(updatedAt, 'unixepoch') as updated_at,
                    datetime(lastSignInAt, 'unixepoch') as last_sign_in_at
             FROM users WHERE username = ?1",
        )?;

        let user = stmt
            .query_row(params![username], |row| {
                Ok(User {
                    id: row.get(0)?,
                    union_id: row.get(1)?,
                    username: row.get(2)?,
                    password: row.get(3)?,
                    name: row.get(4)?,
                    email: row.get(5)?,
                    avatar: row.get(6)?,
                    role: row.get(7)?,
                    created_at: row.get(8)?,
                    updated_at: row.get(9)?,
                    last_sign_in_at: row.get(10)?,
                })
            })
            .optional()?;

        Ok(user)
    }

    pub fn user_upsert(&self, data: InsertUser) -> DbResult<User> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs() as i64;

        self.conn.execute(
            "INSERT INTO users (unionId, username, password, name, email, avatar, role, createdAt, updatedAt, lastSignInAt)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8, ?8)
             ON CONFLICT(unionId) DO UPDATE SET
                 username = COALESCE(excluded.username, users.username),
                 password = COALESCE(excluded.password, users.password),
                 name = COALESCE(excluded.name, users.name),
                 email = COALESCE(excluded.email, users.email),
                 avatar = COALESCE(excluded.avatar, users.avatar),
                 role = COALESCE(excluded.role, users.role),
                 updatedAt = excluded.updatedAt,
                 lastSignInAt = excluded.lastSignInAt",
            params![
                data.union_id,
                data.username,
                data.password,
                data.name,
                data.email,
                data.avatar,
                data.role.as_deref().unwrap_or("user"),
                now,
            ],
        )?;

        self.user_find_by_union_id(&data.union_id)?
            .ok_or_else(|| super::connection::DbError::Other("Upsert failed".to_string()))
    }
}
