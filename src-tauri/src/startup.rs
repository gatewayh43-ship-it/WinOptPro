use serde::{Deserialize, Serialize};
use std::env;
use std::fs;
use std::path::Path;
use winreg::enums::{HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE, KEY_READ};
use winreg::RegKey;
use wmi::{COMLibrary, WMIConnection};

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

    // User Startup Folder
    if let Ok(app_data) = env::var("APPDATA") {
        let startup_path = Path::new(&app_data).join(r"Microsoft\Windows\Start Menu\Programs\Startup");
        let hkcu_approved = hkcu.open_subkey_with_flags(STARTUP_APPROVED_FOLDER, KEY_READ).ok();
        items.extend(scan_startup_folder(&startup_path, "USER_STARTUP_FOLDER", &hkcu_approved));
    }

    // All Users Startup Folder
    if let Ok(program_data) = env::var("ProgramData") {
        let startup_path = Path::new(&program_data).join(r"Microsoft\Windows\Start Menu\Programs\Startup");
        let hklm_approved = hklm.open_subkey_with_flags(STARTUP_APPROVED_FOLDER, KEY_READ).ok();
        items.extend(scan_startup_folder(&startup_path, "ALL_USERS_STARTUP_FOLDER", &hklm_approved));
    }

    // Windows Services (Auto-start)
    if let Ok(com_con) = COMLibrary::new() {
        if let Ok(wmi_con) = WMIConnection::new(com_con.into()) {
            // We use a general query. WMI structs require exact matching usually, but we can deserialize to generic maps or custom structs.
            #[derive(Deserialize, Debug)]
            #[serde(rename_all = "PascalCase")]
            struct PdlService {
                name: String,
                display_name: String,
                path_name: Option<String>,
                #[allow(dead_code)]
                state: String,
            }

            let query = "SELECT Name, DisplayName, PathName, State FROM Win32_Service WHERE StartMode='Auto'";
            if let Ok(services) = wmi_con.raw_query::<PdlService>(query) {
                for svc in services {
                    // For safety, we only display services here, we won't allow simple toggling of critical system services via the identical registry UI
                    // A proper implementation would use `sc config` or `ChangeServiceConfigW`.
                    // For the scope of Phase 2, we display them as view-only (enabled: true always for now until we build a service manager)
                    items.push(StartupItem {
                        id: format!("SERVICE_{}", svc.name),
                        name: format!("{} (Service)", svc.display_name),
                        command: svc.path_name.unwrap_or_else(|| "Unknown".to_string()),
                        location: "Windows Services".to_string(),
                        enabled: true, // Auto-start means it's enabled for startup
                    });
                }
            }
        }
    }

    Ok(items)
}

fn scan_startup_folder(dir: &Path, prefix: &str, approved_key: &Option<RegKey>) -> Vec<StartupItem> {
    let mut folder_items = Vec::new();

    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|s| s.to_str()) == Some("lnk") {
                if let Some(file_name) = path.file_stem().and_then(|s| s.to_str()) {
                    let mut command_str = String::from("Unknown Command");
                    
                    if let Ok(shortcut) = lnk::ShellLink::open(&path) {
                        if let Some(link_info) = shortcut.link_info() {
                            if let Some(local_path) = link_info.local_base_path() {
                                command_str = local_path.to_string();
                            }
                        }
                    }

                    // For the Startup folder, the registry value in StartupApproved is precisely the filename with extension
                    let key_name = format!("{}.lnk", file_name);
                    let enabled = is_item_enabled(approved_key, &key_name).unwrap_or(true);

                    folder_items.push(StartupItem {
                        id: format!("{}_{}", prefix, file_name),
                        name: file_name.to_string(),
                        command: command_str,
                        location: dir.to_string_lossy().to_string(),
                        enabled,
                    });
                }
            }
        }
    }
    
    folder_items
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
    let (root, _is_hklm, name_or_file, is_folder) = if id.starts_with("HKCU_RUN_") {
        (RegKey::predef(HKEY_CURRENT_USER), false, id.trim_start_matches("HKCU_RUN_").to_string(), false)
    } else if id.starts_with("HKLM_RUN_") {
        (RegKey::predef(HKEY_LOCAL_MACHINE), true, id.trim_start_matches("HKLM_RUN_").to_string(), false)
    } else if id.starts_with("USER_STARTUP_FOLDER_") {
        (RegKey::predef(HKEY_CURRENT_USER), false, format!("{}.lnk", id.trim_start_matches("USER_STARTUP_FOLDER_")), true)
    } else if id.starts_with("ALL_USERS_STARTUP_FOLDER_") {
         (RegKey::predef(HKEY_LOCAL_MACHINE), true, format!("{}.lnk", id.trim_start_matches("ALL_USERS_STARTUP_FOLDER_")), true)
    } else {
        return Err("Unsupported startup item location".to_string());
    };

    let key_path = if is_folder { STARTUP_APPROVED_FOLDER } else { STARTUP_APPROVED_RUN };

    // We must create or open the StartupApproved key
    let (approved_key, _) = root.create_subkey(key_path)
        .map_err(|e| format!("Failed to open StartupApproved key: {}", e))?;

    // The binary structure is typically 12 bytes. 
    // Enabled = 02 00 00 00 00 00 00 00 00 00 00 00
    // Disabled = 03 00 00 00 (followed by timestamp, but zeros work to disable it temporarily)
    
    // We can read existing to preserve timestamp if it exists, otherwise write default.
    let mut bytes = vec![0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
    
    if let Ok(existing) = approved_key.get_raw_value(&name_or_file) {
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

    approved_key.set_raw_value(&name_or_file, &reg_value)
        .map_err(|e| format!("Failed to write registry value: {}", e))?;

    Ok(())
}
