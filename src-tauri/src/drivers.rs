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
        let single: DriverInfo = serde_json::from_str(&stdout)
            .map_err(|e| format!("Parse error: {} — raw: {}", e, &stdout[..stdout.len().min(300)]))?;
        return Ok(vec![single]);
    }
    serde_json::from_str::<Vec<DriverInfo>>(&stdout)
        .map_err(|e| format!("Parse error: {} — raw: {}", e, &stdout[..stdout.len().min(300)]))
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
