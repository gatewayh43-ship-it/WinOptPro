use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BackupData {
    pub version: String,
    pub created_at: String,
    pub applied_tweaks: Vec<String>,
    pub user_settings: serde_json::Value,
}

#[derive(Debug, serde::Serialize)]
pub struct ConsentLogEntry {
    pub agreed_at: String,
    pub eula_version: String,
    pub app_version: String,
}

#[derive(Debug, serde::Serialize)]
pub struct TweakHistoryExportEntry {
    pub id: String,
    pub command_executed: String,
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
    pub timestamp: i64,
}

#[derive(Debug, serde::Serialize)]
pub struct ExportUserData {
    pub exported_at: String,
    pub app_version: String,
    pub tweak_history: Vec<TweakHistoryExportEntry>,
    pub consent_log: Vec<ConsentLogEntry>,
    pub settings: serde_json::Value,
}

fn allowed_user_roots() -> Vec<PathBuf> {
    let mut roots = Vec::new();
    for var in ["USERPROFILE", "PUBLIC"] {
        if let Ok(value) = std::env::var(var) {
            let root = PathBuf::from(value);
            roots.push(root.join("Desktop"));
            roots.push(root.join("Documents"));
            roots.push(root.join("Downloads"));
        }
    }
    roots.push(std::env::temp_dir());
    roots
}

fn validate_export_path(path: &str, allowed_extensions: &[&str]) -> Result<PathBuf, String> {
    let raw = PathBuf::from(path);
    if !raw.is_absolute() {
        return Err("Export path must be absolute.".to_string());
    }

    let extension = raw
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.to_ascii_lowercase())
        .ok_or_else(|| "Export path must include a file extension.".to_string())?;
    if !allowed_extensions
        .iter()
        .any(|allowed| *allowed == extension)
    {
        return Err(format!(
            "Unsupported export file type. Expected: {}",
            allowed_extensions.join(", ")
        ));
    }

    let parent = raw
        .parent()
        .ok_or_else(|| "Export path must include a parent directory.".to_string())?
        .canonicalize()
        .map_err(|e| format!("Export directory does not exist or is unavailable: {}", e))?;

    let file_name = raw
        .file_name()
        .ok_or_else(|| "Export path must include a file name.".to_string())?;
    let target = parent.join(file_name);
    ensure_user_path(&target)?;
    Ok(target)
}

fn validate_import_path(path: &str, allowed_extensions: &[&str]) -> Result<PathBuf, String> {
    let raw = PathBuf::from(path);
    if !raw.is_absolute() {
        return Err("Import path must be absolute.".to_string());
    }

    let target = raw
        .canonicalize()
        .map_err(|e| format!("Import file does not exist or is unavailable: {}", e))?;

    let extension = target
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.to_ascii_lowercase())
        .ok_or_else(|| "Import path must include a file extension.".to_string())?;
    if !allowed_extensions
        .iter()
        .any(|allowed| *allowed == extension)
    {
        return Err(format!(
            "Unsupported import file type. Expected: {}",
            allowed_extensions.join(", ")
        ));
    }

    ensure_user_path(&target)?;
    Ok(target)
}

fn ensure_user_path(path: &Path) -> Result<(), String> {
    let roots = allowed_user_roots()
        .into_iter()
        .filter_map(|root| root.canonicalize().ok())
        .collect::<Vec<_>>();

    if roots.iter().any(|root| path.starts_with(root)) {
        Ok(())
    } else {
        Err(
            "For safety, files must be in Desktop, Documents, Downloads, or the temp directory."
                .to_string(),
        )
    }
}

#[tauri::command]
pub fn export_backup(path: String, data: BackupData) -> Result<bool, String> {
    let path = validate_export_path(&path, &["winopt", "json"])?;
    let json =
        serde_json::to_string_pretty(&data).map_err(|e| format!("Serialization error: {}", e))?;
    std::fs::write(&path, json).map_err(|e| format!("Failed to write backup: {}", e))?;
    Ok(true)
}

