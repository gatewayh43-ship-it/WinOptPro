use serde::{Deserialize, Serialize};
use serde_json::Value;
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

#[derive(Debug, Serialize, Deserialize, Clone)]
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

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AdapterAdvancedProperty {
    pub display_name: String,
    pub display_value: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct NetworkOptimizerAdapter {
    pub name: String,
    pub description: String,
    pub status: String,
    pub link_speed: String,
    pub mac_address: String,
    pub if_index: u32,
    pub media_type: String,
    pub physical_media_type: String,
    pub ipv4: String,
    pub mtu: Option<u32>,
    pub metric: Option<u32>,
    pub dhcp: String,
    pub dns_servers: Vec<String>,
    pub rss_enabled: Option<bool>,
    pub received_bytes: u64,
    pub transmitted_bytes: u64,
    pub advanced_properties: Vec<AdapterAdvancedProperty>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WifiDiagnostics {
    pub ssid: String,
    pub bssid: String,
    pub radio_type: String,
    pub authentication: String,
    pub cipher: String,
    pub channel: Option<u32>,
    pub signal_pct: Option<u32>,
    pub receive_rate_mbps: Option<f32>,
    pub transmit_rate_mbps: Option<f32>,
    pub profile: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TcpDiagnostics {
    pub active_setting: String,
    pub auto_tuning_level: String,
    pub congestion_provider: String,
    pub ecn_capability: String,
    pub scaling_heuristics: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct OffloadDiagnostics {
    pub receive_segment_coalescing: String,
    pub receive_side_scaling: String,
    pub chimney: String,
    pub task_offload: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RouteDiagnostics {
    pub interface_alias: String,
    pub interface_index: u32,
    pub next_hop: String,
    pub route_metric: u32,
    pub interface_metric: u32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DnsBenchmark {
    pub provider: String,
    pub primary: String,
    pub secondary: String,
    pub latency_ms: Option<f32>,
    pub success: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct NetworkProcessUsage {
    pub process_id: u32,
    pub process_name: String,
    pub connection_count: u32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct NetworkActionSpec {
    pub action_id: String,
    pub label: String,
    pub requires_admin: bool,
    pub reversible: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct NetworkRecommendation {
    pub id: String,
    pub title: String,
    pub summary: String,
    pub evidence: String,
    pub risk: String,
    pub category: String,
    pub impact: String,
    pub action: Option<NetworkActionSpec>,
    pub applies_to_profiles: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct NetworkOptimizationProfile {
    pub id: String,
    pub name: String,
    pub description: String,
    pub recommendation_ids: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct NetworkOptimizerReport {
    pub generated_at: String,
    pub adapters: Vec<NetworkOptimizerAdapter>,
    pub wifi: Option<WifiDiagnostics>,
    pub tcp: TcpDiagnostics,
    pub offload: OffloadDiagnostics,
    pub routes: Vec<RouteDiagnostics>,
    pub probes: Vec<PingResult>,
    pub dns_benchmarks: Vec<DnsBenchmark>,
    pub active_talkers: Vec<NetworkProcessUsage>,
    pub recommendations: Vec<NetworkRecommendation>,
    pub profiles: Vec<NetworkOptimizationProfile>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NetworkOptimizerApplyRequest {
    pub action_id: String,
    pub adapter_name: Option<String>,
    pub custom_primary_dns: Option<String>,
    pub custom_secondary_dns: Option<String>,
    pub executable_path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NetworkOptimizerApplyResult {
    pub success: bool,
    pub title: String,
    pub message: String,
    pub stdout: String,
    pub revert_action_id: Option<String>,
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
        if let Ok(output) = Command::new("ipconfig").creation_flags(0x08000000).output() {
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
            ip_v4: ip_map
                .get(name)
                .cloned()
                .unwrap_or_else(|| "Not Connected".to_string()),
        })
        .collect();

    Ok(items)
}

#[cfg(target_os = "windows")]
fn hidden_command(program: &str) -> Command {
    use std::os::windows::process::CommandExt;
    let mut command = Command::new(program);
    command.creation_flags(0x08000000);
    command
}

#[cfg(not(target_os = "windows"))]
fn hidden_command(program: &str) -> Command {
    Command::new(program)
}

#[cfg(target_os = "windows")]
fn run_powershell(script: &str) -> Result<String, String> {
    let output = hidden_command("powershell")
        .arg("-NoProfile")
        .arg("-ExecutionPolicy")
        .arg("Bypass")
        .arg("-Command")
        .arg(script)
        .output()
        .map_err(|e| format!("Failed to run PowerShell: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();

    if !output.status.success() {
        return Err(if stderr.is_empty() {
            format!("PowerShell exited with status {}", output.status)
        } else {
            stderr
        });
    }

    Ok(stdout)
}

#[cfg(not(target_os = "windows"))]
fn run_powershell(_script: &str) -> Result<String, String> {
    Err("Network Optimizer is currently implemented for Windows only.".to_string())
}

fn ps_json(script: &str) -> Value {
    let wrapped = format!("{} | ConvertTo-Json -Depth 6 -Compress", script);
    run_powershell(&wrapped)
        .ok()
        .and_then(|stdout| serde_json::from_str::<Value>(&stdout).ok())
        .unwrap_or(Value::Null)
}

fn as_array(value: &Value) -> Vec<Value> {
    match value {
        Value::Array(items) => items.clone(),
        Value::Object(_) => vec![value.clone()],
        _ => vec![],
    }
}

fn value_string(value: &Value, key: &str) -> String {
    value
        .get(key)
        .and_then(|v| {
            if let Some(s) = v.as_str() {
                Some(s.to_string())
            } else if v.is_null() {
                None
            } else {
                Some(v.to_string().trim_matches('"').to_string())
            }
        })
        .unwrap_or_default()
}

fn value_u32(value: &Value, key: &str) -> Option<u32> {
    value
        .get(key)
        .and_then(|v| v.as_u64().or_else(|| v.as_str()?.parse::<u64>().ok()))
        .and_then(|n| u32::try_from(n).ok())
}

fn string_list(value: &Value, key: &str) -> Vec<String> {
    match value.get(key) {
        Some(Value::Array(items)) => items
            .iter()
            .filter_map(|v| v.as_str().map(str::to_string))
            .collect(),
        Some(Value::String(item)) if !item.is_empty() => vec![item.to_string()],
        _ => vec![],
    }
}

fn parse_wifi_diagnostics() -> Option<WifiDiagnostics> {
    #[cfg(not(target_os = "windows"))]
    {
        return None;
    }

    #[cfg(target_os = "windows")]
    {
        let output = hidden_command("netsh")
            .args(["wlan", "show", "interfaces"])
            .output()
            .ok()?;
        if !output.status.success() {
            return None;
        }
        let stdout = String::from_utf8_lossy(&output.stdout);
        let mut map = std::collections::HashMap::<String, String>::new();
        for line in stdout.lines() {
            let trimmed = line.trim();
            if let Some((key, value)) = trimmed.split_once(':') {
                map.insert(key.trim().to_lowercase(), value.trim().to_string());
            }
        }

        let ssid = map.get("ssid").cloned().unwrap_or_default();
        if ssid.is_empty() {
            return None;
        }

        Some(WifiDiagnostics {
            ssid,
            bssid: map.get("bssid").cloned().unwrap_or_default(),
            radio_type: map.get("radio type").cloned().unwrap_or_default(),
            authentication: map.get("authentication").cloned().unwrap_or_default(),
            cipher: map.get("cipher").cloned().unwrap_or_default(),
            channel: map.get("channel").and_then(|v| v.parse::<u32>().ok()),
            signal_pct: map
                .get("signal")
                .and_then(|v| v.trim_end_matches('%').parse::<u32>().ok()),
            receive_rate_mbps: map
                .get("receive rate (mbps)")
                .and_then(|v| v.parse::<f32>().ok()),
            transmit_rate_mbps: map
                .get("transmit rate (mbps)")
                .and_then(|v| v.parse::<f32>().ok()),
            profile: map.get("profile").cloned().unwrap_or_default(),
        })
    }
}

fn default_profiles() -> Vec<NetworkOptimizationProfile> {
    vec![
        NetworkOptimizationProfile {
            id: "gaming_latency".to_string(),
            name: "Gaming Low Latency".to_string(),
            description: "Reduce jitter, packet loss, route mistakes, and background contention before launching games.".to_string(),
            recommendation_ids: vec![],
        },
        NetworkOptimizationProfile {
            id: "streaming_stability".to_string(),
            name: "Streaming Stability".to_string(),
            description: "Prioritize steady DNS, Wi-Fi health, and upload contention checks for calls and streaming.".to_string(),
            recommendation_ids: vec![],
        },
        NetworkOptimizationProfile {
            id: "download_throughput".to_string(),
            name: "Download Throughput".to_string(),
            description: "Favor wired routes, RSS, sane TCP auto-tuning, and adapter health for large transfers.".to_string(),
            recommendation_ids: vec![],
        },
        NetworkOptimizationProfile {
            id: "privacy_dns".to_string(),
            name: "Privacy DNS Baseline".to_string(),
            description: "Review resolver configuration and make DNS choices explicit per adapter.".to_string(),
            recommendation_ids: vec![],
        },
    ]
}

fn rec(
    id: &str,
    title: &str,
    summary: &str,
    evidence: &str,
    risk: &str,
    category: &str,
    impact: &str,
    action: Option<NetworkActionSpec>,
    profiles: &[&str],
) -> NetworkRecommendation {
    NetworkRecommendation {
        id: id.to_string(),
        title: title.to_string(),
        summary: summary.to_string(),
        evidence: evidence.to_string(),
        risk: risk.to_string(),
        category: category.to_string(),
        impact: impact.to_string(),
        action,
        applies_to_profiles: profiles.iter().map(|s| s.to_string()).collect(),
    }
}

fn action(action_id: &str, label: &str, requires_admin: bool, reversible: bool) -> NetworkActionSpec {
    NetworkActionSpec {
        action_id: action_id.to_string(),
        label: label.to_string(),
        requires_admin,
        reversible,
    }
}

fn build_recommendations(
    adapters: &[NetworkOptimizerAdapter],
    wifi: &Option<WifiDiagnostics>,
    tcp: &TcpDiagnostics,
    offload: &OffloadDiagnostics,
    probes: &[PingResult],
    dns_benchmarks: &[DnsBenchmark],
    active_talkers: &[NetworkProcessUsage],
) -> Vec<NetworkRecommendation> {
    let mut recommendations = Vec::new();

    let connected: Vec<_> = adapters
        .iter()
        .filter(|a| a.status.eq_ignore_ascii_case("up") && a.ipv4 != "Not Connected")
        .collect();
    let ethernet = connected.iter().find(|a| {
        let text = format!("{} {} {}", a.name, a.media_type, a.physical_media_type).to_lowercase();
        text.contains("ethernet") || text.contains("802.3")
    });
    let wifi_adapter = connected.iter().find(|a| {
        let text = format!("{} {} {}", a.name, a.media_type, a.physical_media_type).to_lowercase();
        text.contains("wi-fi") || text.contains("wireless") || text.contains("802.11")
    });

    if connected.is_empty() {
        recommendations.push(rec(
            "connect_adapter",
            "No active network adapter detected",
            "The optimizer cannot tune latency or throughput until Windows reports an active interface.",
            "No adapter was both Up and assigned an IPv4 address.",
            "SAFE",
            "Adapter",
            "Restores the baseline required for every network profile.",
            None,
            &["gaming_latency", "streaming_stability", "download_throughput"],
        ));
        return recommendations;
    }

    if let (Some(eth), Some(wifi_ad)) = (ethernet, wifi_adapter) {
        let eth_metric = eth.metric.unwrap_or(u32::MAX);
        let wifi_metric = wifi_ad.metric.unwrap_or(u32::MAX);
        if wifi_metric <= eth_metric {
            recommendations.push(rec(
                "prefer_wired_route",
                "Prefer wired route when Ethernet is active",
                "Ethernet normally gives lower jitter and fewer retransmits than Wi-Fi. Windows is currently allowed to prefer Wi-Fi first or tie it.",
                &format!(
                    "Ethernet metric: {}, Wi-Fi metric: {}.",
                    eth_metric, wifi_metric
                ),
                "SAFE",
                "Routing",
                "Lower ping variance when both wired and wireless adapters are connected.",
                Some(action("prefer_ethernet", "Prefer Ethernet metrics", true, true)),
                &["gaming_latency", "download_throughput"],
            ));
        }
    }

    if let Some(wifi_state) = wifi {
        if let Some(signal) = wifi_state.signal_pct {
            if signal < 65 {
                recommendations.push(rec(
                    "wifi_signal_low",
                    "Wi-Fi signal is limiting latency",
                    "Low signal quality increases retransmits, roaming events, and ping spikes. Software can report this, but the durable fix is band/channel/AP placement.",
                    &format!(
                        "SSID {} signal is {}% on channel {}.",
                        wifi_state.ssid,
                        signal,
                        wifi_state.channel.map(|v| v.to_string()).unwrap_or_else(|| "unknown".to_string())
                    ),
                    "SAFE",
                    "Wi-Fi",
                    "Better Wi-Fi placement or band selection will beat registry tweaks for ping stability.",
                    None,
                    &["gaming_latency", "streaming_stability"],
                ));
            }
        }

        let radio = wifi_state.radio_type.to_lowercase();
        if radio.contains("802.11n") || radio.contains("802.11g") {
            recommendations.push(rec(
                "wifi_legacy_radio",
                "Legacy Wi-Fi radio mode detected",
                "Older Wi-Fi modes have weaker airtime efficiency and higher latency under contention.",
                &format!("Radio type: {}.", wifi_state.radio_type),
                "SAFE",
                "Wi-Fi",
                "Use a 5 GHz/6 GHz 802.11ac/ax network where signal is strong.",
                None,
                &["gaming_latency", "streaming_stability", "download_throughput"],
            ));
        }
    }

    if tcp.auto_tuning_level.to_lowercase().contains("disabled")
        || tcp.auto_tuning_level.to_lowercase().contains("highlyrestricted")
    {
        recommendations.push(rec(
            "tcp_autotuning_not_normal",
            "Restore TCP auto-tuning",
            "Modern Windows dynamically sizes TCP receive windows. Disabled or highly restricted auto-tuning can cap throughput on fast or long-latency links.",
            &format!("AutoTuningLevelLocal is {}.", tcp.auto_tuning_level),
            "SAFE",
            "TCP",
            "Improves download throughput without forcing legacy registry hacks.",
            Some(action("reset_tcp_normal", "Reset TCP global defaults", true, true)),
            &["download_throughput"],
        ));
    }

    if offload.receive_side_scaling.to_lowercase().contains("disabled") {
        recommendations.push(rec(
            "rss_disabled",
            "Enable Receive Side Scaling",
            "RSS spreads receive processing across CPU cores. Without it, a busy adapter can bottleneck on one core.",
            &format!("ReceiveSideScaling is {}.", offload.receive_side_scaling),
            "SAFE",
            "Adapter",
            "Improves sustained throughput and latency under load on multi-core systems.",
            Some(action("enable_rss", "Enable RSS", true, true)),
            &["download_throughput", "gaming_latency"],
        ));
    }

    let lossy = probes.iter().find(|p| p.packet_loss_pct > 0.0);
    if let Some(probe) = lossy {
        recommendations.push(rec(
            "packet_loss_detected",
            "Packet loss detected",
            "Packet loss has a bigger impact than raw ping. Fix link quality, cabling, Wi-Fi signal, or router congestion before applying TCP tweaks.",
            &format!("{} reported {}% packet loss.", probe.host, probe.packet_loss_pct),
            "SAFE",
            "Latency",
            "Reduces game rubber-banding, call dropouts, and retransmit stalls.",
            None,
            &["gaming_latency", "streaming_stability"],
        ));
    }

    let high_jitter = probes
        .iter()
        .filter_map(|p| p.jitter_ms.map(|j| (p, j)))
        .find(|(_, jitter)| *jitter > 20.0);
    if let Some((probe, jitter)) = high_jitter {
        recommendations.push(rec(
            "jitter_under_idle",
            "Jitter is already high at idle",
            "High idle jitter suggests Wi-Fi contention, ISP instability, VPN overhead, or local background traffic. Run a loaded test to confirm bufferbloat.",
            &format!("{} jitter: {:.1} ms.", probe.host, jitter),
            "SAFE",
            "Latency",
            "Prioritizes stability over chasing a lower average ping number.",
            None,
            &["gaming_latency", "streaming_stability"],
        ));
    }

    if active_talkers.iter().any(|p| {
        let n = p.process_name.to_lowercase();
        n.contains("deliveryoptimization")
            || n.contains("onedrive")
            || n.contains("steam")
            || n.contains("epic")
            || n.contains("battle.net")
            || n.contains("update")
    }) {
        recommendations.push(rec(
            "background_network_contention",
            "Background traffic may be competing with latency-sensitive apps",
            "Launchers, cloud sync, and update services can create upload queueing and bufferbloat while games or calls are active.",
            "Active network processes include likely updater, launcher, or sync traffic.",
            "SAFE",
            "Contention",
            "Reduces ping spikes during gaming, calls, and streaming.",
            Some(action(
                "disable_delivery_optimization_peer",
                "Limit Delivery Optimization peer sharing",
                true,
                true,
            )),
            &["gaming_latency", "streaming_stability"],
        ));
    }

    if !dns_benchmarks.is_empty() {
        let best = dns_benchmarks
            .iter()
            .filter(|d| d.success)
            .filter_map(|d| d.latency_ms.map(|lat| (d, lat)))
            .min_by(|a, b| a.1.partial_cmp(&b.1).unwrap_or(std::cmp::Ordering::Equal));
        if let Some((best_dns, latency)) = best {
            recommendations.push(rec(
                "dns_explicit_resolver",
                "Use an explicit fast DNS resolver where appropriate",
                "DNS changes improve lookup time and reliability, not in-session game ping. Apply per adapter only when it beats the current resolver and matches your privacy goals.",
                &format!("Fastest sampled resolver: {} at {:.1} ms.", best_dns.provider, latency),
                "SAFE",
                "DNS",
                "Improves browsing/app startup resolution and makes DNS behavior explicit.",
                Some(action("set_dns_cloudflare", "Set Cloudflare DNS", true, true)),
                &["privacy_dns", "streaming_stability"],
            ));
        }
    }

    recommendations.push(rec(
        "bufferbloat_loaded_test",
        "Run a loaded latency test before deep tuning",
        "Idle ping does not reveal upload/download queueing. Bufferbloat is usually fixed on the router with SQM/CAKE/fq_codel; Windows can only reduce local background contention.",
        "Loaded latency test is recommended for every network profile.",
        "SAFE",
        "Latency",
        "Separates real queueing problems from cosmetic TCP tweaks.",
        None,
        &["gaming_latency", "streaming_stability", "download_throughput"],
    ));

    recommendations
}

#[command]
pub async fn scan_network_optimizer() -> Result<NetworkOptimizerReport, String> {
    #[cfg(not(target_os = "windows"))]
    {
        return Err("Network Optimizer is currently implemented for Windows only.".to_string());
    }

    #[cfg(target_os = "windows")]
    {
        let base_interfaces = get_network_interfaces().await.unwrap_or_default();
        let interface_map: std::collections::HashMap<String, NetworkInterface> = base_interfaces
            .into_iter()
            .map(|iface| (iface.name.clone(), iface))
            .collect();

        let adapter_json = ps_json(
            "Get-NetAdapter | Select-Object Name,InterfaceDescription,Status,LinkSpeed,MacAddress,ifIndex,MediaType,PhysicalMediaType"
        );
        let ip_json = ps_json(
            "Get-NetIPInterface -AddressFamily IPv4 | Select-Object InterfaceAlias,InterfaceIndex,Dhcp,NlMtu,InterfaceMetric,ConnectionState"
        );
        let dns_json = ps_json(
            "Get-DnsClientServerAddress -AddressFamily IPv4 | Select-Object InterfaceAlias,ServerAddresses"
        );
        let rss_json = ps_json("Get-NetAdapterRss | Select-Object Name,Enabled");
        let advanced_json = ps_json(
            "Get-NetAdapterAdvancedProperty | Where-Object {$_.DisplayName -match 'Interrupt|RSS|Receive|Transmit|Checksum|Large Send|Flow Control|Energy|Power|Roaming|Preferred Band|Channel Width'} | Select-Object Name,DisplayName,DisplayValue"
        );

        let ip_items = as_array(&ip_json);
        let dns_items = as_array(&dns_json);
        let rss_items = as_array(&rss_json);
        let advanced_items = as_array(&advanced_json);

        let mut adapters = Vec::new();
        for adapter in as_array(&adapter_json) {
            let name = value_string(&adapter, "Name");
            if name.is_empty() {
                continue;
            }
            let matching_ip = ip_items
                .iter()
                .find(|item| value_string(item, "InterfaceAlias").eq_ignore_ascii_case(&name));
            let matching_dns = dns_items
                .iter()
                .find(|item| value_string(item, "InterfaceAlias").eq_ignore_ascii_case(&name));
            let matching_rss = rss_items
                .iter()
                .find(|item| value_string(item, "Name").eq_ignore_ascii_case(&name));
            let advanced_properties = advanced_items
                .iter()
                .filter(|item| value_string(item, "Name").eq_ignore_ascii_case(&name))
                .map(|item| AdapterAdvancedProperty {
                    display_name: value_string(item, "DisplayName"),
                    display_value: value_string(item, "DisplayValue"),
                })
                .filter(|prop| !prop.display_name.is_empty())
                .collect::<Vec<_>>();
            let counters = interface_map.get(&name);

            adapters.push(NetworkOptimizerAdapter {
                name: name.clone(),
                description: value_string(&adapter, "InterfaceDescription"),
                status: value_string(&adapter, "Status"),
                link_speed: value_string(&adapter, "LinkSpeed"),
                mac_address: value_string(&adapter, "MacAddress"),
                if_index: value_u32(&adapter, "ifIndex").unwrap_or_default(),
                media_type: value_string(&adapter, "MediaType"),
                physical_media_type: value_string(&adapter, "PhysicalMediaType"),
                ipv4: counters
                    .map(|iface| iface.ip_v4.clone())
                    .unwrap_or_else(|| "Not Connected".to_string()),
                mtu: matching_ip.and_then(|item| value_u32(item, "NlMtu")),
                metric: matching_ip.and_then(|item| value_u32(item, "InterfaceMetric")),
                dhcp: matching_ip
                    .map(|item| value_string(item, "Dhcp"))
                    .unwrap_or_default(),
                dns_servers: matching_dns
                    .map(|item| string_list(item, "ServerAddresses"))
                    .unwrap_or_default(),
                rss_enabled: matching_rss.and_then(|item| item.get("Enabled").and_then(Value::as_bool)),
                received_bytes: counters.map(|iface| iface.received_bytes).unwrap_or_default(),
                transmitted_bytes: counters.map(|iface| iface.transmitted_bytes).unwrap_or_default(),
                advanced_properties,
            });
        }

        let tcp_json = ps_json(
            "Get-NetTCPSetting | Where-Object {$_.SettingName -eq 'Internet'} | Select-Object -First 1 SettingName,AutoTuningLevelLocal,CongestionProvider,EcnCapability,ScalingHeuristics"
        );
        let tcp = TcpDiagnostics {
            active_setting: value_string(&tcp_json, "SettingName"),
            auto_tuning_level: value_string(&tcp_json, "AutoTuningLevelLocal"),
            congestion_provider: value_string(&tcp_json, "CongestionProvider"),
            ecn_capability: value_string(&tcp_json, "EcnCapability"),
            scaling_heuristics: value_string(&tcp_json, "ScalingHeuristics"),
        };

        let offload_json = ps_json(
            "Get-NetOffloadGlobalSetting | Select-Object ReceiveSegmentCoalescing,ReceiveSideScaling,Chimney,TaskOffload"
        );
        let offload = OffloadDiagnostics {
            receive_segment_coalescing: value_string(&offload_json, "ReceiveSegmentCoalescing"),
            receive_side_scaling: value_string(&offload_json, "ReceiveSideScaling"),
            chimney: value_string(&offload_json, "Chimney"),
            task_offload: value_string(&offload_json, "TaskOffload"),
        };

        let route_json = ps_json(
            "Get-NetRoute -AddressFamily IPv4 -DestinationPrefix '0.0.0.0/0' | Sort-Object RouteMetric,InterfaceMetric | Select-Object InterfaceAlias,InterfaceIndex,NextHop,RouteMetric,InterfaceMetric"
        );
        let routes = as_array(&route_json)
            .iter()
            .map(|route| RouteDiagnostics {
                interface_alias: value_string(route, "InterfaceAlias"),
                interface_index: value_u32(route, "InterfaceIndex").unwrap_or_default(),
                next_hop: value_string(route, "NextHop"),
                route_metric: value_u32(route, "RouteMetric").unwrap_or_default(),
                interface_metric: value_u32(route, "InterfaceMetric").unwrap_or_default(),
            })
            .filter(|route| !route.interface_alias.is_empty())
            .collect::<Vec<_>>();

        let mut probes = Vec::new();
        if let Some(gateway) = routes
            .iter()
            .find(|route| route.next_hop != "0.0.0.0" && !route.next_hop.is_empty())
            .map(|route| route.next_hop.clone())
        {
            if let Ok(result) = ping_host(gateway).await {
                probes.push(result);
            }
        }
        for host in ["1.1.1.1", "8.8.8.8"] {
            if let Ok(result) = ping_host(host.to_string()).await {
                probes.push(result);
            }
        }

        let dns_targets = [
            ("Cloudflare", "1.1.1.1", "1.0.0.1"),
            ("Google", "8.8.8.8", "8.8.4.4"),
            ("Quad9", "9.9.9.9", "149.112.112.112"),
        ];
        let mut dns_benchmarks = Vec::new();
        for (provider, primary, secondary) in dns_targets {
            let result = ping_host(primary.to_string()).await.ok();
            dns_benchmarks.push(DnsBenchmark {
                provider: provider.to_string(),
                primary: primary.to_string(),
                secondary: secondary.to_string(),
                latency_ms: result.as_ref().and_then(|r| r.latency_ms),
                success: result.map(|r| r.success).unwrap_or(false),
            });
        }

        let talkers_json = ps_json(
            "$groups = Get-NetTCPConnection -State Established -EA SilentlyContinue | Group-Object OwningProcess | Sort-Object Count -Descending | Select-Object -First 12; $groups | ForEach-Object { $pid=[int]$_.Name; $p=Get-Process -Id $pid -EA SilentlyContinue; [PSCustomObject]@{ ProcessId=$pid; ProcessName=if($p){$p.ProcessName}else{'Unknown'}; ConnectionCount=$_.Count } }"
        );
        let active_talkers = as_array(&talkers_json)
            .iter()
            .map(|item| NetworkProcessUsage {
                process_id: value_u32(item, "ProcessId").unwrap_or_default(),
                process_name: value_string(item, "ProcessName"),
                connection_count: value_u32(item, "ConnectionCount").unwrap_or_default(),
            })
            .filter(|item| item.connection_count > 0)
            .collect::<Vec<_>>();

        let wifi = parse_wifi_diagnostics();
        let recommendations = build_recommendations(
            &adapters,
            &wifi,
            &tcp,
            &offload,
            &probes,
            &dns_benchmarks,
            &active_talkers,
        );

        let mut profiles = default_profiles();
        for profile in &mut profiles {
            profile.recommendation_ids = recommendations
                .iter()
                .filter(|rec| rec.applies_to_profiles.iter().any(|id| id == &profile.id))
                .map(|rec| rec.id.clone())
                .collect();
        }

        Ok(NetworkOptimizerReport {
            generated_at: chrono::Utc::now().to_rfc3339(),
            adapters,
            wifi,
            tcp,
            offload,
            routes,
            probes,
            dns_benchmarks,
            active_talkers,
            recommendations,
            profiles,
        })
    }
}

fn ps_escape(value: &str) -> String {
    value.replace('\'', "''")
}

fn validate_adapter_name(adapter_name: &Option<String>) -> Result<String, String> {
    adapter_name
        .as_ref()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .ok_or_else(|| "This action requires an adapter name.".to_string())
}

fn validate_ipv4(value: &str) -> Result<String, String> {
    let clean = value.trim();
    let parts: Vec<_> = clean.split('.').collect();
    if parts.len() != 4 || !parts.iter().all(|part| part.parse::<u8>().is_ok()) {
        return Err(format!("Invalid IPv4 address: {}", clean));
    }
    Ok(clean.to_string())
}

#[command]
pub async fn apply_network_optimizer_action(
    request: NetworkOptimizerApplyRequest,
) -> Result<NetworkOptimizerApplyResult, String> {
    let (title, script, revert_action_id) = match request.action_id.as_str() {
        "clear_dns_cache" => (
            "DNS cache cleared",
            "Clear-DnsClientCache".to_string(),
            None,
        ),
        "set_dns_cloudflare" => {
            let adapter = ps_escape(&validate_adapter_name(&request.adapter_name)?);
            (
                "Cloudflare DNS applied",
                format!(
                    "Set-DnsClientServerAddress -InterfaceAlias '{}' -ServerAddresses @('1.1.1.1','1.0.0.1')",
                    adapter
                ),
                Some("reset_dns_dhcp".to_string()),
            )
        }
        "set_dns_google" => {
            let adapter = ps_escape(&validate_adapter_name(&request.adapter_name)?);
            (
                "Google DNS applied",
                format!(
                    "Set-DnsClientServerAddress -InterfaceAlias '{}' -ServerAddresses @('8.8.8.8','8.8.4.4')",
                    adapter
                ),
                Some("reset_dns_dhcp".to_string()),
            )
        }
        "set_dns_quad9" => {
            let adapter = ps_escape(&validate_adapter_name(&request.adapter_name)?);
            (
                "Quad9 DNS applied",
                format!(
                    "Set-DnsClientServerAddress -InterfaceAlias '{}' -ServerAddresses @('9.9.9.9','149.112.112.112')",
                    adapter
                ),
                Some("reset_dns_dhcp".to_string()),
            )
        }
        "set_dns_custom" => {
            let adapter = ps_escape(&validate_adapter_name(&request.adapter_name)?);
            let primary = validate_ipv4(
                request
                    .custom_primary_dns
                    .as_deref()
                    .ok_or_else(|| "Primary DNS is required.".to_string())?,
            )?;
            let secondary = request
                .custom_secondary_dns
                .as_deref()
                .filter(|s| !s.trim().is_empty())
                .map(validate_ipv4)
                .transpose()?;
            let servers = if let Some(secondary) = secondary {
                format!("@('{}','{}')", primary, secondary)
            } else {
                format!("@('{}')", primary)
            };
            (
                "Custom DNS applied",
                format!(
                    "Set-DnsClientServerAddress -InterfaceAlias '{}' -ServerAddresses {}",
                    adapter, servers
                ),
                Some("reset_dns_dhcp".to_string()),
            )
        }
        "reset_dns_dhcp" => {
            let adapter = ps_escape(&validate_adapter_name(&request.adapter_name)?);
            (
                "DNS reset to automatic",
                format!(
                    "Set-DnsClientServerAddress -InterfaceAlias '{}' -ResetServerAddresses",
                    adapter
                ),
                None,
            )
        }
        "prefer_ethernet" => (
            "Ethernet preference applied",
            "Get-NetIPInterface -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -match 'Ethernet'} | Set-NetIPInterface -InterfaceMetric 10; Get-NetIPInterface -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -match 'Wi-Fi|Wireless'} | Set-NetIPInterface -InterfaceMetric 50".to_string(),
            Some("restore_auto_metrics".to_string()),
        ),
        "restore_auto_metrics" => (
            "Automatic interface metrics restored",
            "Get-NetIPInterface -AddressFamily IPv4 | Set-NetIPInterface -AutomaticMetric Enabled".to_string(),
            None,
        ),
        "enable_rss" => (
            "Receive Side Scaling enabled",
            "Enable-NetAdapterRss -Name '*' -EA SilentlyContinue; netsh int tcp set global rss=enabled".to_string(),
            Some("reset_tcp_normal".to_string()),
        ),
        "reset_tcp_normal" => (
            "TCP global defaults restored",
            "netsh int tcp set global autotuninglevel=normal; netsh int tcp set global rss=enabled; netsh int tcp set global ecncapability=disabled".to_string(),
            None,
        ),
        "disable_delivery_optimization_peer" => (
            "Delivery Optimization peer sharing limited",
            "New-Item -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DeliveryOptimization' -Force | Out-Null; Set-ItemProperty -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DeliveryOptimization' -Name DODownloadMode -Type DWord -Value 0".to_string(),
            Some("restore_delivery_optimization_default".to_string()),
        ),
        "restore_delivery_optimization_default" => (
            "Delivery Optimization policy restored",
            "Remove-ItemProperty -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DeliveryOptimization' -Name DODownloadMode -EA SilentlyContinue".to_string(),
            None,
        ),
        "create_qos_policy" => {
            let exe = request
                .executable_path
                .as_deref()
                .map(str::trim)
                .filter(|s| !s.is_empty())
                .ok_or_else(|| "Executable path is required for QoS policy.".to_string())?;
            let exe = ps_escape(exe);
            (
                "Gaming QoS policy created",
                format!(
                    "Remove-NetQosPolicy -Name 'WinOpt Gaming Low Latency' -Confirm:$false -EA SilentlyContinue; New-NetQosPolicy -Name 'WinOpt Gaming Low Latency' -AppPathNameMatchCondition '{}' -DSCPAction 46",
                    exe
                ),
                Some("remove_qos_policy".to_string()),
            )
        }
        "remove_qos_policy" => (
            "Gaming QoS policy removed",
            "Remove-NetQosPolicy -Name 'WinOpt Gaming Low Latency' -Confirm:$false -EA SilentlyContinue".to_string(),
            None,
        ),
        other => return Err(format!("Unknown network optimizer action: {}", other)),
    };

    let stdout = run_powershell(&script)?;
    Ok(NetworkOptimizerApplyResult {
        success: true,
        title: title.to_string(),
        message: "Action completed. Re-run the scan to verify the new network state.".to_string(),
        stdout,
        revert_action_id,
    })
}

#[command]
pub async fn ping_host(host: String) -> Result<PingResult, String> {
    // Allowlist: RFC-1123 hostname OR dotted-decimal IPv4
    use regex::Regex;

    let hostname_re = Regex::new(
        r"^(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?$"
    ).expect("static regex");
    let ipv4_re = Regex::new(r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$").expect("static regex");

    let is_valid_hostname = hostname_re.is_match(&host);
    let is_valid_ipv4 = ipv4_re.is_match(&host) && host.split('.').all(|o| o.parse::<u8>().is_ok());

    if !is_valid_hostname && !is_valid_ipv4 {
        return Err("Invalid hostname format. Use a valid hostname or IPv4 address.".to_string());
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
                            let end_idx = lower_line[time_idx..]
                                .find("ms")
                                .unwrap_or(lower_line.len() - time_idx);
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
                            sum_diffs += (latencies[i] - latencies[i - 1]).abs();
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

#[cfg(test)]
mod tests {
    use super::*;

    fn adapter(name: &str, status: &str, ipv4: &str, metric: Option<u32>, media: &str) -> NetworkOptimizerAdapter {
        NetworkOptimizerAdapter {
            name: name.to_string(),
            description: format!("{} test adapter", name),
            status: status.to_string(),
            link_speed: "1 Gbps".to_string(),
            mac_address: "AA-BB-CC-DD-EE-FF".to_string(),
            if_index: 12,
            media_type: media.to_string(),
            physical_media_type: media.to_string(),
            ipv4: ipv4.to_string(),
            mtu: Some(1500),
            metric,
            dhcp: "Enabled".to_string(),
            dns_servers: vec![],
            rss_enabled: Some(true),
            received_bytes: 0,
            transmitted_bytes: 0,
            advanced_properties: vec![],
        }
    }

    fn tcp(auto_tuning_level: &str) -> TcpDiagnostics {
        TcpDiagnostics {
            active_setting: "Internet".to_string(),
            auto_tuning_level: auto_tuning_level.to_string(),
            congestion_provider: "CUBIC".to_string(),
            ecn_capability: "Disabled".to_string(),
            scaling_heuristics: "Disabled".to_string(),
        }
    }

    fn offload(receive_side_scaling: &str) -> OffloadDiagnostics {
        OffloadDiagnostics {
            receive_segment_coalescing: "Enabled".to_string(),
            receive_side_scaling: receive_side_scaling.to_string(),
            chimney: "Disabled".to_string(),
            task_offload: "Enabled".to_string(),
        }
    }

    #[test]
    fn validate_ipv4_accepts_only_valid_ipv4_octets() {
        assert_eq!(validate_ipv4(" 1.1.1.1 ").unwrap(), "1.1.1.1");
        assert_eq!(validate_ipv4("192.168.0.254").unwrap(), "192.168.0.254");

        assert!(validate_ipv4("999.1.1.1").is_err());
        assert!(validate_ipv4("1.1.1").is_err());
        assert!(validate_ipv4("dns.google").is_err());
        assert!(validate_ipv4("1.1.1.1; Remove-Item").is_err());
    }

    #[test]
    fn recommendation_engine_requires_an_active_adapter_before_tuning() {
        let recommendations = build_recommendations(
            &[adapter("Ethernet", "Down", "Not Connected", None, "802.3")],
            &None,
            &tcp("Normal"),
            &offload("Enabled"),
            &[],
            &[],
            &[],
        );

        assert_eq!(recommendations.len(), 1);
        assert_eq!(recommendations[0].id, "connect_adapter");
        assert!(recommendations[0].action.is_none());
    }

    #[test]
    fn recommendation_engine_detects_route_wifi_tcp_rss_and_dns_opportunities() {
        let recommendations = build_recommendations(
            &[
                adapter("Ethernet", "Up", "192.168.1.10", Some(50), "802.3"),
                adapter("Wi-Fi", "Up", "192.168.1.11", Some(10), "Native 802.11"),
            ],
            &Some(WifiDiagnostics {
                ssid: "Lab".to_string(),
                bssid: "00:11:22:33:44:55".to_string(),
                radio_type: "802.11n".to_string(),
                authentication: "WPA2-Personal".to_string(),
                cipher: "CCMP".to_string(),
                channel: Some(11),
                signal_pct: Some(52),
                receive_rate_mbps: Some(144.0),
                transmit_rate_mbps: Some(144.0),
                profile: "Lab".to_string(),
            }),
            &tcp("Disabled"),
            &offload("Disabled"),
            &[
                PingResult {
                    host: "1.1.1.1".to_string(),
                    latency_ms: Some(30.0),
                    min_ms: Some(10.0),
                    max_ms: Some(80.0),
                    jitter_ms: Some(24.0),
                    packet_loss_pct: 2.0,
                    success: true,
                },
            ],
            &[
                DnsBenchmark {
                    provider: "Cloudflare".to_string(),
                    primary: "1.1.1.1".to_string(),
                    secondary: "1.0.0.1".to_string(),
                    latency_ms: Some(8.0),
                    success: true,
                },
            ],
            &[
                NetworkProcessUsage {
                    process_id: 1008,
                    process_name: "OneDrive".to_string(),
                    connection_count: 6,
                },
            ],
        );

        let ids: Vec<_> = recommendations.iter().map(|rec| rec.id.as_str()).collect();
        assert!(ids.contains(&"prefer_wired_route"));
        assert!(ids.contains(&"wifi_signal_low"));
        assert!(ids.contains(&"wifi_legacy_radio"));
        assert!(ids.contains(&"tcp_autotuning_not_normal"));
        assert!(ids.contains(&"rss_disabled"));
        assert!(ids.contains(&"packet_loss_detected"));
        assert!(ids.contains(&"jitter_under_idle"));
        assert!(ids.contains(&"background_network_contention"));
        assert!(ids.contains(&"dns_explicit_resolver"));
        assert!(ids.contains(&"bufferbloat_loaded_test"));
    }

    #[test]
    fn recommendation_engine_keeps_modern_healthy_stack_to_baseline_advice() {
        let recommendations = build_recommendations(
            &[adapter("Ethernet", "Up", "192.168.1.10", Some(5), "802.3")],
            &None,
            &tcp("Normal"),
            &offload("Enabled"),
            &[
                PingResult {
                    host: "1.1.1.1".to_string(),
                    latency_ms: Some(8.0),
                    min_ms: Some(7.0),
                    max_ms: Some(10.0),
                    jitter_ms: Some(1.0),
                    packet_loss_pct: 0.0,
                    success: true,
                },
            ],
            &[],
            &[],
        );

        let ids: Vec<_> = recommendations.iter().map(|rec| rec.id.as_str()).collect();
        assert_eq!(ids, vec!["bufferbloat_loaded_test"]);
    }
}
