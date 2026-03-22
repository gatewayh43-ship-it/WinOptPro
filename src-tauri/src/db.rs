use aes_gcm::{
    aead::{generic_array::GenericArray, rand_core::RngCore, Aead, AeadCore, KeyInit, OsRng},
    Aes256Gcm,
};
use base64::{engine::general_purpose::STANDARD as B64, Engine as _};
use rusqlite::{params, Connection, Result as SqlResult};
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::sync::Mutex;
use tauri::{command, AppHandle, Manager, State};
use winreg::{enums::HKEY_LOCAL_MACHINE, RegKey};

#[cfg(windows)]
use windows::Win32::Security::Cryptography::{CryptProtectData, CryptUnprotectData, CRYPT_INTEGER_BLOB};
#[cfg(windows)]
use windows::Win32::Foundation::HLOCAL;

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
/// Kept for decrypting legacy rows with the `enc:` prefix.
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

/// Derive a per-user 32-byte key using Windows DPAPI.
/// DPAPI ties the output to the current Windows user account credentials,
/// so any other user or process cannot decrypt these blobs.
/// Falls back to MachineGuid + salt when DPAPI is unavailable (Safe Mode, non-Windows).
fn derive_dpapi_key() -> [u8; 32] {
    #[cfg(windows)]
    {
        // A fixed application seed — DPAPI wraps it with the current user's master key.
        let seed: &[u8] = b"winopt-audit-log-dpapi-v1";

        let data_in = CRYPT_INTEGER_BLOB {
            cbData: seed.len() as u32,
            pbData: seed.as_ptr() as *mut u8,
        };
        let mut data_out = CRYPT_INTEGER_BLOB {
            cbData: 0,
            pbData: std::ptr::null_mut(),
        };

        let result = unsafe {
            CryptProtectData(
                &data_in,
                windows::core::PCWSTR::null(),
                None,
                None,
                None,
                0,
                &mut data_out,
            )
        };

        if result.is_ok() && !data_out.pbData.is_null() {
            let blob = unsafe {
                std::slice::from_raw_parts(data_out.pbData, data_out.cbData as usize).to_vec()
            };
            // Free the memory allocated by CryptProtectData via LocalFree.
            unsafe { windows::Win32::Foundation::LocalFree(HLOCAL(data_out.pbData as *mut core::ffi::c_void)) };
            let mut hasher = Sha256::new();
            hasher.update(&blob);
            return hasher.finalize().into();
        }
        // DPAPI call failed — fall through to the legacy fallback below.
    }

    // Fallback: MachineGuid + distinguishing salt.
    // Better than MachineGuid alone (different key space from legacy enc: rows).
    let machine_id = RegKey::predef(HKEY_LOCAL_MACHINE)
        .open_subkey("SOFTWARE\\Microsoft\\Cryptography")
        .and_then(|k| k.get_value::<String, _>("MachineGuid"))
        .unwrap_or_else(|_| "winopt-fallback".to_string());
    let mut hasher = Sha256::new();
    hasher.update(b"winopt-dpapi-fallback-v2:");
    hasher.update(machine_id.as_bytes());
    hasher.finalize().into()
}

/// Encrypt a log field with AES-256-GCM using the legacy MachineGuid key.
/// Returns `"enc:<base64>"` on success, or the original text if empty/failed.
/// Kept for reading legacy rows; new writes use `encrypt_log_field_dpapi`.
#[allow(dead_code)]
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

/// Decrypt a log field previously encrypted by `encrypt_log_field` (legacy `enc:` prefix).
/// Transparently returns the raw string for pre-encryption rows (no prefix).
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
    let nonce = GenericArray::from_slice(&combined[..12]);

    cipher
        .decrypt(nonce, &combined[12..])
        .map(|b| String::from_utf8_lossy(&b).to_string())
        .unwrap_or_else(|_| text.to_string())
}

