use std::os::windows::process::CommandExt;
use serde::{Deserialize, Serialize};
use sysinfo::{ProcessRefreshKind, ProcessesToUpdate, System};
use tauri::{command, AppHandle, Manager, WebviewWindowBuilder, WebviewUrl};

const CREATE_NO_WINDOW: u32 = 0x08000000;

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GpuMetrics {
    pub name: String,
    pub temperature_c: f32,
    pub gpu_util_pct: f32,
    pub mem_util_pct: f32,
    pub mem_used_mb: u64,
    pub mem_total_mb: u64,
    pub power_draw_w: f32,
    pub power_limit_w: f32,
    pub power_max_limit_w: f32,
    pub is_nvidia: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct KnownGame {
    pub exe: String,
    pub name: String,
}

/// Executable names (lowercase) → display names for common games.
const KNOWN_GAMES: &[(&str, &str)] = &[
    ("cs2.exe", "Counter-Strike 2"),
    ("csgo.exe", "CS:GO"),
    ("valorant-win64-shipping.exe", "VALORANT"),
    ("rainbowsix.exe", "Rainbow Six Siege"),
    ("overwatch.exe", "Overwatch 2"),
    ("fortniteclient-win64-shipping.exe", "Fortnite"),
    ("destiny2.exe", "Destiny 2"),
    ("r5apex.exe", "Apex Legends"),
    ("warframe.x64.exe", "Warframe"),
    ("genshinimpact.exe", "Genshin Impact"),
    ("eldenring.exe", "Elden Ring"),
    ("cyberpunk2077.exe", "Cyberpunk 2077"),
    ("rdr2.exe", "Red Dead Redemption 2"),
    ("gta5.exe", "GTA V"),
    ("dota2.exe", "Dota 2"),
    ("leagueclient.exe", "League of Legends"),
    ("tslgame.exe", "PUBG: Battlegrounds"),
    ("escapefromtarkov.exe", "Escape from Tarkov"),
    ("dayz.exe", "DayZ"),
    ("witcher3.exe", "The Witcher 3"),
    ("sekiro.exe", "Sekiro"),
    ("godofwar.exe", "God of War"),
    ("bf2042.exe", "Battlefield 2042"),
    ("bf1.exe", "Battlefield 1"),
    ("deeprockgalactic.exe", "Deep Rock Galactic"),
    ("palworld.exe", "Palworld"),
    ("helldivers2.exe", "Helldivers 2"),
    ("deadlock.exe", "Deadlock"),
    ("marvel_rivals.exe", "Marvel Rivals"),
    ("minecraft.exe", "Minecraft"),
    ("portal2.exe", "Portal 2"),
    ("hl2.exe", "Half-Life 2"),
];

/// Check running processes against the known-games list.
/// Returns the display name of the first match, or None.
#[command]
pub fn detect_active_game() -> Result<Option<String>, String> {
    let mut sys = System::new();
    sys.refresh_processes_specifics(
        ProcessesToUpdate::All,
        true,
        ProcessRefreshKind::nothing(),
    );

    for (_, process) in sys.processes() {
        let name_lower = process.name().to_string_lossy().to_lowercase();
        for (exe, game_name) in KNOWN_GAMES {
            if name_lower == *exe {
                return Ok(Some(game_name.to_string()));
            }
        }
    }
    Ok(None)
}

/// Query real-time GPU metrics via nvidia-smi.
/// Returns a stub with `is_nvidia: false` when nvidia-smi is not available.
#[command]
pub fn get_gpu_metrics() -> Result<GpuMetrics, String> {
    let output = std::process::Command::new("nvidia-smi")
        .args([
            "--query-gpu=name,temperature.gpu,utilization.gpu,utilization.memory,\
             memory.used,memory.total,power.draw,power.limit,power.max_limit",
            "--format=csv,noheader,nounits",
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .output();

    match output {
        Ok(out) if out.status.success() => {
            let text = String::from_utf8_lossy(&out.stdout);
            let line = text.lines().next().unwrap_or("").trim();
            let p: Vec<&str> = line.split(',').map(|s| s.trim()).collect();

            if p.len() >= 9 {
                Ok(GpuMetrics {
                    name: p[0].to_string(),
                    temperature_c: p[1].parse().unwrap_or(0.0),
                    gpu_util_pct: p[2].parse().unwrap_or(0.0),
                    mem_util_pct: p[3].parse().unwrap_or(0.0),
                    mem_used_mb: p[4].parse().unwrap_or(0),
                    mem_total_mb: p[5].parse().unwrap_or(0),
                    power_draw_w: p[6].parse().unwrap_or(0.0),
                    power_limit_w: p[7].parse().unwrap_or(0.0),
                    power_max_limit_w: p[8].parse().unwrap_or(0.0),
                    is_nvidia: true,
                })
            } else {
                Err("Unexpected nvidia-smi output format".to_string())
            }
        }
        _ => Ok(GpuMetrics {
            name: "Non-NVIDIA / nvidia-smi not found".to_string(),
            temperature_c: 0.0,
            gpu_util_pct: 0.0,
            mem_util_pct: 0.0,
            mem_used_mb: 0,
            mem_total_mb: 0,
            power_draw_w: 0.0,
            power_limit_w: 0.0,
            power_max_limit_w: 0.0,
            is_nvidia: false,
        }),
    }
}

/// Set the GPU power limit in watts via `nvidia-smi -i <index> -pl <watts>`.
/// Requires administrator privileges.
#[command]
pub fn set_gpu_power_limit(gpu_index: u32, watts: u32) -> Result<bool, String> {
    let output = std::process::Command::new("nvidia-smi")
        .args(["-i", &gpu_index.to_string(), "-pl", &watts.to_string()])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| e.to_string())?;
    Ok(output.status.success())
}

/// Return the built-in list of known game executables.
#[command]
pub fn list_known_games() -> Result<Vec<KnownGame>, String> {
    Ok(KNOWN_GAMES
        .iter()
        .map(|(exe, name)| KnownGame {
            exe: exe.to_string(),
            name: name.to_string(),
        })
        .collect())
}

/// Open the transparent gaming overlay window.
/// The overlay loads the same app bundle at `#gaming-overlay` so App.tsx
/// can render GamingOverlayPage instead of the full shell.
#[command]
pub fn show_gaming_overlay(app: AppHandle) -> Result<(), String> {
    // Already open — bring to front instead of reopening
    if let Some(win) = app.get_webview_window("gaming-overlay") {
        let _ = win.set_focus();
        return Ok(());
    }

    WebviewWindowBuilder::new(
        &app,
        "gaming-overlay",
        // PathBuf("#gaming-overlay") → resolves to devUrl/#gaming-overlay
        // (or asset://localhost/#gaming-overlay in production).
        WebviewUrl::App(std::path::PathBuf::from("#gaming-overlay")),
    )
    .title("WinOpt Overlay")
    .decorations(false)
    .transparent(true)
    .always_on_top(true)
    .skip_taskbar(true)
    .inner_size(340.0, 150.0)
    .position(20.0, 20.0)
    .resizable(false)
    .build()
    .map_err(|e| e.to_string())?;

    Ok(())
}

/// Close the gaming overlay window if it is open.
#[command]
pub fn hide_gaming_overlay(app: AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("gaming-overlay") {
        win.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}
