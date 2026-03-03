use serde::{Deserialize, Serialize};
use std::os::windows::process::CommandExt;
use std::process::Command;
use tauri::command;

const CREATE_NO_WINDOW: u32 = 0x08000000;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GpuDriverInfo {
    pub vendor: String,
    pub name: String,
    pub version: String,
    pub date: String,
    pub pnp_id: String,
    pub inf_name: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DriverRemovalResult {
    pub success: bool,
    pub vendor: String,
    pub removed_packages: Vec<String>,
    pub log: Vec<String>,
    pub requires_reboot: bool,
}

fn detect_vendor(pnp_id: &str, name: &str) -> String {
    let pnp_upper = pnp_id.to_uppercase();
    let name_upper = name.to_uppercase();
    if pnp_upper.contains("VEN_10DE") || name_upper.contains("NVIDIA") {
        "NVIDIA".to_string()
    } else if pnp_upper.contains("VEN_1002") || name_upper.contains("AMD") || name_upper.contains("RADEON") {
        "AMD".to_string()
    } else if pnp_upper.contains("VEN_8086") || name_upper.contains("INTEL") {
        "Intel".to_string()
    } else {
        "Unknown".to_string()
    }
}

/// Get all installed GPU drivers via WMI + pnputil
#[command]
pub fn get_gpu_drivers() -> Result<Vec<GpuDriverInfo>, String> {
    let ps_script = r#"
$controllers = Get-WmiObject Win32_VideoController | Select-Object Name,DriverVersion,DriverDate,PNPDeviceID
if ($controllers -isnot [System.Array]) { $controllers = @($controllers) }
$controllers | ConvertTo-Json -Compress
"#;

    let output = Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", ps_script])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| format!("Failed to run PowerShell: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if stdout.is_empty() || stdout == "null" {
        return Ok(vec![]);
    }

    #[derive(Deserialize)]
    #[serde(rename_all = "PascalCase")]
    struct WmiController {
        name: Option<String>,
        driver_version: Option<String>,
        driver_date: Option<String>,
        #[serde(rename = "PNPDeviceID")]
        pnp_device_id: Option<String>,
    }

    let controllers: Vec<WmiController> = serde_json::from_str(&stdout)
        .map_err(|e| format!("Failed to parse GPU info: {}", e))?;

    // Get pnputil INF mapping
    let pnputil_out = Command::new("pnputil")
        .args(["/enum-drivers", "/class", "display"])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .ok();

    let pnputil_text = pnputil_out
        .map(|o| String::from_utf8_lossy(&o.stdout).to_string())
        .unwrap_or_default();

    let mut drivers = Vec::new();
    for ctrl in controllers {
        let name = ctrl.name.unwrap_or_default();
        let pnp_id = ctrl.pnp_device_id.unwrap_or_default();
        let vendor = detect_vendor(&pnp_id, &name);

        // Try to find matching INF in pnputil output
        let inf_name = find_inf_for_vendor(&pnputil_text, &vendor);

        // Parse WMI date format: "20231005000000.000000+000" → "2023-10-05"
        let raw_date = ctrl.driver_date.unwrap_or_default();
        let date = if raw_date.len() >= 8 {
            format!("{}-{}-{}", &raw_date[0..4], &raw_date[4..6], &raw_date[6..8])
        } else {
            raw_date
        };

        drivers.push(GpuDriverInfo {
            vendor,
            name,
            version: ctrl.driver_version.unwrap_or_default(),
            date,
            pnp_id,
            inf_name,
        });
    }

    Ok(drivers)
}

fn find_inf_for_vendor(pnputil_text: &str, vendor: &str) -> String {
    let vendor_lower = vendor.to_lowercase();
    let mut current_inf = String::new();
    for line in pnputil_text.lines() {
        let line = line.trim();
        if line.starts_with("Published Name") {
            current_inf = line
                .split(':')
                .nth(1)
                .map(|s| s.trim().to_string())
                .unwrap_or_default();
        }
        if line.starts_with("Driver Description") {
            let desc_lower = line.to_lowercase();
            if desc_lower.contains(&vendor_lower) && !current_inf.is_empty() {
                return current_inf.clone();
            }
        }
    }
    String::new()
}

/// Uninstall GPU drivers for a given vendor via pnputil + registry sweep
#[command]
pub fn uninstall_gpu_drivers(vendor: String, delete_driver_store: bool) -> Result<DriverRemovalResult, String> {
    let mut log = Vec::new();
    let mut removed_packages = Vec::new();

    log.push(format!("Starting {} driver removal...", vendor));

    // Step 1: enumerate display drivers
    let pnputil_out = Command::new("pnputil")
        .args(["/enum-drivers", "/class", "display"])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| format!("pnputil enum failed: {}", e))?;

    let pnputil_text = String::from_utf8_lossy(&pnputil_out.stdout).to_string();
    let infs = collect_vendor_infs(&pnputil_text, &vendor);

    if infs.is_empty() {
        log.push(format!("No {} driver packages found in driver store.", vendor));
        return Ok(DriverRemovalResult {
            success: true,
            vendor,
            removed_packages,
            log,
            requires_reboot: false,
        });
    }

    log.push(format!("Found {} driver package(s): {}", infs.len(), infs.join(", ")));

    // Step 2: delete each INF
    for inf in &infs {
        log.push(format!("Removing driver package: {}", inf));
        let mut args = vec!["/delete-driver", inf, "/uninstall"];
        if delete_driver_store {
            args.push("/force");
        }
        let result = Command::new("pnputil")
            .args(&args)
            .creation_flags(CREATE_NO_WINDOW)
            .output();

        match result {
            Ok(out) => {
                let out_str = String::from_utf8_lossy(&out.stdout).to_string();
                if out.status.success() || out_str.contains("successfully") {
                    log.push(format!("  ✓ Removed {}", inf));
                    removed_packages.push(inf.clone());
                } else {
                    let err = String::from_utf8_lossy(&out.stderr).to_string();
                    log.push(format!("  ✗ Failed to remove {}: {}", inf, err.trim()));
                }
            }
            Err(e) => log.push(format!("  ✗ Error running pnputil for {}: {}", inf, e)),
        }
    }

    // Step 3: Registry sweep
    log.push("Sweeping registry...".to_string());
    sweep_gpu_registry(&vendor, &mut log);

    log.push(format!("{} driver removal complete. Reboot required.", vendor));
    Ok(DriverRemovalResult {
        success: true,
        vendor,
        removed_packages,
        log,
        requires_reboot: true,
    })
}

