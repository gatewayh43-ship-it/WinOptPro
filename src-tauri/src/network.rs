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
    pub ip_v4: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PingResult {
    pub host: String,
    pub latency_ms: Option<f32>,
    pub max_ms: Option<f32>,
    pub min_ms: Option<f32>,
    pub jitter_ms: Option<f32>,
    pub packet_loss_pct: f32,
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

    // Fetch IP addresses simply via ipconfig
    let mut ip_map = std::collections::HashMap::new();
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        if let Ok(output) = Command::new("ipconfig")
            .creation_flags(0x08000000)
            .output() 
        {
            let stdout = String::from_utf8_lossy(&output.stdout);
            let mut current_adapter = String::new();
            for line in stdout.lines() {
                let line = line.trim();
                // "Ethernet adapter Ethernet:" or "Wireless LAN adapter Wi-Fi:"
                if line.ends_with(':') && !line.contains("IPv4") && !line.contains("IPv6") {
                    if let Some(pos) = line.rfind("adapter ") {
                        current_adapter = line[pos + 8..line.len() - 1].to_string();
                    }
                } else if line.starts_with("IPv4 Address") {
                    if let Some(pos) = line.find(": ") {
                        let ip = line[pos + 2..].to_string();
                        ip_map.insert(current_adapter.clone(), ip);
                    }
                }
            }
        }
    }

    let items: Vec<NetworkInterface> = networks
        .iter()
        .map(|(name, data)| NetworkInterface {
            name: name.to_string(),
            mac_address: data.mac_address().to_string(),
            received_bytes: data.total_received(),
            transmitted_bytes: data.total_transmitted(),
            ip_v4: ip_map.get(name).cloned().unwrap_or_else(|| "Not Connected".to_string()),
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
        // ping -n 10 <host>
        let output = Command::new("ping")
            .arg("-n")
            .arg("10")
            .arg("-w")
            .arg("1000") // 1 sec timeout per packet
            .arg(&host)
            .creation_flags(0x08000000) // CREATE_NO_WINDOW docs: https://docs.microsoft.com/en-us/windows/win32/procthread/process-creation-flags
            .output();

        match output {
            Ok(out) => {
                let stdout = String::from_utf8_lossy(&out.stdout);
                
                let mut latencies = Vec::new();
                let mut packet_loss_pct = 0.0;
                let mut success = false;

                for line in stdout.lines() {
                    let lower_line = line.to_lowercase();
                    
                    // Parse general packet loss
                    if lower_line.contains("lost =") || lower_line.contains("loss)") {
                        if let Some(start) = lower_line.find("(") {
                            if let Some(end) = lower_line[start..].find("%") {
                                let pct_str = &lower_line[start + 1..start + end];
                                if let Ok(pct) = pct_str.trim().parse::<f32>() {
                                    packet_loss_pct = pct;
                                }
                            }
                        }
                    }

                    // Parse individual replies
                    if lower_line.contains("ttl=") {
                        success = true;
                        if let Some(time_idx) = lower_line.find("time=") {
                            let end_idx = lower_line[time_idx..].find("ms").unwrap_or(lower_line.len() - time_idx);
                            let time_str = &lower_line[time_idx + 5..time_idx + end_idx];
                            if let Ok(ms) = time_str.trim().parse::<f32>() {
                                latencies.push(ms);
                            }
                        } else if lower_line.contains("time<1ms") {
                            latencies.push(0.5);
                        }
                    }
                }

                let mut min_ms: Option<f32> = None;
                let mut max_ms: Option<f32> = None;
                let mut avg_ms: Option<f32> = None;
                let mut jitter_ms: Option<f32> = None;

                if !latencies.is_empty() {
                    let min = latencies.iter().fold(f32::INFINITY, |a, &b| a.min(b));
                    let max = latencies.iter().fold(0.0_f32, |a, &b| a.max(b));
                    let avg = latencies.iter().sum::<f32>() / latencies.len() as f32;
                    
                    min_ms = Some(min);
                    max_ms = Some(max);
                    avg_ms = Some(avg);
                    
                    // Simple Jitter (Average of absolute differences between consecutive latencies)
                    if latencies.len() > 1 {
                        let mut sum_diffs = 0.0;
                        for i in 1..latencies.len() {
                            sum_diffs += (latencies[i] - latencies[i-1]).abs();
                        }
                        jitter_ms = Some(sum_diffs / (latencies.len() - 1) as f32);
                    } else {
                        jitter_ms = Some(0.0);
                    }
                }

                Ok(PingResult {
                    host,
                    latency_ms: avg_ms,
                    min_ms,
                    max_ms,
                    jitter_ms,
                    packet_loss_pct,
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
