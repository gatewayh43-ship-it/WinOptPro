use serde::{Deserialize, Serialize};
use std::os::windows::process::CommandExt;
use std::process::Command;

const CREATE_NO_WINDOW: u32 = 0x08000000;
const TASK_ROOT: &str = "\\WinOpt\\";

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MaintenanceTask {
    pub id: String,
    pub name: String,
    pub schedule: String,
    pub last_run: String,
    pub next_run: String,
    pub enabled: bool,
}

fn run_cmd(args: &[&str]) -> std::io::Result<std::process::Output> {
    Command::new("schtasks")
        .args(args)
        .creation_flags(CREATE_NO_WINDOW)
        .output()
}

fn run_ps(cmd: &str) -> String {
    Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", cmd])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .unwrap_or_default()
}

#[tauri::command]
pub fn list_maintenance_tasks() -> Result<Vec<MaintenanceTask>, String> {
    let script = r#"
$tasks = Get-ScheduledTask -TaskPath '\WinOpt\' -ErrorAction SilentlyContinue
if (-not $tasks) { '[]'; return }
$result = @()
foreach ($t in $tasks) {
    $info = $t | Get-ScheduledTaskInfo -ErrorAction SilentlyContinue
    $trigger = $t.Triggers | Select-Object -First 1
    $schedule = if ($trigger) { $trigger.CimClass.CimClassName -replace 'MSFT_Task', '' } else { 'Unknown' }
    $result += [pscustomobject]@{
        id       = $t.TaskName
        name     = $t.TaskName
        schedule = $schedule
        last_run = if ($info.LastRunTime) { $info.LastRunTime.ToString('yyyy-MM-dd HH:mm') } else { 'Never' }
        next_run = if ($info.NextRunTime) { $info.NextRunTime.ToString('yyyy-MM-dd HH:mm') } else { 'N/A' }
        enabled  = ($t.State -ne 'Disabled')
    }
}
if ($result.Count -eq 0) { '[]' } else { $result | ConvertTo-Json -Compress }
"#;
    let out = run_ps(script);
    if out.is_empty() || out == "null" {
        return Ok(vec![]);
    }
    if out.starts_with('{') {
        let single: MaintenanceTask = serde_json::from_str(&out)
            .map_err(|e| format!("Parse error: {}", e))?;
        return Ok(vec![single]);
    }
    serde_json::from_str::<Vec<MaintenanceTask>>(&out)
        .map_err(|e| format!("Parse error: {} — raw: {}", e, &out[..out.len().min(300)]))
}

#[tauri::command]
pub fn create_maintenance_task(
    name: String,
    schedule: String,
    action_cmd: String,
) -> Result<bool, String> {
    let task_path = format!("{}\\{}", TASK_ROOT.trim_end_matches('\\'), name);
    // Delete existing task with same name first (ignore errors)
    run_cmd(&["/Delete", "/TN", &task_path, "/F"]).ok();

    let ps_action = format!(
        "powershell.exe -NoProfile -NonInteractive -WindowStyle Hidden -Command \"{}\"",
        action_cmd
    );

    let sc_flag = match schedule.as_str() {
        "WEEKLY" => "WEEKLY",
        "MONTHLY" => "MONTHLY",
        "DAILY" => "DAILY",
        _ => "WEEKLY",
    };

    let output = run_cmd(&[
        "/Create",
        "/TN", &task_path,
        "/TR", &ps_action,
        "/SC", sc_flag,
        "/ST", "03:00",
        "/RL", "HIGHEST",
        "/F",
    ])
    .map_err(|e| format!("Failed to create task: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("schtasks failed: {}", stderr));
    }
    Ok(true)
}

#[tauri::command]
pub fn delete_maintenance_task(name: String) -> Result<bool, String> {
    let task_path = format!("{}\\{}", TASK_ROOT.trim_end_matches('\\'), name);
    let output = run_cmd(&["/Delete", "/TN", &task_path, "/F"])
        .map_err(|e| format!("Failed to delete task: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("schtasks delete failed: {}", stderr));
    }
    Ok(true)
}

#[tauri::command]
pub fn run_maintenance_task_now(name: String) -> Result<bool, String> {
    let task_path = format!("{}\\{}", TASK_ROOT.trim_end_matches('\\'), name);
    let output = run_cmd(&["/Run", "/TN", &task_path])
        .map_err(|e| format!("Failed to run task: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("schtasks run failed: {}", stderr));
    }
    Ok(true)
}
