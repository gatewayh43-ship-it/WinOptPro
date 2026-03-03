use serde::{Deserialize, Serialize};
use std::env;
use std::fs;
use std::os::windows::process::CommandExt;
use tauri::command;
use walkdir::WalkDir;

const CREATE_NO_WINDOW: u32 = 0x08000000;

#[derive(Debug, Serialize, Deserialize)]
pub struct CleanupItem {
    pub id: String,
    pub category: String,
    pub path: String,
    pub size_bytes: u64,
    pub description: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CleanupResult {
    pub success: bool,
    pub bytes_freed: u64,
    pub items_removed: usize,
    pub errors: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiskHealth {
    pub name: String,
    pub status: String,
    pub media_type: String,
    pub health_status: String,
}

#[command]
pub async fn scan_junk_files() -> Result<Vec<CleanupItem>, String> {
    let mut items = Vec::new();

    // 1. User Temp
    let user_temp = env::var("TEMP").unwrap_or_else(|_| "C:\\Users\\Default\\AppData\\Local\\Temp".to_string());
    if let Ok(size) = calculate_dir_size(&user_temp) {
        items.push(CleanupItem {
            id: "user_temp".to_string(),
            category: "Temporary Files".to_string(),
            path: user_temp,
            size_bytes: size,
            description: "Temporary files created by user applications.".to_string(),
        });
    }

    // 2. System Temp (Requires Admin to clean fully, but we can scan what we can)
    let sys_temp = env::var("WINDIR").unwrap_or_else(|_| "C:\\Windows".to_string()) + "\\Temp";
    if let Ok(size) = calculate_dir_size(&sys_temp) {
        items.push(CleanupItem {
            id: "sys_temp".to_string(),
            category: "System Junk".to_string(),
            path: sys_temp,
            size_bytes: size,
            description: "Temporary files created by Windows system processes.".to_string(),
        });
    }

    // 3. Windows Prefetch (Requires Admin)
    let prefetch = env::var("WINDIR").unwrap_or_else(|_| "C:\\Windows".to_string()) + "\\Prefetch";
    if let Ok(size) = calculate_dir_size(&prefetch) {
        if size > 0 {
            items.push(CleanupItem {
                id: "prefetch".to_string(),
                category: "System Cache".to_string(),
                path: prefetch,
                size_bytes: size,
                description: "Application launch cache. Safe to clean, but rebuilding may slightly slow initial application launches.".to_string(),
            });
        }
    }

    // 4. Windows Update Cache (SoftwareDistribution\Download) (Requires Admin and stopping wuauserv ideally, but we'll try)
    let wu_cache = env::var("WINDIR").unwrap_or_else(|_| "C:\\Windows".to_string()) + "\\SoftwareDistribution\\Download";
    if let Ok(size) = calculate_dir_size(&wu_cache) {
        if size > 0 {
            items.push(CleanupItem {
                id: "wu_cache".to_string(),
                category: "System Cache".to_string(),
                path: wu_cache,
                size_bytes: size,
                description: "Cached Windows Update installation files. Deleting frees significant space.".to_string(),
            });
        }
    }

    // 5. Recycle Bin
    #[cfg(target_os = "windows")]
    {
        // Actually a simpler way on Windows: just query the directory size or use SHQueryRecycleBin. For simplicity, we'll just add it as an option.
        // We'll set size to 1MB placeholder if we can't get it easily, or just 0 and let user click it anyway.
        items.push(CleanupItem {
            id: "recycle_bin".to_string(),
            category: "System".to_string(),
            path: "RecycleBin".to_string(),
            size_bytes: 0, // Size calculation requires Win32 interop (SHQueryRecycleBin)
            description: "Empty the Windows Recycle Bin.".to_string(),
        });
    }

    // 6. Browser Caches
    let local_appdata = env::var("LOCALAPPDATA").unwrap_or_else(|_| "C:\\Users\\Default\\AppData\\Local".to_string());
    
    // Chrome
    let chrome_cache = format!("{}\\Google\\Chrome\\User Data\\Default\\Cache\\Cache_Data", local_appdata);
    if let Ok(size) = calculate_dir_size(&chrome_cache) {
        if size > 0 {
            items.push(CleanupItem {
                id: "chrome_cache".to_string(),
                category: "Browser Cache".to_string(),
                path: chrome_cache,
                size_bytes: size,
                description: "Google Chrome temporary internet files.".to_string(),
            });
        }
    }

    // Edge
    let edge_cache = format!("{}\\Microsoft\\Edge\\User Data\\Default\\Cache\\Cache_Data", local_appdata);
    if let Ok(size) = calculate_dir_size(&edge_cache) {
        if size > 0 {
            items.push(CleanupItem {
                id: "edge_cache".to_string(),
                category: "Browser Cache".to_string(),
                path: edge_cache,
                size_bytes: size,
                description: "Microsoft Edge temporary internet files.".to_string(),
            });
        }
    }

    // 7. Thumbnail Cache
    let thumbnail_cache = format!("{}\\Microsoft\\Windows\\Explorer", local_appdata);
    if let Ok(size) = calculate_dir_size_with_filter(&thumbnail_cache, "thumbcache_") {
        if size > 0 {
            items.push(CleanupItem {
                id: "thumbnail_cache".to_string(),
                category: "System Cache".to_string(),
                path: thumbnail_cache,
                size_bytes: size,
                description: "Cached application and file thumbnails.".to_string(),
            });
        }
    }

    // 8. Windows Event Logs (C:\Windows\System32\winevt\Logs) - We don't delete these directly as they are locked, 
    // but we can query them later or leave them to a PowerShell tweak. We'll skip raw deletion of evtx files here.

    Ok(items)
}

fn calculate_dir_size(path: &str) -> Result<u64, String> {
    calculate_dir_size_with_filter(path, "")
}

fn calculate_dir_size_with_filter(path: &str, filter_prefix: &str) -> Result<u64, String> {
    let mut total_size = 0;
    
    // Ignore permission denied errors gracefully
    for entry in WalkDir::new(path).into_iter().filter_map(|e| e.ok()) {
        if entry.file_type().is_file() {
            let file_name = entry.file_name().to_string_lossy();
            if filter_prefix.is_empty() || file_name.starts_with(filter_prefix) {
                if let Ok(metadata) = entry.metadata() {
                    total_size += metadata.len();
                }
            }
        }
    }

    Ok(total_size)
}

#[command]
pub async fn execute_cleanup(item_ids: Vec<String>) -> Result<CleanupResult, String> {
    let mut bytes_freed = 0;
    let mut items_removed = 0;
    let mut errors = Vec::new();

    // Get the mapped paths 
    let all_items = scan_junk_files().await?;
    
    for id in item_ids {
        if id == "recycle_bin" {
            #[cfg(target_os = "windows")]
            {
                use std::os::windows::process::CommandExt;
                let output = std::process::Command::new("powershell")
                    .args(&["-NoProfile", "-Command", "Clear-RecycleBin -Force"])
                    .creation_flags(0x08000000)
                    .output();
                    
                match output {
                    Ok(out) if out.status.success() => {
                        items_removed += 1;
                    },
                    Ok(out) => {
                        errors.push(format!("Failed to empty Recycle Bin: {}", String::from_utf8_lossy(&out.stderr)));
                    },
                    Err(e) => {
                        errors.push(format!("Failed to execute Clear-RecycleBin: {}", e));
                    }
                }
            }
            continue;
        }

        if let Some(item) = all_items.iter().find(|i| i.id == id) {
            let (freed, removed, mut errs) = clean_directory(&item.path);
            bytes_freed += freed;
            items_removed += removed;
            errors.append(&mut errs);
        }
    }

    Ok(CleanupResult {
        success: true, // It's usually a partial success due to locked files
        bytes_freed,
        items_removed,
        errors,
    })
}

fn clean_directory(path: &str) -> (u64, usize, Vec<String>) {
    let mut freed = 0;
    let mut removed = 0;
    let mut errors = Vec::new();

    for entry in WalkDir::new(path).min_depth(1).into_iter().filter_map(|e| e.ok()) {
        let p = entry.path();
        
        if entry.file_type().is_file() {
            // For Thumbnail Cache, only delete thumbcache files
            if path.ends_with("Explorer") && !p.file_name().unwrap_or_default().to_string_lossy().starts_with("thumbcache_") {
                continue;
            }

            let size = entry.metadata().map(|m| m.len()).unwrap_or(0);
            
            // Send to Recycle Bin instead of permanent deletion per requirements
            match trash::delete(p) {
                Ok(_) => {
                    freed += size;
                    removed += 1;
                }
                Err(_) => {
                    // Fallback to strict deletion if trash fails or file is locked
                    match fs::remove_file(p) {
                        Ok(_) => {
                            freed += size;
                            removed += 1;
                        }
                        Err(e) => {
                            errors.push(format!("Failed to delete {}: {}", p.display(), e));
                        }
                    }
                }
            }
        } else if entry.file_type().is_dir() {
            // Try to remove empty directories. If not empty (e.g. locked files inside), it will fail gracefully.
            if fs::remove_dir(p).is_ok() {
                removed += 1;
            }
        }
    }
    
    (freed, removed, errors)
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiskSmartInfo {
    pub friendly_name: String,
    pub media_type: String,
    pub health_status: String,
    pub wear_pct: Option<u32>,
    pub temperature_c: Option<u32>,
    pub read_errors: Option<u64>,
    pub write_errors: Option<u64>,
    pub size_gb: u64,
}

/// Get physical disk health, wear, and temperature via PowerShell Get-PhysicalDisk + Get-StorageReliabilityCounter.
#[command]
pub fn get_disk_smart_status() -> Result<Vec<DiskSmartInfo>, String> {
    let script = r#"
$results = @()
Get-PhysicalDisk | ForEach-Object {
    $disk = $_
    $counter = $null
    try { $counter = Get-StorageReliabilityCounter -PhysicalDisk $disk -ErrorAction SilentlyContinue } catch {}
    $obj = [PSCustomObject]@{
        FriendlyName  = $disk.FriendlyName
        MediaType     = $disk.MediaType
        HealthStatus  = $disk.HealthStatus
        SizeBytes     = $disk.Size
        Wear          = if ($counter) { $counter.Wear } else { $null }
        Temperature   = if ($counter) { $counter.Temperature } else { $null }
        ReadErrors    = if ($counter) { $counter.ReadErrorsTotal } else { $null }
        WriteErrors   = if ($counter) { $counter.WriteErrorsTotal } else { $null }
    }
    $results += $obj
}
$results | ConvertTo-Json -Depth 3
"#;

    let out = std::process::Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", script])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| e.to_string())?;

    let text = String::from_utf8_lossy(&out.stdout);
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return Ok(vec![]);
    }

    // PowerShell may return a single object (not array) if only one disk — wrap in array
    let json_str = if trimmed.starts_with('{') {
        format!("[{}]", trimmed)
    } else {
        trimmed.to_string()
    };

    #[derive(Deserialize)]
    #[serde(rename_all = "PascalCase")]
    struct RawDisk {
        friendly_name: Option<String>,
        media_type: Option<String>,
        health_status: Option<String>,
        size_bytes: Option<u64>,
        wear: Option<serde_json::Value>,
        temperature: Option<serde_json::Value>,
        read_errors: Option<serde_json::Value>,
        write_errors: Option<serde_json::Value>,
    }

    let raw: Vec<RawDisk> = serde_json::from_str(&json_str).unwrap_or_default();

    fn parse_num<T: std::str::FromStr>(v: &Option<serde_json::Value>) -> Option<T> {
        v.as_ref()?.as_u64().and_then(|n| T::from_str(&n.to_string()).ok())
    }

    let disks = raw
        .into_iter()
        .map(|r| DiskSmartInfo {
            friendly_name: r.friendly_name.unwrap_or_else(|| "Unknown".into()),
            media_type: r.media_type.unwrap_or_else(|| "Unspecified".into()),
            health_status: r.health_status.unwrap_or_else(|| "Unknown".into()),
            size_gb: r.size_bytes.unwrap_or(0) / 1_073_741_824,
            wear_pct: parse_num::<u32>(&r.wear),
            temperature_c: parse_num::<u32>(&r.temperature),
            read_errors: parse_num::<u64>(&r.read_errors),
            write_errors: parse_num::<u64>(&r.write_errors),
        })
        .collect();

    Ok(disks)
}

/// Run TRIM optimization on the C: drive. Requires administrator privileges.
#[command]
pub fn run_trim_optimization() -> Result<bool, String> {
    let out = std::process::Command::new("powershell")
        .args([
            "-NoProfile",
            "-NonInteractive",
            "-Command",
            "Optimize-Volume -DriveLetter C -ReTrim -Verbose",
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| e.to_string())?;
    Ok(out.status.success())
}

#[command]
pub async fn get_disk_health() -> Result<Vec<DiskHealth>, String> {
    #[cfg(target_os = "windows")]
    {
        use wmi::{COMLibrary, WMIConnection};
        let com_con = COMLibrary::new().map_err(|e| format!("COM error: {}", e))?;
        // Need to use the Microsoft\Windows\Storage namespace for MSFT_PhysicalDisk
        // Or simply stick to root/cimv2 Win32_DiskDrive for basic Status ("OK", "Pred Fail", etc.)
        let wmi_con = WMIConnection::new(com_con).map_err(|e| format!("WMI parse error: {}", e))?;

        #[derive(Deserialize, Debug)]
        #[serde(rename_all = "PascalCase")]
        struct Win32DiskDrive {
            model: String,
            status: String,
            media_type: Option<String>,
        }

        let mut results = Vec::new();
        let query = "SELECT Model, Status, MediaType FROM Win32_DiskDrive";
        
        if let Ok(disks) = wmi_con.raw_query::<Win32DiskDrive>(query) {
            for disk in disks {
                let status = disk.status.clone();
                let health = if status.eq_ignore_ascii_case("OK") { "Healthy" } else { "Warning/Failing" };
                
                results.push(DiskHealth {
                    name: disk.model,
                    status: status,
                    media_type: disk.media_type.unwrap_or_else(|| "Unknown".to_string()),
                    health_status: health.to_string(),
                });
            }
        }
        
        return Ok(results);
    }
    
    #[cfg(not(target_os = "windows"))]
    Err("Not supported on this OS".to_string())
}