/// Encrypt a log field with DPAPI-derived per-user key + AES-256-GCM.
/// Returns `"dpapi:<base64(nonce+ct)>"` on success, or the original text if empty/failed.
pub fn encrypt_log_field_dpapi(text: &str) -> String {
    if text.is_empty() {
        return text.to_string();
    }
    let key_bytes = derive_dpapi_key();
    let key = aes_gcm::Key::<Aes256Gcm>::from_slice(&key_bytes);
    let cipher = Aes256Gcm::new(key);
    let nonce = Aes256Gcm::generate_nonce(&mut OsRng);
    match cipher.encrypt(&nonce, text.as_bytes()) {
        Ok(ct) => {
            let mut combined = nonce.as_slice().to_vec();
            combined.extend_from_slice(&ct);
            format!("dpapi:{}", B64.encode(&combined))
        }
        Err(_) => text.to_string(),
    }
}

/// Decrypt a DPAPI-encrypted field (prefix `"dpapi:"`).
pub fn decrypt_log_field_dpapi(text: &str) -> String {
    if !text.starts_with("dpapi:") {
        return text.to_string();
    }
    let encoded = &text[6..];
    let Ok(combined) = B64.decode(encoded) else {
        return text.to_string();
    };
    if combined.len() < 12 {
        return text.to_string();
    }
    let key_bytes = derive_dpapi_key();
    let key = aes_gcm::Key::<Aes256Gcm>::from_slice(&key_bytes);
    let cipher = Aes256Gcm::new(key);
    let nonce = GenericArray::from_slice(&combined[..12]);
    cipher
        .decrypt(nonce, &combined[12..])
        .map(|b| String::from_utf8_lossy(&b).to_string())
        .unwrap_or_else(|_| text.to_string())
}

