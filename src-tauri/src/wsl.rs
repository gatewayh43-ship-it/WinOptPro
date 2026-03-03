use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::os::windows::process::CommandExt;
use std::process::Command;
use tauri::command;

const CREATE_NO_WINDOW: u32 = 0x08000000;

// ── Structs ─────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WslDistro {
    pub name: String,
    pub state: String,
    pub version: u8,
    pub is_default: bool,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WslStatus {
    pub is_enabled: bool,
    pub default_version: Option<u8>,
    pub wsl_version: String,
    pub kernel_version: String,
    pub distros: Vec<WslDistro>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WslConfig {
    pub memory_gb: Option<f32>,
    pub processors: Option<u32>,
    pub swap_gb: Option<f32>,
    pub localhost_forwarding: bool,
    pub networking_mode: String,
    pub dns_tunneling: bool,
    pub firewall: bool,
    pub auto_proxy: bool,
    pub gui_applications: bool,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WslSetupState {
    pub wsl_enabled: bool,
    pub wsl2_available: bool,
    pub has_distro: bool,
    pub default_distro: Option<String>,
    pub has_desktop_env: bool,
    pub installed_des: Vec<String>,
    pub wslg_supported: bool,
}

// ── Helpers ──────────────────────────────────────────────────────────────────

fn run_wsl(args: &[&str]) -> std::io::Result<std::process::Output> {
    Command::new("wsl")
        .args(args)
        .creation_flags(CREATE_NO_WINDOW)
        .output()
}

fn is_wsl_feature_enabled() -> bool {
    let out = Command::new("dism")
        .args([
            "/online",
            "/get-featureinfo",
            "/featurename:Microsoft-Windows-Subsystem-Linux",
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .output();

    match out {
        Ok(o) => {
            let text = String::from_utf8_lossy(&o.stdout);
            text.contains("Enabled")
        }
        Err(_) => false,
    }
}

fn parse_distros(raw: &str) -> Vec<WslDistro> {
    let mut distros = Vec::new();
    for line in raw.lines().skip(1) {
        // Format: "  Ubuntu          Running         2"
        // Default has a "*" prefix: "* Ubuntu         Running         2"
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        let is_default = line.starts_with('*');
        let line = line.trim_start_matches('*').trim();

        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 3 {
            continue;
        }
        let name = parts[0].to_string();
        let state = parts[1].to_string();
        let version: u8 = parts[2].parse().unwrap_or(2);

        distros.push(WslDistro { name, state, version, is_default });
    }
    distros
}

fn get_win_build() -> u32 {
    let out = Command::new("cmd")
        .args(["/c", "ver"])
        .creation_flags(CREATE_NO_WINDOW)
        .output();
    if let Ok(o) = out {
        let ver = String::from_utf8_lossy(&o.stdout).to_string();
        // "Microsoft Windows [Version 10.0.22631.3880]"
        if let Some(start) = ver.find("10.0.") {
            let rest = &ver[start + 5..];
            let build_str: String = rest.chars().take_while(|c| c.is_ascii_digit()).collect();
            return build_str.parse().unwrap_or(0);
        }
    }
    0
}

// ── Commands ─────────────────────────────────────────────────────────────────

/// Get overall WSL status (feature state + distros)
#[command]
pub fn get_wsl_status() -> Result<WslStatus, String> {
    let is_enabled = is_wsl_feature_enabled();

    // Parse distros
    let distros = if is_enabled {
        let out = run_wsl(&["--list", "--verbose"])
            .map_err(|e| format!("Failed to list WSL distros: {}", e))?;
        let raw = String::from_utf8_lossy(&out.stdout).to_string();
        parse_distros(&raw)
    } else {
        vec![]
    };

    // Get WSL and kernel versions from `wsl --status`
    let mut wsl_version = String::new();
    let mut kernel_version = String::new();
    let mut default_version: Option<u8> = None;

    if is_enabled {
        let status_out = run_wsl(&["--status"]).ok();
        if let Some(out) = status_out {
            let text = String::from_utf8_lossy(&out.stdout).to_string();
            for line in text.lines() {
                if line.contains("WSL version") || line.contains("Default Version") {
                    if let Some(v) = line.split(':').nth(1) {
                        let v = v.trim();
                        if line.contains("Default Version") {
                            default_version = v.parse().ok();
                        } else {
                            wsl_version = v.to_string();
                        }
                    }
                }
                if line.contains("Kernel version") {
                    if let Some(v) = line.split(':').nth(1) {
                        kernel_version = v.trim().to_string();
                    }
                }
            }
        }
    }

    Ok(WslStatus {
        is_enabled,
        default_version,
        wsl_version,
        kernel_version,
        distros,
    })
}

/// List installed WSL distros
#[command]
pub fn list_wsl_distros() -> Result<Vec<WslDistro>, String> {
    let out = run_wsl(&["--list", "--verbose"])
        .map_err(|e| format!("Failed to list WSL distros: {}", e))?;
    let raw = String::from_utf8_lossy(&out.stdout).to_string();
    Ok(parse_distros(&raw))
}

/// Install a WSL distro by ID (e.g. "Ubuntu", "Debian")
#[command]
pub fn install_wsl_distro(distro_id: String) -> Result<bool, String> {
    let out = run_wsl(&["--install", "-d", &distro_id, "--no-launch"])
        .map_err(|e| format!("Failed to install distro: {}", e))?;

    if out.status.success() {
        Ok(true)
    } else {
        let err = String::from_utf8_lossy(&out.stderr).to_string();
        Err(format!("Install failed: {}", err.trim()))
    }
}

/// Uninstall (unregister) a WSL distro by name
#[command]
pub fn uninstall_wsl_distro(name: String) -> Result<bool, String> {
    // Terminate first (ignore errors if not running)
    let _ = run_wsl(&["--terminate", &name]);

    let out = run_wsl(&["--unregister", &name])
        .map_err(|e| format!("Failed to unregister distro: {}", e))?;

    if out.status.success() {
        Ok(true)
    } else {
        let err = String::from_utf8_lossy(&out.stderr).to_string();
        Err(format!("Unregister failed: {}", err.trim()))
    }
}

/// Set the default WSL distro
#[command]
pub fn set_default_distro(name: String) -> Result<bool, String> {
    let out = run_wsl(&["--set-default", &name])
        .map_err(|e| format!("Failed to set default distro: {}", e))?;

    if out.status.success() {
        Ok(true)
    } else {
        let err = String::from_utf8_lossy(&out.stderr).to_string();
        Err(format!("Set default failed: {}", err.trim()))
    }
}

/// Set the default WSL version (1 or 2)
#[command]
pub fn set_wsl_default_version(version: u32) -> Result<bool, String> {
    let ver_str = version.to_string();
    let out = run_wsl(&["--set-default-version", &ver_str])
        .map_err(|e| format!("Failed to set default version: {}", e))?;

    if out.status.success() {
        Ok(true)
    } else {
        let err = String::from_utf8_lossy(&out.stderr).to_string();
        Err(format!("Set version failed: {}", err.trim()))
    }
}

/// Enable WSL (requires elevation — dism)
#[command]
pub fn enable_wsl() -> Result<bool, String> {
    let out = Command::new("dism")
        .args([
            "/online",
            "/enable-feature",
            "/featurename:Microsoft-Windows-Subsystem-Linux",
            "/all",
            "/norestart",
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| format!("Failed to enable WSL feature: {}", e))?;

    let _ = Command::new("dism")
        .args([
            "/online",
            "/enable-feature",
            "/featurename:VirtualMachinePlatform",
            "/all",
            "/norestart",
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .output();

    if out.status.success() {
        Ok(true)
    } else {
        let err = String::from_utf8_lossy(&out.stderr).to_string();
        Err(format!("Enable WSL failed: {}", err.trim()))
    }
}

/// Disable WSL (shutdown + dism disable)
#[command]
pub fn disable_wsl() -> Result<bool, String> {
    let _ = run_wsl(&["--shutdown"]);

    let out = Command::new("dism")
        .args([
            "/online",
            "/disable-feature",
            "/featurename:Microsoft-Windows-Subsystem-Linux",
            "/norestart",
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| format!("Failed to disable WSL feature: {}", e))?;

    if out.status.success() {
        Ok(true)
    } else {
        let err = String::from_utf8_lossy(&out.stderr).to_string();
        Err(format!("Disable WSL failed: {}", err.trim()))
    }
}

/// Full WSL clean uninstall — removes all distros + disables features + cleans registry
#[command]
pub fn clean_uninstall_wsl() -> Result<bool, String> {
    // Shutdown
    let _ = run_wsl(&["--shutdown"]);

    // Unregister all distros
    let list_out = run_wsl(&["--list", "--quiet"]).ok();
    if let Some(out) = list_out {
        let raw = String::from_utf8_lossy(&out.stdout).to_string();
        for line in raw.lines() {
            let name = line.trim().trim_start_matches('*').trim();
            if !name.is_empty() {
                let _ = run_wsl(&["--unregister", name]);
            }
        }
    }

    // Disable features
    let _ = Command::new("dism")
        .args([
            "/online",
            "/disable-feature",
            "/featurename:Microsoft-Windows-Subsystem-Linux",
            "/norestart",
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .output();

    let _ = Command::new("dism")
        .args([
            "/online",
            "/disable-feature",
            "/featurename:VirtualMachinePlatform",
            "/norestart",
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .output();

    // Clean Lxss registry key
    let _ = Command::new("reg")
        .args([
            "delete",
            r"HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Lxss",
            "/f",
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .output();

    Ok(true)
}

/// Read and parse ~/.wslconfig [wsl2] section
#[command]
pub fn get_wsl_config() -> Result<WslConfig, String> {
    let userprofile = std::env::var("USERPROFILE")
        .unwrap_or_else(|_| "C:\\Users\\Default".to_string());
    let config_path = format!("{}\\.wslconfig", userprofile);

    let content = std::fs::read_to_string(&config_path).unwrap_or_default();

    let mut config = WslConfig {
        memory_gb: None,
        processors: None,
        swap_gb: None,
        localhost_forwarding: true,
        networking_mode: "nat".to_string(),
        dns_tunneling: false,
        firewall: true,
        auto_proxy: true,
        gui_applications: true,
    };

    let mut in_wsl2 = false;
    for line in content.lines() {
        let line = line.trim();
        if line == "[wsl2]" {
            in_wsl2 = true;
            continue;
        }
        if line.starts_with('[') {
            in_wsl2 = false;
            continue;
        }
        if !in_wsl2 || line.starts_with('#') || line.is_empty() {
            continue;
        }

        let mut parts = line.splitn(2, '=');
        let key = parts.next().unwrap_or("").trim();
        let val = parts.next().unwrap_or("").trim().trim_end_matches("GB").trim();

        match key {
            "memory" => config.memory_gb = val.trim_end_matches("GB").trim().parse().ok(),
            "processors" => config.processors = val.parse().ok(),
            "swap" => config.swap_gb = val.trim_end_matches("GB").trim().parse().ok(),
            "localhostForwarding" => config.localhost_forwarding = val == "true",
            "networkingMode" => config.networking_mode = val.to_string(),
            "dnsTunneling" => config.dns_tunneling = val == "true",
            "firewall" => config.firewall = val == "true",
            "autoProxy" => config.auto_proxy = val == "true",
            "guiApplications" => config.gui_applications = val == "true",
            _ => {}
        }
    }

    Ok(config)
}

/// Write ~/.wslconfig [wsl2] section from WslConfig struct
#[command]
pub fn set_wsl_config(config: WslConfig) -> Result<bool, String> {
    let userprofile = std::env::var("USERPROFILE")
        .unwrap_or_else(|_| "C:\\Users\\Default".to_string());
    let config_path = format!("{}\\.wslconfig", userprofile);

    let mut lines = vec!["[wsl2]".to_string()];

    if let Some(mem) = config.memory_gb {
        lines.push(format!("memory={}GB", mem));
    }
    if let Some(procs) = config.processors {
        lines.push(format!("processors={}", procs));
    }
    if let Some(swap) = config.swap_gb {
        lines.push(format!("swap={}GB", swap));
    }
    lines.push(format!("localhostForwarding={}", config.localhost_forwarding));
    lines.push(format!("networkingMode={}", config.networking_mode));
    lines.push(format!("dnsTunneling={}", config.dns_tunneling));
    lines.push(format!("firewall={}", config.firewall));
    lines.push(format!("autoProxy={}", config.auto_proxy));
    lines.push(format!("guiApplications={}", config.gui_applications));

    let content = lines.join("\n") + "\n";
    std::fs::write(&config_path, content)
        .map_err(|e| format!("Failed to write .wslconfig: {}", e))?;

    Ok(true)
}

/// Check which desktop environments are installed in a distro
#[command]
pub fn check_desktop_envs(distro: String) -> Result<Vec<String>, String> {
    let check_cmd = "which xfce4-session kwin_x11 gnome-session 2>/dev/null; true";
    let out = run_wsl(&["-d", &distro, "--", "bash", "-c", check_cmd])
        .map_err(|e| format!("Failed to check DEs: {}", e))?;

    let stdout = String::from_utf8_lossy(&out.stdout).to_string();
    let mut found = Vec::new();

    for line in stdout.lines() {
        let line = line.trim();
        if line.contains("xfce4-session") { found.push("xfce4".to_string()); }
        if line.contains("kwin_x11") { found.push("kde".to_string()); }
        if line.contains("gnome-session") { found.push("gnome".to_string()); }
    }

    Ok(found)
}

/// Install a desktop environment in a WSL distro
#[command]
pub fn install_desktop_env(distro: String, de: String) -> Result<String, String> {
    let packages = match de.as_str() {
        "xfce4" => "xfce4 xfce4-goodies",
        "kde" => "kde-plasma-desktop",
        "gnome" => "ubuntu-desktop",
        other => return Err(format!("Unknown desktop environment: {}", other)),
    };

    let install_cmd = format!(
        "DEBIAN_FRONTEND=noninteractive sudo apt-get update -y && DEBIAN_FRONTEND=noninteractive sudo apt-get install -y {}",
        packages
    );

    let out = run_wsl(&["-d", &distro, "--", "bash", "-c", &install_cmd])
        .map_err(|e| format!("Failed to install DE: {}", e))?;

    let stdout = String::from_utf8_lossy(&out.stdout).to_string();
    let stderr = String::from_utf8_lossy(&out.stderr).to_string();
    let combined = format!("{}\n{}", stdout, stderr);

    Ok(combined)
}

/// Launch Linux desktop via WSLg (fire-and-forget)
#[command]
pub fn launch_linux_mode(distro: String, de: String) -> Result<bool, String> {
    let launch_cmd = match de.as_str() {
        "xfce4" => "DISPLAY=:0 xfce4-session &",
        "kde" => "DISPLAY=:0 startplasma-x11 &",
        "gnome" => "DISPLAY=:0 gnome-session &",
        other => return Err(format!("Unknown desktop environment: {}", other)),
    };

    // Spawn detached — WSLg creates the window; we return immediately
    Command::new("wsl")
        .args(["-d", &distro, "--", "bash", "-c", launch_cmd])
        .creation_flags(CREATE_NO_WINDOW)
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .spawn()
        .map_err(|e| format!("Failed to launch Linux mode: {}", e))?;

    Ok(true)
}

/// Get current WSL setup state (for wizard logic)
#[command]
pub fn get_wsl_setup_state() -> Result<WslSetupState, String> {
    let wsl_enabled = is_wsl_feature_enabled();

    // Check WSL 2 kernel availability
    let wsl2_available = if wsl_enabled {
        let out = run_wsl(&["--status"]).ok();
        out.map(|o| {
            let text = String::from_utf8_lossy(&o.stdout).to_string();
            text.contains("WSL version") || text.contains("Kernel version")
        })
        .unwrap_or(false)
    } else {
        false
    };

    // Distros
    let distros = if wsl_enabled {
        let out = run_wsl(&["--list", "--verbose"]).ok();
        out.map(|o| parse_distros(&String::from_utf8_lossy(&o.stdout)))
            .unwrap_or_default()
    } else {
        vec![]
    };

    let has_distro = !distros.is_empty();
    let default_distro = distros.iter().find(|d| d.is_default).map(|d| d.name.clone());

    // Check desktop envs in default distro
    let (has_desktop_env, installed_des) = if let Some(ref default) = default_distro {
        let check_cmd = "which xfce4-session kwin_x11 gnome-session 2>/dev/null; true";
        let out = run_wsl(&["-d", default, "--", "bash", "-c", check_cmd]).ok();
        let mut found = Vec::new();
        if let Some(o) = out {
            let stdout = String::from_utf8_lossy(&o.stdout).to_string();
            if stdout.contains("xfce4-session") { found.push("xfce4".to_string()); }
            if stdout.contains("kwin_x11") { found.push("kde".to_string()); }
            if stdout.contains("gnome-session") { found.push("gnome".to_string()); }
        }
        let has = !found.is_empty();
        (has, found)
    } else {
        (false, vec![])
    };

    // WSLg requires Windows 11 (build >= 22000)
    let wslg_supported = get_win_build() >= 22000;

    Ok(WslSetupState {
        wsl_enabled,
        wsl2_available,
        has_distro,
        default_distro,
        has_desktop_env,
        installed_des,
        wslg_supported,
    })
}

/// Shutdown all WSL instances
#[command]
pub fn shutdown_wsl() -> Result<bool, String> {
    let out = run_wsl(&["--shutdown"])
        .map_err(|e| format!("Failed to shutdown WSL: {}", e))?;

    if out.status.success() {
        Ok(true)
    } else {
        let err = String::from_utf8_lossy(&out.stderr).to_string();
        Err(format!("Shutdown failed: {}", err.trim()))
    }
}

/// Get bcdedit settings (unused in wsl but needed for latency — kept here for possible reuse)
#[allow(dead_code)]
pub fn get_bcdedit_map() -> HashMap<String, String> {
    let mut map = HashMap::new();
    let out = Command::new("bcdedit")
        .args(["/enum", "{current}"])
        .creation_flags(CREATE_NO_WINDOW)
        .output();

    if let Ok(o) = out {
        let text = String::from_utf8_lossy(&o.stdout).to_string();
        for line in text.lines() {
            let parts: Vec<&str> = line.splitn(2, ' ').collect();
            if parts.len() == 2 {
                let key = parts[0].trim().to_string();
                let val = parts[1].trim().to_string();
                if !key.is_empty() && !val.is_empty() {
                    map.insert(key, val);
                }
            }
        }
    }
    map
}
