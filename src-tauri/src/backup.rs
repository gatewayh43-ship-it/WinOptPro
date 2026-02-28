use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BackupData {
    pub version: String,
    pub created_at: String,
    pub applied_tweaks: Vec<String>,
    pub user_settings: serde_json::Value,
}

#[tauri::command]
pub fn export_backup(path: String, data: BackupData) -> Result<bool, String> {
    let json = serde_json::to_string_pretty(&data)
        .map_err(|e| format!("Serialization error: {}", e))?;
    std::fs::write(&path, json).map_err(|e| format!("Failed to write backup: {}", e))?;
    Ok(true)
}

#[tauri::command]
pub fn import_backup(path: String) -> Result<BackupData, String> {
    let content =
        std::fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))?;
    serde_json::from_str::<BackupData>(&content).map_err(|e| format!("Invalid backup file: {}", e))
}

#[tauri::command]
pub fn get_backup_info(path: String) -> Result<serde_json::Value, String> {
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
