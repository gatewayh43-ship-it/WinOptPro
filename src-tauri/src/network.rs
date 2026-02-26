use serde::{Deserialize, Serialize};
use std::process::Command;
use sysinfo::Networks;
use tauri::command;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NetworkInterface {
    pub name: String,
    pub mac_address: String,
    pub received_bytes: u64,
    pub transmitted_bytes: u64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PingResult {
    pub host: String,
    pub latency_ms: Option<f32>,
    pub success: bool,
}

#[command]
pub async fn get_network_interfaces() -> Result<Vec<NetworkInterface>, String> {
    // Sysinfo networks
    // We instantiate heavily since Tauri commands are stateless by default unless we use state.
    // For bandwidth deltas we would need state, but for "total bytes" this is fine.
    let networks = Networks::new_with_refreshed_list();

    // Allow some time for delta to calculate if we wanted bytes/sec, but here we just return totals
    // std::thread::sleep(std::time::Duration::from_millis(200));
    // networks.refresh();

    let items: Vec<NetworkInterface> = networks
        .iter()
        .map(|(name, data)| NetworkInterface {
            name: name.to_string(),
            mac_address: data.mac_address().to_string(),
            received_bytes: data.total_received(),
            transmitted_bytes: data.total_transmitted(),
        })
        .collect();

    Ok(items)
}

#[command]
pub async fn ping_host(host: String) -> Result<PingResult, String> {
    // Sanitize input vaguely to prevent obvious command injection
    if host.contains('&') || host.contains('|') || host.contains('>') || host.contains('<') || host.contains(';') {
        return Err("Invalid characters in hostname.".to_string());
    }

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        
        // Run Windows ping
        // ping -n 1 <host>
        let output = Command::new("ping")
            .arg("-n")
            .arg("1")
            .arg("-w")
            .arg("2000") // 2 second timeout
            .arg(&host)
            .creation_flags(0x08000000) // CREATE_NO_WINDOW docs: https://docs.microsoft.com/en-us/windows/win32/procthread/process-creation-flags
            .output();

        match output {
            Ok(out) => {
                let stdout = String::from_utf8_lossy(&out.stdout);
                
                // Parse stdout for "time=XXms" or "time<1ms"
                // e.g. "Reply from 8.8.8.8: bytes=32 time=14ms TTL=117"
                let mut latency_ms: Option<f32> = None;
                let mut success = false;

                for line in stdout.lines() {
                    let lower_line = line.to_lowercase();
                    if lower_line.contains("ttl=") {
                        success = true;
                        
                        if let Some(time_idx) = lower_line.find("time=") {
                            let end_idx = lower_line[time_idx..].find("ms").unwrap_or(lower_line.len() - time_idx);
                            let time_str = &lower_line[time_idx + 5..time_idx + end_idx];
                            if let Ok(ms) = time_str.parse::<f32>() {
                                latency_ms = Some(ms);
                            }
                        } else if lower_line.contains("time<1ms") {
                            latency_ms = Some(0.5);
                        }
                    }
                }

                Ok(PingResult {
                    host,
                    latency_ms,
                    success,
                })
            }
            Err(e) => Err(format!("Failed to execute ping command: {}", e)),
        }
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        Err("Ping is currently only implemented for Windows.".to_string())
    }
}
