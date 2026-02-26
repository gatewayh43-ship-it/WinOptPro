use serde::Serialize;
use std::collections::HashMap;
use sysinfo::{Components, Disks, Networks, System};
use tauri::command;

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CpuInfo {
    pub model: String,
    pub usage_pct: f32,
    pub freq_ghz: f64,
    pub cores: usize,
    pub temp_c: Option<f32>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RamInfo {
    pub used_mb: u64,
    pub total_mb: u64,
    pub usage_pct: f32,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DriveInfo {
    pub free_gb: f64,
    pub total_gb: f64,
    pub name: String,
    pub mount_point: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct NetworkAdapterInfo {
    pub received_bytes: u64,
    pub transmitted_bytes: u64,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SystemInfo {
    pub uptime_seconds: u64,
    pub os_version: String,
    pub is_admin: bool,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SystemVitals {
    pub timestamp: i64,
    pub cpu: CpuInfo,
    pub ram: RamInfo,
    pub drives: HashMap<String, DriveInfo>,
    pub network: HashMap<String, NetworkAdapterInfo>,
    pub system: SystemInfo,
}

/// Collect real system vitals using the `sysinfo` crate.
/// This replaces the hardcoded values in the frontend.
#[command]
pub fn get_system_vitals() -> Result<SystemVitals, String> {
    let mut sys = System::new_all();
    // Refresh twice with a small delay for accurate CPU usage
    sys.refresh_cpu_all();
    std::thread::sleep(std::time::Duration::from_millis(200));
    sys.refresh_cpu_all();
    sys.refresh_memory();

    // CPU info
    let cpus = sys.cpus();
    let cpu_usage: f32 = if cpus.is_empty() {
        0.0
    } else {
        cpus.iter().map(|c| c.cpu_usage()).sum::<f32>() / cpus.len() as f32
    };
    let cpu_freq: f64 = if cpus.is_empty() {
        0.0
    } else {
        cpus.iter().map(|c| c.frequency() as f64).sum::<f64>() / cpus.len() as f64 / 1000.0
    };
    let cpu_model = cpus.first().map(|c| c.brand().to_string()).unwrap_or_default();

    // CPU temperature from components
    let components = Components::new_with_refreshed_list();
    let cpu_temp = components
        .iter()
        .find(|c| {
            let label = c.label().to_lowercase();
            label.contains("cpu") || label.contains("core") || label.contains("tctl")
        })
        .and_then(|c| c.temperature());

    // RAM info
    let total_mb = sys.total_memory() / (1024 * 1024);
    let used_mb = sys.used_memory() / (1024 * 1024);
    let ram_pct = if total_mb > 0 {
        (used_mb as f32 / total_mb as f32) * 100.0
    } else {
        0.0
    };

    // Disk info
    let disks = Disks::new_with_refreshed_list();
    let mut drive_map = HashMap::new();
    for disk in disks.iter() {
        let mount = disk.mount_point().to_string_lossy().to_string();
        let total = disk.total_space() as f64 / (1024.0 * 1024.0 * 1024.0);
        let free = disk.available_space() as f64 / (1024.0 * 1024.0 * 1024.0);
        let name = disk.name().to_string_lossy().to_string();
        // Use the mount point as the key (e.g. "C:")
        let key = if mount.len() >= 2 { mount[..2].to_string() } else { mount.clone() };
        drive_map.insert(
            key,
            DriveInfo {
                free_gb: (free * 10.0).round() / 10.0,
                total_gb: (total * 10.0).round() / 10.0,
                name,
                mount_point: mount,
            },
        );
    }

    // Network info
    let networks = Networks::new_with_refreshed_list();
    let mut net_map = HashMap::new();
    for (name, data) in networks.iter() {
        net_map.insert(
            name.clone(),
            NetworkAdapterInfo {
                received_bytes: data.total_received(),
                transmitted_bytes: data.total_transmitted(),
            },
        );
    }

    // System info
    let is_admin = crate::security::is_admin().unwrap_or(false);
    let os_version = System::long_os_version().unwrap_or_else(|| "Unknown".to_string());
    let uptime = System::uptime();

    let timestamp = chrono::Utc::now().timestamp_millis();

    Ok(SystemVitals {
        timestamp,
        cpu: CpuInfo {
            model: cpu_model,
            usage_pct: (cpu_usage * 10.0).round() / 10.0,
            freq_ghz: (cpu_freq * 100.0).round() / 100.0,
            cores: sys.physical_core_count().unwrap_or(cpus.len()),
            temp_c: cpu_temp,
        },
        ram: RamInfo {
            used_mb,
            total_mb,
            usage_pct: (ram_pct * 10.0).round() / 10.0,
        },
        drives: drive_map,
        network: net_map,
        system: SystemInfo {
            uptime_seconds: uptime,
            os_version,
            is_admin,
        },
    })
}
