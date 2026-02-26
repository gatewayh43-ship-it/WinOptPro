use serde::{Deserialize, Serialize};
use std::env;
use std::fs;
use tauri::command;
use walkdir::WalkDir;

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

    // 5. Windows Event Logs (C:\Windows\System32\winevt\Logs) - We don't delete these directly as they are locked, 
    // but we can query them later or leave them to a PowerShell tweak. We'll skip raw deletion of evtx files here.

    Ok(items)
}

fn calculate_dir_size(path: &str) -> Result<u64, String> {
    let mut total_size = 0;
    
    // Ignore permission denied errors gracefully
    for entry in WalkDir::new(path).into_iter().filter_map(|e| e.ok()) {
        if entry.file_type().is_file() {
            if let Ok(metadata) = entry.metadata() {
                total_size += metadata.len();
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
            let size = entry.metadata().map(|m| m.len()).unwrap_or(0);
            match fs::remove_file(p) {
                Ok(_) => {
                    freed += size;
                    removed += 1;
                }
                Err(e) => {
                    // It's entirely normal for temp files to be in use (locked). We silently ignore those,
                    // but we can track the error message if needed for debugging.
                    errors.push(format!("Failed to delete {}: {}", p.display(), e));
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
