use serde::Serialize;
use std::collections::HashMap;
use std::os::windows::process::CommandExt;
use tauri::command;
use windows::Win32::System::LibraryLoader::{GetModuleHandleA, GetProcAddress};

const CREATE_NO_WINDOW: u32 = 0x08000000;

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LatencyStatus {
    pub timer_resolution_100ns: u32,
    pub min_resolution_100ns: u32,
    pub max_resolution_100ns: u32,
    pub standby_ram_mb: u64,
    pub dynamic_tick_disabled: bool,
    pub platform_clock_forced: bool,
}

// Type alias for NtQueryTimerResolution:
// NTSTATUS NtQueryTimerResolution(PULONG MinimumResolution, PULONG MaximumResolution, PULONG CurrentResolution)
type NtQueryTimerResolutionFn =
    unsafe extern "system" fn(*mut u32, *mut u32, *mut u32) -> i32;

// Type alias for NtSetSystemInformation:
// NTSTATUS NtSetSystemInformation(SYSTEM_INFORMATION_CLASS, PVOID, ULONG)
type NtSetSystemInformationFn =
    unsafe extern "system" fn(i32, *mut std::ffi::c_void, u32) -> i32;

/// Dynamically resolve an ntdll function by name and transmute it to the desired function type.
/// Returns None if the function cannot be found.
unsafe fn resolve_ntdll<T: Copy>(name: &[u8]) -> Option<T> {
    let module = GetModuleHandleA(windows::core::PCSTR(b"ntdll.dll\0".as_ptr())).ok()?;
    let proc = GetProcAddress(module, windows::core::PCSTR(name.as_ptr()))?;
    // Safety: the caller asserts T matches the actual function signature
    Some(std::mem::transmute_copy(&proc))
}

/// Query the current Windows timer resolution via NtQueryTimerResolution.
/// Returns (min, max, current) in 100ns units.
fn query_timer_resolution() -> Option<(u32, u32, u32)> {
    let func: NtQueryTimerResolutionFn =
        unsafe { resolve_ntdll(b"NtQueryTimerResolution\0")? };
    let (mut min, mut max, mut cur) = (0u32, 0u32, 0u32);
    let status = unsafe { func(&mut min, &mut max, &mut cur) };
    if status == 0 {
        Some((min, max, cur))
    } else {
        None
    }
}

/// Read standby RAM in MB via PowerShell WMI query.
fn get_standby_ram_mb() -> u64 {
    let out = std::process::Command::new("powershell")
        .args([
            "-NoProfile",
            "-NonInteractive",
            "-Command",
            "(Get-WmiObject -Class Win32_PerfFormattedData_PerfOS_Memory).StandbyList",
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .output();

    out.ok()
        .and_then(|o| {
            String::from_utf8_lossy(&o.stdout)
                .trim()
                .parse::<u64>()
                .ok()
        })
        .unwrap_or(0)
}

/// Run bcdedit /enum {current} and parse lines into a key→value map.
fn parse_bcdedit() -> HashMap<String, String> {
    let out = std::process::Command::new("bcdedit")
        .args(["/enum", "{current}"])
        .creation_flags(CREATE_NO_WINDOW)
        .output();

    let mut map = HashMap::new();
    let Ok(o) = out else { return map };
    let text = String::from_utf8_lossy(&o.stdout);
    for line in text.lines() {
        // Lines look like: "disabledynamictick      Yes"
        let parts: Vec<&str> = line.splitn(2, ' ').collect();
        if parts.len() == 2 {
            let key = parts[0].trim().to_lowercase();
            let val = parts[1].trim().to_string();
            if !key.is_empty() && !val.is_empty() {
                map.insert(key, val);
            }
        }
    }
    map
}

/// Get current latency-related system status: timer resolution, standby RAM, bcdedit flags.
#[command]
pub fn get_latency_status() -> Result<LatencyStatus, String> {
    let (min_res, max_res, cur_res) = query_timer_resolution().unwrap_or((156_250, 5_000, 156_250));
    let standby_mb = get_standby_ram_mb();
    let bcd = parse_bcdedit();

    let dynamic_tick_disabled = bcd
        .get("disabledynamictick")
        .map(|v| v.to_lowercase() == "yes")
        .unwrap_or(false);

    let platform_clock_forced = bcd
        .get("useplatformclock")
        .map(|v| v.to_lowercase() == "yes")
        .unwrap_or(false);

    Ok(LatencyStatus {
        timer_resolution_100ns: cur_res,
        min_resolution_100ns: min_res,
        max_resolution_100ns: max_res,
        standby_ram_mb: standby_mb,
        dynamic_tick_disabled,
        platform_clock_forced,
    })
}

/// Flush the Windows standby memory list via NtSetSystemInformation.
/// Returns the approximate MB freed by comparing standby RAM before and after.
/// Requires administrator privileges.
#[command]
pub fn flush_standby_list() -> Result<u64, String> {
    let func: NtSetSystemInformationFn = unsafe {
        resolve_ntdll(b"NtSetSystemInformation\0")
            .ok_or_else(|| "NtSetSystemInformation not found in ntdll".to_string())?
    };

    let before_mb = get_standby_ram_mb();

    // SystemMemoryListCommand = 80, MemoryFlushStandbyList = 4
    const SYSTEM_MEMORY_LIST_COMMAND: i32 = 80;
    let mut command: u32 = 4; // MemoryFlushStandbyList
    let status = unsafe {
        func(
            SYSTEM_MEMORY_LIST_COMMAND,
            &mut command as *mut u32 as *mut std::ffi::c_void,
            std::mem::size_of::<u32>() as u32,
        )
    };

    if status < 0 {
        return Err(format!("NtSetSystemInformation failed with status 0x{:08X}", status as u32));
    }

    let after_mb = get_standby_ram_mb();
    let freed = before_mb.saturating_sub(after_mb);
    Ok(freed)
}

/// Get relevant bcdedit settings as a key→value map for display in the UI.
#[command]
pub fn get_bcdedit_settings() -> Result<HashMap<String, String>, String> {
    let mut full = parse_bcdedit();
    // Keep only latency-relevant keys
    let keys_of_interest = [
        "disabledynamictick",
        "useplatformclock",
        "hypervisorlaunchtype",
        "nx",
        "pae",
        "bcdedit",
    ];
    full.retain(|k, _| keys_of_interest.iter().any(|ki| k == ki));
    Ok(full)
}
