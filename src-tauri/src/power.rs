use serde::{Deserialize, Serialize};
use std::os::windows::process::CommandExt;
use std::process::Command;

#[derive(Debug, Serialize, Deserialize)]
pub struct PowerPlan {
    pub guid: String,
    pub name: String,
    pub is_active: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BatteryHealth {
    pub has_battery: bool,
    pub charge_percent: u32,
    pub is_charging: bool,
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PowerSettings {
    pub cpu_min_ac: u32,
    pub cpu_max_ac: u32,
    pub display_timeout_ac: u32,
    pub sleep_timeout_ac: u32,
    pub cpu_min_dc: u32,
    pub cpu_max_dc: u32,
    pub display_timeout_dc: u32,
    pub sleep_timeout_dc: u32,
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

#[tauri::command]
pub fn get_battery_health() -> Result<BatteryHealth, String> {
    let script = r#"
$b = Get-WmiObject -Class Win32_Battery -ErrorAction SilentlyContinue
if ($null -ne $b) {
    $isCharging = $b.BatteryStatus -in @(2,3,6,7,8,9)
    $status = switch([int]$b.BatteryStatus) {
        1 { 'Discharging' }
        2 { 'AC Power (Plugged in)' }
        3 { 'Fully Charged' }
        4 { 'Low' }
        5 { 'Critical' }
        6 { 'Charging' }
        7 { 'Charging and High' }
        8 { 'Charging and Low' }
        9 { 'Charging and Critical' }
        default { 'Unknown' }
    }
    @{
        has_battery = $true
        charge_percent = [int]$b.EstimatedChargeRemaining
        is_charging = [bool]$isCharging
        status = $status
    } | ConvertTo-Json -Compress
} else {
    '{"has_battery":false,"charge_percent":0,"is_charging":false,"status":"No battery detected"}'
}
"#;
    let output = Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", script])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| format!("Failed to query battery: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    serde_json::from_str::<BatteryHealth>(&stdout)
        .map_err(|e| format!("Failed to parse battery data: {} — raw: {}", e, stdout))
}

#[tauri::command]
pub fn get_power_settings(guid: String) -> Result<PowerSettings, String> {
    let script = format!(r#"
$g = '{}'
$proc = '54533251-82be-4824-96c1-47b60b740d00'
$minP = '893dee8e-2bef-41e0-89c6-b55d0929964c'
$maxP = 'bc5038f7-23e0-4960-96da-33abaf5935ec'
$disp = '7516b95f-f776-4464-8c53-06167f40cc99'
$dispOff = '3c0bc021-c8a8-4e07-a973-6b14cbcb2b7e'
$slp = '238c9fa8-0aad-41ed-83f4-97be242c8f20'
$slpTO = '29f6c1db-86da-48c5-9fdb-f2b67b1f44da'
function Get-Val([string[]]$a) {{
    $out = & powercfg $a 2>$null
    if ($out) {{
        $m = [regex]::Match(($out -join ' '), '\d+\s*$')
        if ($m.Success) {{ [int]$m.Value }} else {{ 0 }}
    }} else {{ 0 }}
}}
@{{
    cpu_min_ac = Get-Val @('/getacvalueindex',$g,$proc,$minP)
    cpu_max_ac = Get-Val @('/getacvalueindex',$g,$proc,$maxP)
    display_timeout_ac = Get-Val @('/getacvalueindex',$g,$disp,$dispOff)
    sleep_timeout_ac = Get-Val @('/getacvalueindex',$g,$slp,$slpTO)
    cpu_min_dc = Get-Val @('/getdcvalueindex',$g,$proc,$minP)
    cpu_max_dc = Get-Val @('/getdcvalueindex',$g,$proc,$maxP)
    display_timeout_dc = Get-Val @('/getdcvalueindex',$g,$disp,$dispOff)
    sleep_timeout_dc = Get-Val @('/getdcvalueindex',$g,$slp,$slpTO)
}} | ConvertTo-Json -Compress
"#, guid);

    let output = Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", &script])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| format!("Failed to query power settings: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    serde_json::from_str::<PowerSettings>(&stdout)
        .map_err(|e| format!("Failed to parse power settings: {} — raw: {}", e, stdout))
}

#[tauri::command]
pub fn set_power_setting(
    guid: String,
    sub_guid: String,
    setting_guid: String,
    value: u32,
    is_dc: bool,
) -> Result<bool, String> {
    let idx_flag = if is_dc { "/setdcvalueindex" } else { "/setacvalueindex" };
    let output = Command::new("powercfg")
        .args([idx_flag, &guid, &sub_guid, &setting_guid, &value.to_string()])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| format!("Failed to set power setting: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("powercfg failed: {}", stderr));
    }
    // Re-apply the active plan so the change takes effect
    Command::new("powercfg")
        .args(["/setactive", &guid])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .ok();
    Ok(true)
}