/// Decrypt any log field regardless of which key version encrypted it.
/// Handles `dpapi:` (new), `enc:` (legacy MachineGuid), and plaintext rows.
pub fn decrypt_any_log_field(text: &str) -> String {
    if text.starts_with("dpapi:") {
        decrypt_log_field_dpapi(text)
    } else {
        decrypt_log_field(text) // legacy enc: or unencrypted plaintext
    }
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

/// Insert a new history entry with sensitive fields encrypted via DPAPI + AES-256-GCM.
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
            encrypt_log_field_dpapi(&entry.command_executed),
            encrypt_log_field_dpapi(&entry.stdout),
            encrypt_log_field_dpapi(&entry.stderr),
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
                command_executed: decrypt_any_log_field(&row.get::<_, String>(6)?),
                stdout: decrypt_any_log_field(&row.get::<_, String>(7)?),
                stderr: decrypt_any_log_field(&row.get::<_, String>(8)?),
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

// ── DPAPI two-pass migration ────────────────────────────────────────────────

/// Encrypt a log field using an explicit 32-byte AES key (used during migration).
/// Returns `"dpapi:<base64(nonce+ct)>"` on success, or the original text if empty/failed.
fn encrypt_log_field_with_key(text: &str, key: &[u8; 32]) -> String {
    if text.is_empty() {
        return text.to_string();
    }
    let k = aes_gcm::Key::<Aes256Gcm>::from_slice(key);
    let cipher = Aes256Gcm::new(k);
    let nonce = Aes256Gcm::generate_nonce(&mut OsRng);
    match cipher.encrypt(&nonce, text.as_bytes()) {
        Ok(ct) => {
            let mut combined = nonce.as_slice().to_vec();
            combined.extend_from_slice(&ct);
            format!("dpapi:{}", B64.encode(&combined))
        }
        Err(_) => text.to_string(),
    }
}

/// Load or create the DPAPI-protected AES key for audit log encryption.
/// Stores the sealed key in db_meta under "dpapi_aes_key".
/// Returns a 32-byte AES key. Falls back to derive_db_key_fallback() if DPAPI unavailable.
pub fn get_or_create_dpapi_key(conn: &Connection) -> [u8; 32] {
    if let Ok(sealed_b64) = conn.query_row(
        "SELECT value FROM db_meta WHERE key='dpapi_aes_key'",
        [],
        |r| r.get::<_, String>(0),
    ) {
        if let Ok(sealed) = B64.decode(&sealed_b64) {
            #[cfg(windows)]
            if let Some(key) = dpapi_unprotect_blob(&sealed) {
                if key.len() == 32 {
                    let mut arr = [0u8; 32];
                    arr.copy_from_slice(&key);
                    return arr;
                }
            }
            #[cfg(not(windows))]
            let _ = sealed;
        }
        log::warn!("DPAPI unsealing failed; using fallback key derivation");
        return derive_db_key_fallback();
    }

    let mut new_key = [0u8; 32];
    OsRng.fill_bytes(&mut new_key);

    #[cfg(windows)]
    match dpapi_protect_blob(&new_key) {
        Some(sealed) => {
            let sealed_b64 = B64.encode(&sealed);
            let _ = conn.execute(
                "INSERT OR REPLACE INTO db_meta (key, value) VALUES ('dpapi_aes_key', ?1)",
                params![sealed_b64],
            );
            new_key
        }
        None => {
            log::warn!("DPAPI protection unavailable; using fallback key derivation.");
            derive_db_key_fallback()
        }
    }
    #[cfg(not(windows))]
    {
        log::warn!("DPAPI not available on this platform; using fallback key derivation.");
        derive_db_key_fallback()
    }
}

/// Fallback 32-byte key derivation when DPAPI is unavailable.
/// Uses MachineGuid + a distinguishing salt.
pub fn derive_db_key_fallback() -> [u8; 32] {
    let machine_id = RegKey::predef(HKEY_LOCAL_MACHINE)
        .open_subkey("SOFTWARE\\Microsoft\\Cryptography")
        .and_then(|k| k.get_value::<String, _>("MachineGuid"))
        .unwrap_or_else(|_| "winopt-fallback-no-guid".to_string());
    let mut hasher = Sha256::new();
    hasher.update(b"winopt-dpapi-fallback-v2:");
    hasher.update(machine_id.as_bytes());
    hasher.finalize().into()
}

/// Seal a raw byte slice with DPAPI (Windows only).
/// Returns None on non-Windows or if DPAPI call fails.
#[cfg(windows)]
fn dpapi_protect_blob(data: &[u8]) -> Option<Vec<u8>> {
    let data_in = CRYPT_INTEGER_BLOB {
        cbData: data.len() as u32,
        pbData: data.as_ptr() as *mut u8,
    };
    let mut data_out = CRYPT_INTEGER_BLOB {
        cbData: 0,
        pbData: std::ptr::null_mut(),
    };
    let result = unsafe {
        CryptProtectData(
            &data_in,
            windows::core::PCWSTR::null(),
            None,
            None,
            None,
            0,
            &mut data_out,
        )
    };
    if result.is_ok() && !data_out.pbData.is_null() {
        let blob = unsafe {
            std::slice::from_raw_parts(data_out.pbData, data_out.cbData as usize).to_vec()
        };
        unsafe {
            windows::Win32::Foundation::LocalFree(HLOCAL(data_out.pbData as *mut core::ffi::c_void))
        };
        Some(blob)
    } else {
        None
    }
}

/// Unseal a DPAPI-protected blob (Windows only).
/// Returns None on non-Windows or if DPAPI call fails.
#[cfg(windows)]
fn dpapi_unprotect_blob(data: &[u8]) -> Option<Vec<u8>> {
    let data_in = CRYPT_INTEGER_BLOB {
        cbData: data.len() as u32,
        pbData: data.as_ptr() as *mut u8,
    };
    let mut data_out = CRYPT_INTEGER_BLOB {
        cbData: 0,
        pbData: std::ptr::null_mut(),
    };
    let result = unsafe {
        CryptUnprotectData(
            &data_in,
            None,
            None,
            None,
            None,
            0,
            &mut data_out,
        )
    };
    if result.is_ok() && !data_out.pbData.is_null() {
        let blob = unsafe {
            std::slice::from_raw_parts(data_out.pbData, data_out.cbData as usize).to_vec()
        };
        unsafe {
            windows::Win32::Foundation::LocalFree(HLOCAL(data_out.pbData as *mut core::ffi::c_void))
        };
        Some(blob)
    } else {
        None
    }
}

/// Run the one-time two-pass DPAPI migration.
/// - Plaintext rows → encrypt with DPAPI key → "dpapi:" prefix
/// - "enc:" rows → decrypt with legacy key → re-encrypt with DPAPI key → "dpapi:" prefix
/// - "dpapi:" rows → skip (already migrated)
/// - Corrupt "enc:" rows → leave as-is, log warning, continue
/// - Writes db_meta marker "encryption_version" = "dpapi_v1" on success
/// - Idempotent: if marker already exists, returns Ok(()) immediately
pub fn migrate_to_dpapi(conn: &Connection) -> Result<(), String> {
    migrate_to_dpapi_with_key(conn, &get_or_create_dpapi_key(conn))
}

fn migrate_to_dpapi_with_key(conn: &Connection, dpapi_key: &[u8; 32]) -> Result<(), String> {
    let already_migrated: bool = conn
        .query_row(
            "SELECT COUNT(*) FROM db_meta WHERE key='encryption_version' AND value='dpapi_v1'",
            [],
            |r| r.get::<_, i64>(0),
        )
        .map(|c| c > 0)
        .unwrap_or(false);

    if already_migrated {
        return Ok(());
    }

    #[derive(Debug)]
    struct RawRow {
        id: String,
        command_executed: String,
        stdout: String,
        stderr: String,
    }

    let rows: Vec<RawRow> = {
        let mut stmt = conn
            .prepare("SELECT id, command_executed, stdout, stderr FROM tweak_history")
            .map_err(|e| format!("Migration prepare failed: {}", e))?;

        let mapped = stmt.query_map([], |row| {
            Ok(RawRow {
                id: row.get(0)?,
                command_executed: row.get(1)?,
                stdout: row.get(2)?,
                stderr: row.get(3)?,
            })
        })
        .map_err(|e| format!("Migration query failed: {}", e))?;

        let collected: Vec<RawRow> = mapped
            .filter_map(|r| {
                r.map_err(|e| {
                    log::warn!("Migration: failed to read row: {}", e);
                })
                .ok()
            })
            .collect();
        collected
    };

    conn.execute("BEGIN TRANSACTION", [])
        .map_err(|e| format!("Migration BEGIN failed: {}", e))?;

    let result = (|| -> Result<(), String> {
        for row in &rows {
            if row.command_executed.starts_with("dpapi:")
                && row.stdout.starts_with("dpapi:")
                && row.stderr.starts_with("dpapi:")
            {
                continue;
            }

            let new_cmd = migrate_field(&row.command_executed, dpapi_key);
            let new_stdout = migrate_field(&row.stdout, dpapi_key);
            let new_stderr = migrate_field(&row.stderr, dpapi_key);

            conn.execute(
                "UPDATE tweak_history SET command_executed=?1, stdout=?2, stderr=?3 WHERE id=?4",
                params![new_cmd, new_stdout, new_stderr, row.id],
            )
            .map_err(|e| format!("Migration UPDATE failed for row '{}': {}", row.id, e))?;
        }

        conn.execute(
            "INSERT OR REPLACE INTO db_meta (key, value) VALUES ('encryption_version', 'dpapi_v1')",
            [],
        )
        .map_err(|e| format!("Migration: failed to write marker: {}", e))?;

        Ok(())
    })();

    match result {
        Ok(()) => {
            conn.execute("COMMIT", [])
                .map_err(|e| format!("Migration COMMIT failed: {}", e))?;
            Ok(())
        }
        Err(e) => {
            let _ = conn.execute("ROLLBACK", []);
            log::error!("DPAPI migration rolled back: {}", e);
            Err(e)
        }
    }
}

fn migrate_field(value: &str, dpapi_key: &[u8; 32]) -> String {
    if value.starts_with("dpapi:") {
        return value.to_string();
    }
    if value.starts_with("enc:") {
        let decrypted = decrypt_log_field(value);
        if decrypted == value {
            log::warn!("Migration: could not decrypt 'enc:' field — leaving corrupt row as-is");
            return value.to_string();
        }
        return encrypt_log_field_with_key(&decrypted, dpapi_key);
    }
    if value.is_empty() {
        return value.to_string();
    }
    encrypt_log_field_with_key(value, dpapi_key)
}

#[cfg(test)]
fn migrate_to_dpapi_test_mode(conn: &Connection) -> Result<(), String> {
    let test_key = [0xABu8; 32];
    migrate_to_dpapi_with_key(conn, &test_key)
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
    fn test_plaintext_row_gets_dpapi_prefix_after_migration() {
        let conn = open_test_db();
        conn.execute(
            "INSERT INTO tweak_history (id, tweak_id, tweak_name, action, timestamp, duration_ms,
             command_executed, stdout, stderr, exit_code, status)
             VALUES ('t1','tweak1','Test','APPLIED',1000,50,'reg add HKCU\\test','ok','',0,'SUCCESS')",
            [],
        )
        .unwrap();
        let result = migrate_to_dpapi_test_mode(&conn);
        assert!(result.is_ok(), "Migration should succeed: {:?}", result);
        let cmd: String = conn
            .query_row(
                "SELECT command_executed FROM tweak_history WHERE id='t1'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert!(
            cmd.starts_with("dpapi:"),
            "Plaintext row should have 'dpapi:' prefix, got: {}",
            cmd
        );
    }

    #[test]
    fn test_dpapi_row_skipped_in_migration() {
        let conn = open_test_db();
        conn.execute(
            "INSERT INTO tweak_history (id, tweak_id, tweak_name, action, timestamp, duration_ms,
             command_executed, stdout, stderr, exit_code, status)
             VALUES ('t3','tweak1','Test','APPLIED',1000,50,'dpapi:alreadymigrated','dpapi:x','dpapi:y',0,'SUCCESS')",
            [],
        )
        .unwrap();
        let result = migrate_to_dpapi_test_mode(&conn);
        assert!(result.is_ok());
        let cmd: String = conn
            .query_row(
                "SELECT command_executed FROM tweak_history WHERE id='t3'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(
            cmd, "dpapi:alreadymigrated",
            "Already-migrated row must not be modified"
        );
    }

    #[test]
    fn test_migration_writes_db_meta_marker() {
        let conn = open_test_db();
        let result = migrate_to_dpapi_test_mode(&conn);
        assert!(result.is_ok());
        let version: String = conn
            .query_row(
                "SELECT value FROM db_meta WHERE key='encryption_version'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(version, "dpapi_v1");
    }

    #[test]
    fn test_migration_not_re_run_if_marker_exists() {
        let conn = open_test_db();
        conn.execute(
            "INSERT INTO db_meta (key, value) VALUES ('encryption_version', 'dpapi_v1')",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO tweak_history (id, tweak_id, tweak_name, action, timestamp, duration_ms,
             command_executed, stdout, stderr, exit_code, status)
             VALUES ('t5','tweak1','Test','APPLIED',1000,50,'plaintext_cmd','','',0,'SUCCESS')",
            [],
        )
        .unwrap();
        let result = migrate_to_dpapi_test_mode(&conn);
        assert!(result.is_ok());
        let cmd: String = conn
            .query_row(
                "SELECT command_executed FROM tweak_history WHERE id='t5'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(
            cmd, "plaintext_cmd",
            "Migration must not run again once marker is set"
        );
    }
}
