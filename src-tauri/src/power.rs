use serde::{Deserialize, Serialize};
use std::os::windows::process::CommandExt;
use std::process::Command;

#[derive(Debug, Serialize, Deserialize)]
pub struct PowerPlan {
    pub guid: String,
    pub name: String,
    pub is_active: bool,
}

const CREATE_NO_WINDOW: u32 = 0x08000000;

#[tauri::command]
pub fn get_power_plans() -> Result<Vec<PowerPlan>, String> {
    let output = Command::new("powercfg")
        .arg("/list")
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| format!("Failed to execute powercfg: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut plans = Vec::new();

    for line in stdout.lines() {
        if line.contains("Power Scheme GUID:") {
            // Line format: Power Scheme GUID: 381b4222-f694-41f0-9685-ff5bb260df2e  (Balanced) *
            let parts: Vec<&str> = line.split("  (").collect();
            if parts.len() < 2 { continue; }
            
            let guid_part = parts[0].replace("Power Scheme GUID: ", "").trim().to_string();
            
            let name_end_idx = parts[1].rfind(')').unwrap_or(parts[1].len());
            let name = parts[1][..name_end_idx].to_string();
            
            let is_active = line.ends_with('*');

            plans.push(PowerPlan {
                guid: guid_part,
                name,
                is_active,
            });
        }
    }

    Ok(plans)
}

#[tauri::command]
pub fn set_active_power_plan(guid: &str) -> Result<bool, String> {
    let output = Command::new("powercfg")
        .args(["/setactive", guid])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| format!("Failed to set power plan: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("powercfg failed: {}", stderr));
    }

    Ok(true)
}