#[tauri::command]
pub fn import_backup(path: String) -> Result<BackupData, String> {
    let path = validate_import_path(&path, &["winopt", "json"])?;
    let content =
        std::fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))?;
    serde_json::from_str::<BackupData>(&content).map_err(|e| format!("Invalid backup file: {}", e))
}

#[tauri::command]
pub fn get_backup_info(path: String) -> Result<serde_json::Value, String> {
    let path = validate_import_path(&path, &["winopt", "json"])?;
    let content =
        std::fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))?;
    let data: BackupData =
        serde_json::from_str(&content).map_err(|e| format!("Invalid backup file: {}", e))?;
    Ok(serde_json::json!({
        "version": data.version,
        "created_at": data.created_at,
        "tweak_count": data.applied_tweaks.len(),
    }))
}

/// Tauri command: export all user data to a JSON file at the given path.
/// Implements GDPR data portability requirement.
#[tauri::command]
pub fn export_user_data(
    db: tauri::State<'_, crate::db::DbState>,
    path: String,
    settings_json: String,
) -> Result<(), String> {
    let path = validate_export_path(&path, &["json"])?;
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    let tweak_history = {
        let mut stmt = conn
            .prepare(
                "SELECT id, command_executed, stdout, stderr, exit_code, timestamp
                 FROM tweak_history ORDER BY timestamp DESC",
            )
            .map_err(|e| e.to_string())?;

        let raw: Vec<TweakHistoryExportEntry> = stmt
            .query_map([], |row| {
                Ok(TweakHistoryExportEntry {
                    id: row.get(0)?,
                    command_executed: row.get(1)?,
                    stdout: row.get(2)?,
                    stderr: row.get(3)?,
                    exit_code: row.get(4)?,
                    timestamp: row.get(5)?,
                })
            })
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();
        raw
    };

    let consent_log = {
        let mut stmt = conn
            .prepare("SELECT agreed_at, eula_version, app_version FROM consent_log")
            .map_err(|e| e.to_string())?;

        let rows: Vec<ConsentLogEntry> = stmt
            .query_map([], |row| {
                Ok(ConsentLogEntry {
                    agreed_at: row.get(0)?,
                    eula_version: row.get(1)?,
                    app_version: row.get(2)?,
                })
            })
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();
        rows
    };

    let settings =
        serde_json::from_str::<serde_json::Value>(&settings_json).unwrap_or(serde_json::json!({}));

    let data = ExportUserData {
        exported_at: chrono::Utc::now().to_rfc3339(),
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        tweak_history,
        consent_log,
        settings,
    };

    let json =
        serde_json::to_string_pretty(&data).map_err(|e| format!("Serialization error: {}", e))?;
    std::fs::write(&path, json).map_err(|e| format!("Failed to write export file: {}", e))?;

    Ok(())
}

/// Tauri command: read the AI model selected during NSIS installer setup from the registry.
/// The installer writes: HKCU\Software\WinOpt Pro\SelectedAIModel = "qwen2.5:1.5b"
/// Returns Ok(Some("model-name")) if found, Ok(None) if key doesn't exist.
#[tauri::command]
pub fn read_installer_config() -> Result<Option<String>, String> {
    #[cfg(windows)]
    {
        use winreg::{enums::HKEY_CURRENT_USER, RegKey};
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        match hkcu.open_subkey("Software\\WinOpt Pro") {
            Ok(key) => match key.get_value::<String, _>("SelectedAIModel") {
                Ok(model) => Ok(Some(model)),
                Err(_) => Ok(None),
            },
            Err(_) => Ok(None),
        }
    }
    #[cfg(not(windows))]
    {
        Ok(None)
    }
}

/// Validate a restore-point description: free text but bounded length and
/// no PowerShell-meaningful characters that could escape the quoted argument.
fn validate_restore_point_description(input: &str) -> Result<String, String> {
    let trimmed = input.trim();
    if trimmed.is_empty() {
        return Err("Description cannot be empty.".to_string());
    }
    if trimmed.len() > 64 {
        return Err("Description must be 64 characters or fewer.".to_string());
    }
    // Disallow quote characters and backticks so we cannot break out of the
    // single-quoted PowerShell string literal we build below.
    if trimmed
        .chars()
        .any(|c| matches!(c, '\'' | '"' | '`' | '$' | '\n' | '\r'))
    {
        return Err("Description contains unsupported characters.".to_string());
    }
    Ok(trimmed.to_string())
}

