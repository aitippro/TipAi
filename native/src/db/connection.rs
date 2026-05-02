use rusqlite::{Connection, OpenFlags};
use thiserror::Error;

use super::migrations;

#[derive(Debug, Error)]
pub enum DbError {
    #[error("SQLite error: {0}")]
    Sqlite(#[from] rusqlite::Error),
    #[error("Migration error: {0}")]
    Migration(String),
    #[allow(dead_code)]
    #[error("Not found")]
    NotFound,
    #[error("Crypto error: {0}")]
    Crypto(String),
    #[error("{0}")]
    Other(String),
}

impl From<crate::crypto::CryptoError> for DbError {
    fn from(e: crate::crypto::CryptoError) -> Self {
        DbError::Crypto(e.to_string())
    }
}

pub type DbResult<T> = Result<T, DbError>;

/// Thread-safe database wrapper
pub struct Database {
    pub(crate) conn: Connection,
    secret_key: Option<String>,
}

impl Database {
    pub fn open(path: &str, secret_key: Option<&str>) -> DbResult<Self> {
        let flags = OpenFlags::SQLITE_OPEN_READ_WRITE
            | OpenFlags::SQLITE_OPEN_CREATE
            | OpenFlags::SQLITE_OPEN_FULL_MUTEX;

        let conn = Connection::open_with_flags(path, flags)?;

        // WAL mode for better concurrent read performance
        conn.pragma_update(None, "journal_mode", "WAL")?;
        conn.pragma_update(None, "synchronous", "NORMAL")?;
        conn.pragma_update(None, "foreign_keys", "ON")?;
        conn.pragma_update(None, "temp_store", "MEMORY")?;
        conn.pragma_update(None, "mmap_size", "30000000000")?;

        // Optimize for single-writer, many-reader pattern
        conn.execute_batch(
            "PRAGMA cache_size = -64000;
             PRAGMA query_only = false;",
        )?;

        Ok(Self {
            conn,
            secret_key: secret_key.map(|s| s.to_string()),
        })
    }

    pub fn secret_key(&self) -> Option<&str> {
        self.secret_key.as_deref()
    }

    pub fn run_migrations(&mut self, migrations_dir: &str) -> DbResult<()> {
        migrations::run(&mut self.conn, migrations_dir)
            .map_err(|e| DbError::Migration(e.to_string()))
    }

    #[allow(dead_code)]
    pub fn conn(&self) -> &Connection {
        &self.conn
    }
}
