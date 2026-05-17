use rusqlite::{params, Connection, Result as SqlResult};
use serde::Serialize;
use std::sync::Mutex;
use tauri::{command, AppHandle, Manager, State};

/// Wrapper for the SQLite connection, stored in Tauri managed state.
pub struct DbState(pub Mutex<Connection>);

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TweakHistoryEntry {
    pub id: String,
    pub tweak_id: String,
    pub tweak_name: String,
    pub action: String, // "APPLIED" | "REVERTED" | "FAILED"
    pub timestamp: i64,
    pub duration_ms: i64,
    pub command_executed: String,
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
    pub status: String, // "SUCCESS" | "FAILED" | "TIMEOUT"
}

// ── Database init ──────────────────────────────────────────────────────────

/// Initialize the database: create tables if they don't exist.
pub fn init_db(app: &AppHandle) -> Result<Connection, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    std::fs::create_dir_all(&app_dir)
        .map_err(|e| format!("Failed to create app data dir: {}", e))?;

    let db_path = app_dir.join("winopt.db");
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS tweak_history (
            id              TEXT PRIMARY KEY,
            tweak_id        TEXT NOT NULL,
            tweak_name      TEXT NOT NULL,
            action          TEXT NOT NULL,
            timestamp       INTEGER NOT NULL,
            duration_ms     INTEGER NOT NULL DEFAULT 0,
            command_executed TEXT NOT NULL DEFAULT '',
            stdout          TEXT NOT NULL DEFAULT '',
            stderr          TEXT NOT NULL DEFAULT '',
            exit_code       INTEGER NOT NULL DEFAULT 0,
            status          TEXT NOT NULL DEFAULT 'SUCCESS'
        );

        CREATE INDEX IF NOT EXISTS idx_history_timestamp ON tweak_history(timestamp DESC);
        CREATE INDEX IF NOT EXISTS idx_history_tweak_id ON tweak_history(tweak_id);

        CREATE TABLE IF NOT EXISTS consent_log (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          agreed_at   TEXT NOT NULL,
          eula_version TEXT NOT NULL,
          app_version TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS db_meta (
          key   TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
        ",
    )
    .map_err(|e| e.to_string())?;

    Ok(conn)
}

// ── CRUD ───────────────────────────────────────────────────────────────────

/// Insert a new history entry.
pub fn insert_history(conn: &Connection, entry: &TweakHistoryEntry) -> SqlResult<()> {
    conn.execute(
        "INSERT INTO tweak_history (id, tweak_id, tweak_name, action, timestamp, duration_ms, command_executed, stdout, stderr, exit_code, status)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        params![
            entry.id,
            entry.tweak_id,
            entry.tweak_name,
            entry.action,
            entry.timestamp,
            entry.duration_ms,
            entry.command_executed,
            entry.stdout,
            entry.stderr,
            entry.exit_code,
            entry.status,
        ],
    )?;
    Ok(())
}

/// Tauri command: get tweak history with optional limit and since-timestamp filter.
#[command]
pub fn get_tweak_history(
    db: State<'_, DbState>,
    limit: Option<i64>,
    since_timestamp: Option<i64>,
) -> Result<Vec<TweakHistoryEntry>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let limit = limit.unwrap_or(100);
    let since = since_timestamp.unwrap_or(0);

    let mut stmt = conn
        .prepare(
            "SELECT id, tweak_id, tweak_name, action, timestamp, duration_ms, command_executed, stdout, stderr, exit_code, status
             FROM tweak_history
             WHERE timestamp >= ?1
             ORDER BY timestamp DESC
             LIMIT ?2",
        )
        .map_err(|e| e.to_string())?;

    let entries = stmt
        .query_map(params![since, limit], |row| {
            Ok(TweakHistoryEntry {
                id: row.get(0)?,
                tweak_id: row.get(1)?,
                tweak_name: row.get(2)?,
                action: row.get(3)?,
                timestamp: row.get(4)?,
                duration_ms: row.get(5)?,
                command_executed: row.get(6)?,
                stdout: row.get(7)?,
                stderr: row.get(8)?,
                exit_code: row.get(9)?,
                status: row.get(10)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<SqlResult<Vec<_>>>()
        .map_err(|e| e.to_string())?;

    Ok(entries)
}

/// Tauri command: clear all tweak history.
#[command]
pub fn clear_tweak_history(db: State<'_, DbState>) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM tweak_history", [])
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// Tauri command: record user consent to EULA and Privacy Policy.
/// Called once on first run from the consent modal.
#[command]
pub fn record_consent(
    db: State<'_, DbState>,
    agreed_at: String,
    eula_version: String,
    app_version: String,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO consent_log (agreed_at, eula_version, app_version) VALUES (?1, ?2, ?3)",
        params![agreed_at, eula_version, app_version],
    )
    .map_err(|e| format!("Failed to record consent: {}", e))?;
    Ok(())
}

/// Tauri command: check if consent has already been recorded.
#[command]
pub fn check_consent_exists(db: State<'_, DbState>) -> Result<bool, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM consent_log", [], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    Ok(count > 0)
}

// ── Tests ──────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    fn open_test_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("
            CREATE TABLE IF NOT EXISTS consent_log (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              agreed_at TEXT NOT NULL,
              eula_version TEXT NOT NULL,
              app_version TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS db_meta (
              key TEXT PRIMARY KEY,
              value TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS tweak_history (
              id TEXT PRIMARY KEY, tweak_id TEXT NOT NULL, tweak_name TEXT NOT NULL,
              action TEXT NOT NULL, timestamp INTEGER NOT NULL, duration_ms INTEGER NOT NULL DEFAULT 0,
              command_executed TEXT NOT NULL DEFAULT '', stdout TEXT NOT NULL DEFAULT '',
              stderr TEXT NOT NULL DEFAULT '', exit_code INTEGER NOT NULL DEFAULT 0,
              status TEXT NOT NULL DEFAULT 'SUCCESS'
            );
        ").unwrap();
        conn
    }

    #[test]
    fn test_consent_log_table_created() {
        let conn = open_test_db();
        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM consent_log", [], |r| r.get(0))
            .unwrap();
        assert_eq!(count, 0);
    }

    #[test]
    fn test_record_consent_inserts_row() {
        let conn = open_test_db();
        conn.execute(
            "INSERT INTO consent_log (agreed_at, eula_version, app_version) VALUES (?1, ?2, ?3)",
            rusqlite::params!["2026-03-20T10:00:00Z", "1.0", "1.0.0"],
        )
        .unwrap();
        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM consent_log", [], |r| r.get(0))
            .unwrap();
        assert_eq!(count, 1);
    }

    #[test]
    fn test_db_meta_table_created() {
        let conn = open_test_db();
        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM db_meta", [], |r| r.get(0))
            .unwrap();
        assert_eq!(count, 0);
    }

    #[test]
    fn test_insert_history_stores_audit_fields() {
        let conn = open_test_db();
        let entry = TweakHistoryEntry {
            id: "t1".to_string(),
            tweak_id: "tweak1".to_string(),
            tweak_name: "Test".to_string(),
            action: "APPLIED".to_string(),
            timestamp: 1000,
            duration_ms: 50,
            command_executed: "reg add HKCU\\test".to_string(),
            stdout: "ok".to_string(),
            stderr: String::new(),
            exit_code: 0,
            status: "SUCCESS".to_string(),
        };
        insert_history(&conn, &entry).unwrap();

        let cmd: String = conn
            .query_row(
                "SELECT command_executed FROM tweak_history WHERE id='t1'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(cmd, "reg add HKCU\\test");
    }
}