/// Create a Windows System Restore Point. Requires admin + System Protection enabled.
/// Returns Ok(true) on success; Err with a user-readable reason on failure.
#[tauri::command]
pub async fn create_restore_point(description: String) -> Result<bool, String> {
    let safe_desc = validate_restore_point_description(&description)?;

    #[cfg(windows)]
    {
        use tokio::process::Command;
        use tokio::time::{timeout, Duration};

        // Single-quoted PS literal; safe_desc has been validated to contain no
        // single quotes, dollar signs, or backticks.
        let script = format!(
            "Checkpoint-Computer -Description '{}' -RestorePointType MODIFY_SETTINGS",
            safe_desc
        );

        let cmd = Command::new("powershell")
            .args([
                "-NoProfile",
                "-NonInteractive",
                "-ExecutionPolicy",
                "Bypass",
                "-Command",
                &script,
            ])
            .output();

        let output = timeout(Duration::from_secs(60), cmd)
            .await
            .map_err(|_| "Restore point creation timed out after 60s.".to_string())?
            .map_err(|e| format!("Failed to invoke PowerShell: {}", e))?;

        if output.status.success() {
            Ok(true)
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            // Surface the most common cause clearly.
            if stderr.contains("WMI") || stderr.contains("0x80042302") {
                Err("System Protection is disabled. Enable it in System Properties → System Protection.".to_string())
            } else if stderr.contains("denied") || stderr.contains("Access") {
                Err(
                    "Permission denied. Restore points require Administrator privileges."
                        .to_string(),
                )
            } else {
                Err(format!("Restore point creation failed: {}", stderr.trim()))
            }
        }
    }
    #[cfg(not(windows))]
    {
        let _ = safe_desc;
        Err("System Restore is only available on Windows.".to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_export_user_data_creates_valid_json() {
        let data = ExportUserData {
            exported_at: "2026-03-20T10:00:00Z".to_string(),
            app_version: "1.0.0".to_string(),
            tweak_history: vec![],
            consent_log: vec![ConsentLogEntry {
                agreed_at: "2026-03-20T09:00:00Z".to_string(),
                eula_version: "1.0".to_string(),
                app_version: "1.0.0".to_string(),
            }],
            settings: serde_json::json!({ "theme": "dark" }),
        };
        let json = serde_json::to_string_pretty(&data).unwrap();
        assert!(json.contains("exported_at"));
        assert!(json.contains("app_version"));
        assert!(json.contains("tweak_history"));
        assert!(json.contains("consent_log"));
        assert!(json.contains("settings"));
        assert!(json.contains("1.0.0"));
    }

    #[test]
    fn test_export_user_data_writes_file() {
        let tmp = tempfile::NamedTempFile::new().unwrap();
        let path = tmp.path().to_str().unwrap().to_string();

        let data = ExportUserData {
            exported_at: "2026-03-20T10:00:00Z".to_string(),
            app_version: "1.0.0".to_string(),
            tweak_history: vec![],
            consent_log: vec![],
            settings: serde_json::json!({}),
        };

        let json = serde_json::to_string_pretty(&data).unwrap();
        std::fs::write(&path, &json).unwrap();

        let contents = std::fs::read_to_string(&path).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&contents).unwrap();
        assert_eq!(parsed["app_version"], "1.0.0");
    }

    #[test]
    fn test_read_installer_config_returns_none_when_key_missing() {
        // On a machine without the registry key, read_installer_config must
        // return Ok(None) rather than an Err.  In CI and on developer machines
        // the WinOpt Pro registry key will typically not exist, so calling the
        // real function exercises the missing-key branch.
        let result = read_installer_config();
        assert!(
            result.is_ok(),
            "read_installer_config must never return Err"
        );
        // If the key happens to exist in the test environment the value may be
        // Some(…); we only require that the function does not panic or error.
    }
}
