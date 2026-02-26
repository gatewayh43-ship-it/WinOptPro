use serde::{Deserialize, Serialize};
use winreg::enums::{HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE, KEY_READ};
use winreg::RegKey;

#[derive(Debug, Serialize, Deserialize)]
pub struct StartupItem {
    pub id: String,
    pub name: String,
    pub command: String,
    pub location: String,
    pub enabled: bool,
}

const RUN_KEY: &str = r"Software\Microsoft\Windows\CurrentVersion\Run";
const STARTUP_APPROVED_RUN: &str = r"Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run";
const STARTUP_APPROVED_FOLDER: &str = r"Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\StartupFolder";

#[tauri::command]
pub async fn get_startup_items() -> Result<Vec<StartupItem>, String> {
    let mut items = Vec::new();

    // HKCU Run
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    if let Ok(run_key) = hkcu.open_subkey_with_flags(RUN_KEY, KEY_READ) {
        let approved_key = hkcu.open_subkey_with_flags(STARTUP_APPROVED_RUN, KEY_READ).ok();
        
        for name_res in run_key.enum_values() {
            if let Ok((name, _)) = name_res {
                if let Ok(command) = run_key.get_value::<String, _>(&name) {
                    let enabled = is_item_enabled(&approved_key, &name).unwrap_or(true);
                    items.push(StartupItem {
                        id: format!("HKCU_RUN_{}", name),
                        name: name.clone(),
                        command,
                        location: "HKCU\\...\\Run".to_string(),
                        enabled,
                    });
                }
            }
        }
    }

    // HKLM Run
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    if let Ok(run_key) = hklm.open_subkey_with_flags(RUN_KEY, KEY_READ) {
        let approved_key = hklm.open_subkey_with_flags(STARTUP_APPROVED_RUN, KEY_READ).ok();
        
        for name_res in run_key.enum_values() {
            if let Ok((name, _)) = name_res {
                if let Ok(command) = run_key.get_value::<String, _>(&name) {
                    let enabled = is_item_enabled(&approved_key, &name).unwrap_or(true);
                    items.push(StartupItem {
                        id: format!("HKLM_RUN_{}", name),
                        name: name.clone(),
                        command,
                        location: "HKLM\\...\\Run".to_string(),
                        enabled,
                    });
                }
            }
        }
    }

    Ok(items)
}

fn is_item_enabled(approved_key_opt: &Option<RegKey>, name: &str) -> Option<bool> {
    if let Some(key) = approved_key_opt {
        if let Ok(val) = key.get_raw_value(name) {
            if !val.bytes.is_empty() {
                // If the first byte is 0x02, it's enabled. 0x03 or others usually mean disabled.
                return Some(val.bytes[0] % 2 == 0);
            }
        }
    }
    None
}

#[tauri::command]
pub async fn set_startup_item_state(id: String, enabled: bool) -> Result<(), String> {
    // Determine target root and key based on ID prefix
    let (root, _is_hklm, name) = if id.starts_with("HKCU_RUN_") {
        (RegKey::predef(HKEY_CURRENT_USER), false, id.trim_start_matches("HKCU_RUN_"))
    } else if id.starts_with("HKLM_RUN_") {
        (RegKey::predef(HKEY_LOCAL_MACHINE), true, id.trim_start_matches("HKLM_RUN_"))
    } else {
        return Err("Unsupported startup item location".to_string());
    };

    let key_path = STARTUP_APPROVED_RUN;

    // We must create or open the StartupApproved key
    let (approved_key, _) = root.create_subkey(key_path)
        .map_err(|e| format!("Failed to open StartupApproved key: {}", e))?;

    // The binary structure is typically 12 bytes. 
    // Enabled = 02 00 00 00 00 00 00 00 00 00 00 00
    // Disabled = 03 00 00 00 (followed by timestamp, but zeros work to disable it temporarily)
    
    // We can read existing to preserve timestamp if it exists, otherwise write default.
    let mut bytes = vec![0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
    
    if let Ok(existing) = approved_key.get_raw_value(name) {
        if existing.bytes.len() >= 12 {
            bytes = existing.bytes;
        }
    }

    if enabled {
        bytes[0] = 0x02; // Enabled
    } else {
        bytes[0] = 0x03; // Disabled
    }

    let reg_value = winreg::RegValue {
        bytes,
        vtype: winreg::enums::REG_BINARY,
    };

    approved_key.set_raw_value(name, &reg_value)
        .map_err(|e| format!("Failed to write registry value: {}", e))?;

    Ok(())
}