fn collect_vendor_infs(pnputil_text: &str, vendor: &str) -> Vec<String> {
    let vendor_lower = vendor.to_lowercase();
    let mut infs = Vec::new();
    let mut current_inf = String::new();
    for line in pnputil_text.lines() {
        let line = line.trim();
        if line.starts_with("Published Name") {
            current_inf = line
                .split(':')
                .nth(1)
                .map(|s| s.trim().to_string())
                .unwrap_or_default();
        }
        if line.starts_with("Driver Description") {
            let desc_lower = line.to_lowercase();
            if desc_lower.contains(&vendor_lower) && !current_inf.is_empty() {
                infs.push(current_inf.clone());
                current_inf = String::new();
            }
        }
    }
    infs.dedup();
    infs
}

fn sweep_gpu_registry(vendor: &str, log: &mut Vec<String>) {
    // Clean per-device Video registry entries
    let video_key_result = Command::new("reg")
        .args(["query", r"HKLM\SYSTEM\CurrentControlSet\Control\Video", "/s", "/k"])
        .creation_flags(CREATE_NO_WINDOW)
        .output();

    if let Ok(out) = video_key_result {
        let text = String::from_utf8_lossy(&out.stdout).to_string();
        let vendor_upper = vendor.to_uppercase();
        let count = text.lines().filter(|l| l.to_uppercase().contains(&vendor_upper)).count();
        log.push(format!("  Found {} Video registry key(s) referencing {}", count, vendor));
    }

    // Try to delete vendor-specific software key
    let vendor_key = match vendor {
        "NVIDIA" => Some(r"HKLM\SOFTWARE\NVIDIA Corporation"),
        "AMD" => Some(r"HKLM\SOFTWARE\AMD"),
        "Intel" => Some(r"HKLM\SOFTWARE\Intel"),
        _ => None,
    };

    if let Some(key) = vendor_key {
        let del_result = Command::new("reg")
            .args(["delete", key, "/f"])
            .creation_flags(CREATE_NO_WINDOW)
            .output();
        match del_result {
            Ok(out) if out.status.success() => log.push(format!("  ✓ Deleted {}", key)),
            _ => log.push(format!("  ℹ {} not found or requires elevation", key)),
        }
    }
}

/// Schedule a clean driver removal on next Safe Mode boot via RunOnce
#[command]
pub fn schedule_safe_mode_removal(vendor: String) -> Result<bool, String> {
    let temp_dir = std::env::var("TEMP").unwrap_or_else(|_| "C:\\Windows\\Temp".to_string());
    let script_path = format!("{}\\winopt_gpu_cleanup_{}.ps1", temp_dir, vendor.to_lowercase());

    let vendor_lower = vendor.to_lowercase();
    let script = format!(
        r#"# WinOpt Pro — Safe Mode GPU Driver Cleanup ({vendor})
$vendor = "{vendor_lower}"
pnputil /enum-drivers /class display | Out-String | ForEach-Object {{
    $lines = $_ -split "`n"
    $currentInf = ""
    foreach ($line in $lines) {{
        if ($line -match "Published Name\s*:\s*(.+)") {{ $currentInf = $Matches[1].Trim() }}
        if ($line -match "Driver Description.+{vendor}" -and $currentInf) {{
            pnputil /delete-driver $currentInf /uninstall /force
            $currentInf = ""
        }}
    }}
}}
# Remove RunOnce entry
Remove-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\RunOnce" -Name "WinOptGpuCleanup_{vendor}" -ErrorAction SilentlyContinue
"#
    );

    std::fs::write(&script_path, &script)
        .map_err(|e| format!("Failed to write cleanup script: {}", e))?;

    // Register in RunOnce
    let run_once_cmd = format!(
        "powershell -ExecutionPolicy Bypass -NonInteractive -File \"{}\"",
        script_path
    );
    let reg_result = Command::new("reg")
        .args([
            "add",
            r"HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\RunOnce",
            "/v",
            &format!("WinOptGpuCleanup_{}", vendor),
            "/t",
            "REG_SZ",
            "/d",
            &run_once_cmd,
            "/f",
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| format!("Failed to set RunOnce key: {}", e))?;

    if !reg_result.status.success() {
        let err = String::from_utf8_lossy(&reg_result.stderr).to_string();
        return Err(format!("RunOnce registry write failed: {}", err.trim()));
    }

    Ok(true)
}

/// Reboot the system with a 5-second countdown
#[command]
pub fn reboot_system() -> Result<bool, String> {
    let result = Command::new("shutdown")
        .args(["/r", "/t", "5", "/c", "WinOpt Pro: GPU driver removal reboot"])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| format!("Failed to run shutdown: {}", e))?;

    if result.status.success() {
        Ok(true)
    } else {
        let err = String::from_utf8_lossy(&result.stderr).to_string();
        Err(format!("Reboot failed: {}", err.trim()))
    }
}
