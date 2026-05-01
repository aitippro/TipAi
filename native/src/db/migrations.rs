use rusqlite::Connection;
use std::fs;
use std::path::Path;

/// Run pending SQL migrations from a directory
/// Each file named like `0001_description.sql` is executed in order
pub fn run(conn: &mut Connection, migrations_dir: &str) -> Result<(), Box<dyn std::error::Error>> {
    // Ensure __migrations tracking table exists
    conn.execute(
        "CREATE TABLE IF NOT EXISTS __migrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL UNIQUE,
            applied_at TEXT NOT NULL DEFAULT (datetime('now'))
        )",
        [],
    )?;

    let applied: Vec<String> = conn
        .prepare("SELECT filename FROM __migrations ORDER BY filename")?
        .query_map([], |row| row.get(0))?
        .collect::<Result<Vec<_>, _>>()?;

    let applied_set: std::collections::HashSet<String> = applied.into_iter().collect();

    if !Path::new(migrations_dir).exists() {
        return Ok(()); // No migrations to run
    }

    let mut pending: Vec<(String, String)> = fs::read_dir(migrations_dir)?
        .filter_map(|e| e.ok())
        .filter(|e| {
            let name = e.file_name();
            let name = name.to_string_lossy();
            name.ends_with(".sql")
        })
        .map(|e| {
            let path = e.path();
            let name = path.file_name().unwrap().to_string_lossy().to_string();
            let content = fs::read_to_string(&path).unwrap_or_default();
            (name, content)
        })
        .filter(|(name, _)| !applied_set.contains(name))
        .collect();

    pending.sort_by(|a, b| a.0.cmp(&b.0));

    for (filename, sql) in pending {
        let tx = conn.transaction()?;
        tx.execute_batch(&sql)?;
        tx.execute(
            "INSERT INTO __migrations (filename) VALUES (?1)",
            [&filename],
        )?;
        tx.commit()?;
    }

    Ok(())
}
