use aes_gcm::{
    aead::{Aead, AeadCore, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use base64::{engine::general_purpose::STANDARD as B64, Engine as _};
use rusqlite::{params, Connection, Result as SqlResult};
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::sync::Mutex;
use tauri::{command, AppHandle, Manager, State};
use winreg::{enums::HKEY_LOCAL_MACHINE, RegKey};

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

// ── Encryption helpers ─────────────────────────────────────────────────────

/// Derive a 256-bit key from the Windows machine GUID using SHA-256.
/// Uses a static fallback if the registry key is unavailable.
fn derive_db_key() -> [u8; 32] {
    let machine_id = RegKey::predef(HKEY_LOCAL_MACHINE)
        .open_subkey("SOFTWARE\\Microsoft\\Cryptography")
        .and_then(|k| k.get_value::<String, _>("MachineGuid"))
        .unwrap_or_else(|_| "winopt-fallback-no-registry-guid".to_string());

    let mut hasher = Sha256::new();
    hasher.update(b"winopt-audit-log-v1:");
    hasher.update(machine_id.as_bytes());
    hasher.finalize().into()
}

/// Encrypt a log field with AES-256-GCM. Returns `"enc:<base64>"` on success,
/// or the original text if it is empty or encryption fails.
pub fn encrypt_log_field(text: &str) -> String {
    if text.is_empty() {
        return text.to_string();
    }
    let key_bytes = derive_db_key();
    let key = aes_gcm::Key::<Aes256Gcm>::from_slice(&key_bytes);
    let cipher = Aes256Gcm::new(key);
    let nonce = Aes256Gcm::generate_nonce(&mut OsRng);

    match cipher.encrypt(&nonce, text.as_bytes()) {
        Ok(ciphertext) => {
            let mut combined = nonce.as_slice().to_vec();
            combined.extend_from_slice(&ciphertext);
            format!("enc:{}", B64.encode(&combined))
        }
        Err(_) => text.to_string(),
    }
}

/// Decrypt a log field previously encrypted by `encrypt_log_field`.
/// Transparently returns the raw string for pre-encryption rows (no `enc:` prefix).
pub fn decrypt_log_field(text: &str) -> String {
    if !text.starts_with("enc:") {
        return text.to_string(); // unencrypted row — backward compatible
    }
    let encoded = &text[4..];
    let Ok(combined) = B64.decode(encoded) else {
        return text.to_string();
    };
    if combined.len() < 12 {
        return text.to_string();
    }
    let key_bytes = derive_db_key();
    let key = aes_gcm::Key::<Aes256Gcm>::from_slice(&key_bytes);
    let cipher = Aes256Gcm::new(key);
    let nonce = Nonce::<Aes256Gcm>::from_slice(&combined[..12]);

    cipher
        .decrypt(nonce, &combined[12..])
        .map(|b| String::from_utf8_lossy(&b).to_string())
        .unwrap_or_else(|_| text.to_string())
}

// ── Database init ──────────────────────────────────────────────────────────

/// Initialize the database: create tables if they don't exist.
pub fn init_db(app: &AppHandle) -> SqlResult<Connection> {
    let app_dir = app
        .path()
        .app_data_dir()
        .expect("Failed to get app data dir");
    std::fs::create_dir_all(&app_dir).expect("Failed to create app data dir");

    let db_path = app_dir.join("winopt.db");
    let conn = Connection::open(db_path)?;

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
        ",
    )?;

    Ok(conn)
}

// ── CRUD ───────────────────────────────────────────────────────────────────

/// Insert a new history entry with sensitive fields AES-256-GCM encrypted.
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
            encrypt_log_field(&entry.command_executed),
            encrypt_log_field(&entry.stdout),
            encrypt_log_field(&entry.stderr),
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
                command_executed: decrypt_log_field(&row.get::<_, String>(6)?),
                stdout: decrypt_log_field(&row.get::<_, String>(7)?),
                stderr: decrypt_log_field(&row.get::<_, String>(8)?),
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
