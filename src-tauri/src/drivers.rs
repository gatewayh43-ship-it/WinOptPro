use serde::{Deserialize, Serialize};
use std::os::windows::process::CommandExt;
use std::process::Command;

const CREATE_NO_WINDOW: u32 = 0x08000000;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DriverInfo {
    pub device_name: String,
    pub inf_name: String,
    pub provider: String,
    pub version: String,
    pub date: String,
    pub device_class: String,
    pub is_signed: bool,
}

#[tauri::command]
pub fn list_drivers() -> Result<Vec<DriverInfo>, String> {
    let script = r#"
$drivers = Get-WmiObject Win32_PnPSignedDriver -ErrorAction SilentlyContinue |
    Where-Object { $_.DeviceName -and $_.DriverVersion } |
    Sort-Object DeviceClass, DeviceName

$result = @()
foreach ($d in $drivers) {
    $date = ''
    if ($d.DriverDate) {
        try {
            $dt = [System.Management.ManagementDateTimeConverter]::ToDateTime($d.DriverDate)
            $date = $dt.ToString('yyyy-MM-dd')
        } catch { $date = '' }
    }
    $result += [pscustomobject]@{
        device_name  = [string]$d.DeviceName
        inf_name     = if ($d.InfName) { [string]$d.InfName } else { '' }
        provider     = if ($d.DriverProviderName) { [string]$d.DriverProviderName } else { '' }
        version      = [string]$d.DriverVersion
        date         = $date
        device_class = if ($d.DeviceClass) { [string]$d.DeviceClass } else { '' }
        is_signed    = [bool]$d.IsSigned
    }
}
if ($result.Count -eq 0) { '[]' } else { $result | ConvertTo-Json -Compress }
"#;
    let output = Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", script])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| format!("Failed to list drivers: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if stdout.is_empty() || stdout == "null" {
        return Ok(vec![]);
    }
    // Handle single object (PowerShell omits array wrapper for 1 item)
    if stdout.starts_with('{') {
        let single: DriverInfo = serde_json::from_str(&stdout).map_err(|e| {
            format!(
                "Parse error: {} — raw: {}",
                e,
                &stdout[..stdout.len().min(300)]
            )
        })?;
        return Ok(vec![single]);
    }
    serde_json::from_str::<Vec<DriverInfo>>(&stdout).map_err(|e| {
        format!(
            "Parse error: {} — raw: {}",
            e,
            &stdout[..stdout.len().min(300)]
        )
    })
}

#[tauri::command]
pub fn get_unsigned_drivers() -> Result<Vec<DriverInfo>, String> {
    let all = list_drivers()?;
    Ok(all.into_iter().filter(|d| !d.is_signed).collect())
}

#[tauri::command]
pub fn export_driver_list(path: String) -> Result<bool, String> {
    let drivers = list_drivers()?;
    let json = serde_json::to_string_pretty(&drivers)
        .map_err(|e| format!("Serialization error: {}", e))?;
    std::fs::write(&path, json).map_err(|e| format!("Failed to write file: {}", e))?;
    Ok(true)
}

#[tauri::command]
pub fn scan_driver_updates() -> Result<String, String> {
    let scan = Command::new("usoclient.exe")
        .arg("StartScan")
        .creation_flags(CREATE_NO_WINDOW)
        .output();

    match scan {
        Ok(_) => Ok("Windows Update driver scan started. Open Driver Updates to review available optional driver updates.".to_string()),
        Err(scan_error) => {
            let fallback = Command::new("cmd")
                .args(["/C", "start", "", "ms-settings:windowsupdate-action"])
                .creation_flags(CREATE_NO_WINDOW)
                .output()
                .map_err(|open_error| {
                    format!(
                        "Failed to start Windows Update scan ({}) and failed to open Windows Update ({})",
                        scan_error, open_error
                    )
                })?;
            if fallback.status.success() {
                Ok("Opened Windows Update. Use Check for updates to scan for driver updates.".to_string())
            } else {
                Err("Failed to open Windows Update.".to_string())
            }
        }
    }
}

#[tauri::command]
pub fn open_driver_updates_settings() -> Result<bool, String> {
    let output = Command::new("cmd")
        .args(["/C", "start", "", "ms-settings:windowsupdate-optionalupdates"])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| format!("Failed to open Windows optional driver updates: {}", e))?;

    if output.status.success() {
        Ok(true)
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        Err(if stderr.is_empty() {
            "Failed to open Windows optional driver updates.".to_string()
        } else {
            stderr
        })
    }
}
