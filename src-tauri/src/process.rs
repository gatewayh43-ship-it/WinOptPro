use serde::{Deserialize, Serialize};
use sysinfo::{ProcessRefreshKind, ProcessesToUpdate, System};
use tauri::command;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessItem {
    pub pid: u32,
    pub name: String,
    pub cpu_usage: f32,
    pub memory_bytes: u64,
    pub disk_read_bytes: u64,
    pub disk_written_bytes: u64,
    pub user: String,
}

#[command]
pub async fn get_processes() -> Result<Vec<ProcessItem>, String> {
    // We instantiate a new System each time or keep a global state lock.
    // Given Tauri's async nature, we'll create a new instance here to get delta CPU usage properly, 
    // we need to sleep briefly between refreshes.
    let mut sys = System::new_all();
    
    // First refresh to baseline CPU usage deltas
    sys.refresh_processes_specifics(
        ProcessesToUpdate::All,
        true,
        ProcessRefreshKind::nothing().with_cpu(),
    );
    
    // Sleep briefly to allow CPU time accumulation
    std::thread::sleep(std::time::Duration::from_millis(200));
    
    // Second refresh to calculate actual usage percentages
    sys.refresh_processes_specifics(
        ProcessesToUpdate::All,
        true,
        ProcessRefreshKind::everything(),
    );

    let mut items: Vec<ProcessItem> = sys
        .processes()
        .iter()
        .map(|(pid, process)| {
            ProcessItem {
                pid: pid.as_u32(),
                name: process.name().to_string_lossy().to_string(),
                cpu_usage: (process.cpu_usage() * 100.0).round() / 100.0,
                memory_bytes: process.memory(),
                disk_read_bytes: process.disk_usage().read_bytes,
                disk_written_bytes: process.disk_usage().written_bytes,
                user: process
                    .user_id()
                    .map(|id| id.to_string())
                    .unwrap_or_else(|| "System".to_string()),
            }
        })
        .collect();

    // Sort by memory usage descending by default for the initial API payload
    items.sort_by(|a, b| b.memory_bytes.cmp(&a.memory_bytes));

    Ok(items)
}

#[command]
pub async fn kill_process(pid: u32) -> Result<bool, String> {
    let mut sys = System::new_all();
    sys.refresh_processes(ProcessesToUpdate::All, true);

    let sys_pid = sysinfo::Pid::from_u32(pid);
    
    if let Some(process) = sys.process(sys_pid) {
        if process.kill() {
            return Ok(true);
        } else {
            return Err("Failed to send kill signal. Permission denied or process elevated.".to_string());
        }
    }

    Err("Process not found.".to_string())
}

#[command]
pub async fn set_process_priority(pid: u32, priority: String) -> Result<bool, String> {
    // Windows priority class mapping for PowerShell
    // RealTime, High, AboveNormal, Normal, BelowNormal, Idle
    
    // Validate input to prevent injection
    let valid_priorities = ["RealTime", "High", "AboveNormal", "Normal", "BelowNormal", "Idle"];
    if !valid_priorities.contains(&priority.as_str()) {
        return Err("Invalid priority level".to_string());
    }

    let script = format!("(Get-Process -Id {}).PriorityClass = '{}'", pid, priority);
    
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        
        let output = std::process::Command::new("powershell")
            .args(&["-NoProfile", "-Command", &script])
            .creation_flags(0x08000000) // CREATE_NO_WINDOW
            .output()
            .map_err(|e| format!("Failed to execute powershell: {}", e))?;

        if !output.status.success() {
            let err = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Access Denied: You may need Admin privileges. ({})", err.trim()));
        }

        return Ok(true);
    }
    
    #[cfg(not(target_os = "windows"))]
    Err("Not supported on this OS".to_string())
}

#[command]
pub async fn open_file_location(pid: u32) -> Result<bool, String> {
    let mut sys = System::new_all();
    sys.refresh_processes(ProcessesToUpdate::All, true);
    
    let sys_pid = sysinfo::Pid::from_u32(pid);
    
    if let Some(process) = sys.process(sys_pid) {
        if let Some(exe_path) = process.exe() {
            #[cfg(target_os = "windows")]
            {
                use std::os::windows::process::CommandExt;
                let _ = std::process::Command::new("explorer")
                    .arg("/select,")
                    .arg(exe_path)
                    .creation_flags(0x08000000)
                    .spawn();
                return Ok(true);
            }
        } else {
            return Err("Executable path not available (Admin privileges mapped needed).".to_string());
        }
    }

    Err("Process not found or path inaccessible.".to_string())
}
