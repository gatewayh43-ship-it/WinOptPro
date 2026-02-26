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
