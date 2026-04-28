use std::os::windows::process::CommandExt;
use serde::{Deserialize, Serialize};
use sysinfo::{ProcessRefreshKind, ProcessesToUpdate, System};
use tauri::{command, AppHandle, Manager, WebviewWindowBuilder, WebviewUrl, Emitter};

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
    pub vendor: String,       // "NVIDIA", "AMD", "Intel", "Unknown"
    pub is_supported: bool,   // true when we have real metrics
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct KnownGame {
    pub exe: String,
    pub name: String,
}

/// Executable names (lowercase) → display names for common games.
/// Sourced from Steam Top 1000 charts + PCGamingWiki process names.
const KNOWN_GAMES: &[(&str, &str)] = &[
    // ── Valve ────────────────────────────────────────────────────────────────
    ("cs2.exe",                            "Counter-Strike 2"),
    ("csgo.exe",                           "CS:GO"),
    ("dota2.exe",                          "Dota 2"),
    ("left4dead2.exe",                     "Left 4 Dead 2"),
    ("left4dead.exe",                      "Left 4 Dead"),
    ("tf_win64.exe",                       "Team Fortress 2"),
    ("portal2.exe",                        "Portal 2"),
    ("portal.exe",                         "Portal"),
    ("hl2.exe",                            "Half-Life 2"),
    ("hlvr.exe",                           "Half-Life: Alyx"),
    ("halflife.exe",                       "Half-Life"),

    // ── Battle Royale / Tactical Shooter ─────────────────────────────────────
    ("valorant-win64-shipping.exe",        "VALORANT"),
    ("fortniteclient-win64-shipping.exe",  "Fortnite"),
    ("r5apex.exe",                         "Apex Legends"),
    ("tslgame.exe",                        "PUBG: Battlegrounds"),
    ("deadlock.exe",                       "Deadlock"),
    ("thefinalsclient.exe",                "THE FINALS"),
    ("deltaforce-win64-shipping.exe",      "Delta Force"),
    ("arcraiders-win64-shipping.exe",      "ARC Raiders"),

    // ── FPS / Multiplayer Shooter ─────────────────────────────────────────────
    ("rainbowsix.exe",                     "Rainbow Six Siege"),
    ("overwatch.exe",                      "Overwatch 2"),
    ("destiny2.exe",                       "Destiny 2"),
    ("bf2042.exe",                         "Battlefield 2042"),
    ("bf1.exe",                            "Battlefield 1"),
    ("battlefieldv.exe",                   "Battlefield V"),
    ("bf4.exe",                            "Battlefield 4"),
    ("payday2_win32_release.exe",          "PAYDAY 2"),
    ("payday3-win64-shipping.exe",         "PAYDAY 3"),
    ("quakechampions.exe",                 "Quake Champions"),
    ("doom.exe",                           "DOOM (2016)"),
    ("doometernal.exe",                    "DOOM Eternal"),
    ("insurgency-win64-shipping.exe",      "Insurgency: Sandstorm"),
    ("squad-win64-shipping.exe",           "Squad"),
    ("mordhau.exe",                        "MORDHAU"),
    ("chivalry2-win64-shipping.exe",       "Chivalry 2"),
    ("hunt-win64-shipping.exe",            "Hunt: Showdown"),
    ("deeprockgalactic.exe",               "Deep Rock Galactic"),
    ("escapefromtarkov.exe",               "Escape from Tarkov"),
    ("arenabreakout-win64-shipping.exe",   "Arena Breakout: Infinite"),
    ("wh40k_sm2.exe",                      "Warhammer 40K: Space Marine 2"),
    ("stalker2-win64-shipping.exe",        "S.T.A.L.K.E.R. 2"),

    // ── Open World / Survival ─────────────────────────────────────────────────
    ("gta5.exe",                           "GTA V"),
    ("rdr2.exe",                           "Red Dead Redemption 2"),
    ("cyberpunk2077.exe",                  "Cyberpunk 2077"),
    ("witcher3.exe",                       "The Witcher 3"),
    ("rust.exe",                           "Rust"),
    ("valheim.exe",                        "Valheim"),
    ("dayz.exe",                           "DayZ"),
    ("7daystodie.exe",                     "7 Days to Die"),
    ("palworld.exe",                       "Palworld"),
    ("enshrouded.exe",                     "Enshrouded"),
    ("conansandbox-win64-shipping.exe",    "Conan Exiles"),
    ("grounded-win64-shipping.exe",        "Grounded"),
    ("arkascended.exe",                    "ARK: Survival Ascended"),
    ("shootergame.exe",                    "ARK: Survival Evolved"),
    ("nms.exe",                            "No Man's Sky"),
    ("projectzomboid64.exe",               "Project Zomboid"),
    ("longvinter-win64-shipping.exe",      "Longvinter"),
    ("icarus-win64-shipping.exe",          "ICARUS"),
    ("theforest.exe",                      "The Forest"),
    ("sonsoftheforest.exe",                "Sons of the Forest"),
    ("stranded-deep.exe",                  "Stranded Deep"),

    // ── Action RPG / Soulslike ────────────────────────────────────────────────
    ("eldenring.exe",                      "Elden Ring"),
    ("eldenringnightreign.exe",            "Elden Ring Nightreign"),
    ("sekiro.exe",                         "Sekiro: Shadows Die Twice"),
    ("darksoulsiii.exe",                   "Dark Souls III"),
    ("darksoulsremastered.exe",            "Dark Souls: Remastered"),
    ("armoredcore6.exe",                   "Armored Core VI"),
    ("godofwar.exe",                       "God of War"),
    ("monsterhunterwilds.exe",             "Monster Hunter Wilds"),
    ("monsterhunterworld.exe",             "Monster Hunter: World"),
    ("bg3.exe",                            "Baldur's Gate 3"),
    ("diablo4.exe",                        "Diablo IV"),
    ("kingdomcome.exe",                    "Kingdom Come: Deliverance"),
    ("kingdomcome2.exe",                   "Kingdom Come: Deliverance II"),
    ("jedisurvivorgame.exe",               "Star Wars Jedi: Survivor"),
    ("jedifallengame.exe",                 "Star Wars Jedi: Fallen Order"),
    ("hogwartslegacy-win64-shipping.exe",  "Hogwarts Legacy"),
    ("ghostoftsushima.exe",               "Ghost of Tsushima"),
    ("horizonzerodawn.exe",                "Horizon Zero Dawn"),
    ("horizonforbiddenwest.exe",           "Horizon Forbidden West"),
    ("returnal-win64-shipping.exe",        "Returnal"),
    ("ds.exe",                             "Death Stranding"),
    ("alanwake2.exe",                      "Alan Wake 2"),
    ("control_dx12.exe",                   "Control"),
    ("deathloop.exe",                      "Deathloop"),
    ("prey.exe",                           "Prey (2017)"),
    ("ghostrunner2.exe",                   "Ghostrunner 2"),
    ("dd2.exe",                            "Dragon's Dogma 2"),
    ("starfield.exe",                      "Starfield"),

    // ── Resident Evil series ──────────────────────────────────────────────────
    ("re2.exe",                            "Resident Evil 2"),
    ("re3.exe",                            "Resident Evil 3"),
    ("re4.exe",                            "Resident Evil 4"),
    ("re8.exe",                            "Resident Evil Village"),

    // ── Bethesda ──────────────────────────────────────────────────────────────
    ("fallout4.exe",                       "Fallout 4"),
    ("fallout76.exe",                      "Fallout 76"),
    ("skyrimse.exe",                       "The Elder Scrolls V: Skyrim SE"),
    ("oblivion.exe",                       "The Elder Scrolls IV: Oblivion"),

    // ── Ubisoft ───────────────────────────────────────────────────────────────
    ("acvalhalla.exe",                     "Assassin's Creed Valhalla"),
    ("acodyssey.exe",                      "Assassin's Creed Odyssey"),
    ("acorigins.exe",                      "Assassin's Creed Origins"),
    ("thedivision2.exe",                   "The Division 2"),
    ("farcry6.exe",                        "Far Cry 6"),
    ("farcry5.exe",                        "Far Cry 5"),

    // ── MMO / Live Service ────────────────────────────────────────────────────
    ("warframe.x64.exe",                   "Warframe"),
    ("genshinimpact.exe",                  "Genshin Impact"),
    ("starrail.exe",                       "Honkai: Star Rail"),
    ("wutheringwaves.exe",                 "Wuthering Waves"),
    ("ffxiv_dx11.exe",                     "Final Fantasy XIV Online"),
    ("eso64.exe",                          "Elder Scrolls Online"),
    ("gw2-64.exe",                         "Guild Wars 2"),
    ("lostark.exe",                        "Lost Ark"),
    ("newworld.exe",                       "New World"),
    ("blackdesert64.exe",                  "Black Desert Online"),
    ("throneandliberty.exe",               "Throne and Liberty"),
    ("brawlhalla.exe",                     "Brawlhalla"),
    ("rocketleague.exe",                   "Rocket League"),
    ("vrchat.exe",                         "VRChat"),

    // ── MOBA / Hero Shooter ───────────────────────────────────────────────────
    ("leagueclient.exe",                   "League of Legends"),
    ("leagueoflegends.exe",                "League of Legends"),
    ("aces.exe",                           "War Thunder"),
    ("deadbydaylight-win64-shipping.exe",  "Dead by Daylight"),
    ("helldivers2.exe",                    "Helldivers 2"),
    ("marvel_rivals.exe",                  "Marvel Rivals"),

    // ── Fighting ──────────────────────────────────────────────────────────────
    ("tekken8.exe",                        "Tekken 8"),
    ("mk1.exe",                            "Mortal Kombat 1"),
    ("sf6.exe",                            "Street Fighter 6"),
    ("dragonballfighterz.exe",             "Dragon Ball FighterZ"),

    // ── Strategy ─────────────────────────────────────────────────────────────
    ("stellaris.exe",                      "Stellaris"),
    ("hoi4.exe",                           "Hearts of Iron IV"),
    ("ck3.exe",                            "Crusader Kings III"),
    ("eu4.exe",                            "Europa Universalis IV"),
    ("vic3.exe",                           "Victoria 3"),
    ("civilizationvi.exe",                 "Civilization VI"),
    ("aoe2de.exe",                         "Age of Empires II: Definitive Edition"),
    ("aoe4.exe",                           "Age of Empires IV"),
    ("warhammer3.exe",                     "Total War: WARHAMMER III"),
    ("totalwar-warhammer2.exe",            "Total War: WARHAMMER II"),
    ("bannerlord.exe",                     "Mount & Blade II: Bannerlord"),
    ("factorio.exe",                       "Factorio"),
    ("rimworldwin64.exe",                  "RimWorld"),
    ("clanofthecloud.exe",                 "Manor Lords"),

    // ── Simulation / Racing ───────────────────────────────────────────────────
    ("eurotrucks2.exe",                    "Euro Truck Simulator 2"),
    ("amtrucks.exe",                       "American Truck Simulator"),
    ("beamng.drive.exe",                   "BeamNG.drive"),
    ("flightsimulator.exe",                "Microsoft Flight Simulator"),
    ("forzahorizon5.exe",                  "Forza Horizon 5"),
    ("ts4_x64.exe",                        "The Sims 4"),
    ("farming25.exe",                      "Farming Simulator 25"),
    ("fivem.exe",                          "FiveM"),
    ("elitebase.exe",                      "Elite Dangerous"),
    ("starcitizen.exe",                    "Star Citizen"),

    // ── City Builder / Management ─────────────────────────────────────────────
    ("citiesskylines2.exe",                "Cities: Skylines II"),
    ("planetcoaster2.exe",                 "Planet Coaster 2"),
    ("planetzoo.exe",                      "Planet Zoo"),
    ("jurassicworldevolution2.exe",        "Jurassic World Evolution 2"),

    // ── Survival Horror ───────────────────────────────────────────────────────
    ("phasmophobia.exe",                   "Phasmophobia"),
    ("lethalcompany.exe",                  "Lethal Company"),
    ("repo.exe",                           "R.E.P.O."),
    ("outlast2.exe",                       "Outlast 2"),
    ("outlast.exe",                        "Outlast"),
    ("amnesia.exe",                        "Amnesia: The Bunker"),

    // ── Sandbox / Crafting ────────────────────────────────────────────────────
    ("minecraft.exe",                      "Minecraft"),
    ("factorygame-win64-shipping.exe",     "Satisfactory"),
    ("7daystodie.exe",                     "7 Days to Die"),
    ("noita.exe",                          "Noita"),
    ("terraria.exe",                       "Terraria"),
    ("stardewvalley.exe",                  "Stardew Valley"),

    // ── Roguelike / Indie ─────────────────────────────────────────────────────
    ("hades.exe",                          "Hades"),
    ("hades2.exe",                         "Hades II"),
    ("hollow_knight.exe",                  "Hollow Knight"),
    ("silksong.exe",                       "Hollow Knight: Silksong"),
    ("isaac-ng.exe",                       "The Binding of Isaac: Rebirth"),
    ("ultrakill.exe",                      "ULTRAKILL"),
    ("riskofrain2.exe",                    "Risk of Rain 2"),
    ("deadcells.exe",                      "Dead Cells"),
    ("spelunky2.exe",                      "Spelunky 2"),
    ("gunfire_reborn.exe",                 "Gunfire Reborn"),
    ("voyager.exe",                        "Dave the Diver"),
    ("geometrydash.exe",                   "Geometry Dash"),
    ("balatro.exe",                        "Balatro"),
    ("slay_the_spire.exe",                 "Slay the Spire"),
    ("disco_elysium.exe",                  "Disco Elysium"),
    ("deepestfear-win64-shipping.exe",     "Deepest Fear"),

    // ── Narrative / Puzzle ────────────────────────────────────────────────────
    ("outerwilds.exe",                     "Outer Wilds"),
    ("returntomoria-win64-shipping.exe",   "The Lord of the Rings: Return to Moria"),
    ("pophead.exe",                        "Poppy Playtime"),

    // ── Sports ────────────────────────────────────────────────────────────────
    ("fm25.exe",                           "Football Manager 2025"),
    ("fm24.exe",                           "Football Manager 2024"),
    ("nba2k25.exe",                        "NBA 2K25"),
    ("wwe2k25.exe",                        "WWE 2K25"),
    ("efootball.exe",                      "eFootball"),
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

/// Detect GPU vendor from the display adapter name.
fn detect_vendor(name: &str) -> String {
    let lower = name.to_lowercase();
    if lower.contains("nvidia") || lower.contains("geforce") || lower.contains("quadro") || lower.contains("tesla") {
        "NVIDIA".to_string()
    } else if lower.contains("amd") || lower.contains("radeon") || lower.contains("rx ") || lower.contains("vega") {
        "AMD".to_string()
    } else if lower.contains("intel") || lower.contains("iris") || lower.contains("arc") {
        "Intel".to_string()
    } else {
        "Unknown".to_string()
    }
}

/// Query GPU info (name + VRAM) from WMI.
fn wmi_gpu_info() -> Option<(String, u64)> {
    let script = r#"$g = Get-CimInstance Win32_VideoController | Where-Object { $_.AdapterCompatibility -ne 'Microsoft' } | Select-Object -First 1; if ($g) { "$($g.Name)|$([math]::Round($g.AdapterRAM/1MB))" }"#;
    let out = std::process::Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", script])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .ok()?;
    let text = String::from_utf8_lossy(&out.stdout).trim().to_string();
    if text.is_empty() { return None; }
    let parts: Vec<&str> = text.splitn(2, '|').collect();
    let name = parts.first()?.trim().to_string();
    let vram_mb: u64 = parts.get(1).and_then(|v| v.trim().parse().ok()).unwrap_or(0);
    Some((name, vram_mb))
}

/// Read GPU utilisation % from Windows PDH GPU Engine counters.
/// This works for NVIDIA, AMD, and Intel on Windows 10+.
fn pdh_gpu_util() -> Option<f32> {
    let script = r#"try { $c = Get-Counter '\GPU Engine(*)\Utilization Percentage' -ErrorAction Stop; $vals = $c.CounterSamples | Where-Object { $_.InstanceName -match 'engtype_3d' } | Select-Object -ExpandProperty CookedValue; if ($vals) { [math]::Round(($vals | Measure-Object -Sum).Sum, 1) } else { $c.CounterSamples | Select-Object -ExpandProperty CookedValue | Measure-Object -Sum | Select-Object -ExpandProperty Sum } } catch { 0 }"#;
    let out = std::process::Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", script])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .ok()?;
    let text = String::from_utf8_lossy(&out.stdout).trim().to_string();
    let val: f32 = text.parse().ok()?;
    // Clamp to [0, 100]
    Some(val.clamp(0.0, 100.0))
}

/// Read GPU dedicated VRAM used from PDH counter (bytes → MB).
fn pdh_vram_used() -> Option<u64> {
    let script = r#"try { $c = Get-Counter '\GPU Process Memory(*)\Dedicated Usage' -ErrorAction Stop; [math]::Round(($c.CounterSamples | Select-Object -ExpandProperty CookedValue | Measure-Object -Sum).Sum / 1MB) } catch { 0 }"#;
    let out = std::process::Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", script])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .ok()?;
    let text = String::from_utf8_lossy(&out.stdout).trim().to_string();
    text.parse::<f64>().ok().map(|v| v as u64)
}

/// Read GPU temperature from WMI MSAcpi or OpenHardwareMonitor if available,
/// falling back to AMD-specific WMI provider.
fn query_gpu_temp(vendor: &str) -> Option<f32> {
    // Try AMD-specific WMI ADL first
    if vendor == "AMD" {
        let script = r#"try { $t = Get-WmiObject -Namespace root/OpenHardwareMonitor -Class Sensor -Filter \"SensorType='Temperature' AND Name LIKE '%GPU%'\" -ErrorAction Stop | Select-Object -First 1 -ExpandProperty Value; $t } catch { try { (Get-WmiObject -Namespace root/WMI -Class MSAcpi_ThermalZoneTemperature -ErrorAction Stop | Select-Object -First 1).CurrentTemperature / 10 - 273.15 } catch { '' } }"#;
        if let Some(t) = run_ps_float(script) { return Some(t); }
    }
    // Intel Arc temperature via OpenHardwareMonitor if installed
    if vendor == "Intel" {
        let script = r#"try { (Get-WmiObject -Namespace root/OpenHardwareMonitor -Class Sensor -Filter \"SensorType='Temperature' AND Name LIKE '%GPU%'\" -ErrorAction Stop | Select-Object -First 1).Value } catch { '' }"#;
        if let Some(t) = run_ps_float(script) { return Some(t); }
    }
    None
}

fn run_ps_float(script: &str) -> Option<f32> {
    let out = std::process::Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", script])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .ok()?;
    let text = String::from_utf8_lossy(&out.stdout).trim().to_string();
    text.parse().ok()
}

/// Query real-time GPU metrics.
/// Priority: nvidia-smi (NVIDIA) → PDH counters + WMI (AMD/Intel/other)
#[command]
pub fn get_gpu_metrics() -> Result<GpuMetrics, String> {
    // ── Try NVIDIA first ─────────────────────────────────────────────────────
    let nvidia_out = std::process::Command::new("nvidia-smi")
        .args([
            "--query-gpu=name,temperature.gpu,utilization.gpu,utilization.memory,\
             memory.used,memory.total,power.draw,power.limit,power.max_limit",
            "--format=csv,noheader,nounits",
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .output();

    if let Ok(out) = nvidia_out {
        if out.status.success() {
            let text = String::from_utf8_lossy(&out.stdout);
            let line = text.lines().next().unwrap_or("").trim();
            let p: Vec<&str> = line.split(',').map(|s| s.trim()).collect();
            if p.len() >= 9 {
                let name = p[0].to_string();
                return Ok(GpuMetrics {
                    vendor: detect_vendor(&name),
                    name,
                    temperature_c: p[1].parse().unwrap_or(0.0),
                    gpu_util_pct: p[2].parse().unwrap_or(0.0),
                    mem_util_pct: p[3].parse().unwrap_or(0.0),
                    mem_used_mb: p[4].parse().unwrap_or(0),
                    mem_total_mb: p[5].parse().unwrap_or(0),
                    power_draw_w: p[6].parse().unwrap_or(0.0),
                    power_limit_w: p[7].parse().unwrap_or(0.0),
                    power_max_limit_w: p[8].parse().unwrap_or(0.0),
                    is_nvidia: true,
                    is_supported: true,
                });
            }
        }
    }

    // ── AMD / Intel / other: use PDH + WMI ──────────────────────────────────
    // Run GPU util and VRAM queries in parallel threads since each takes ~1s
    let util_handle = std::thread::spawn(pdh_gpu_util);
    let vram_handle = std::thread::spawn(pdh_vram_used);
    let info = wmi_gpu_info();

    let gpu_util = util_handle.join().ok().flatten().unwrap_or(0.0);
    let vram_used_mb = vram_handle.join().ok().flatten().unwrap_or(0);

    let (name, vram_total_mb) = info.unwrap_or_else(|| ("Unknown GPU".to_string(), 0));
    let vendor = detect_vendor(&name);

    // Try to get temperature
    let temp = query_gpu_temp(&vendor).unwrap_or(0.0);

    // VRAM utilisation %
    let mem_util_pct = if vram_total_mb > 0 {
        ((vram_used_mb as f32 / vram_total_mb as f32) * 100.0).clamp(0.0, 100.0)
    } else {
        0.0
    };

    Ok(GpuMetrics {
        name,
        temperature_c: temp,
        gpu_util_pct: gpu_util,
        mem_util_pct,
        mem_used_mb: vram_used_mb,
        mem_total_mb: vram_total_mb,
        power_draw_w: 0.0,   // No universal way to query power without vendor SDK
        power_limit_w: 0.0,
        power_max_limit_w: 0.0,
        is_nvidia: false,
        vendor,
        is_supported: true,
    })
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

/// Get a quick CPU usage reading (two samples 200ms apart for accuracy).
#[command]
pub fn get_cpu_quick() -> Result<f32, String> {
    let mut sys = System::new();
    sys.refresh_cpu_usage();
    std::thread::sleep(std::time::Duration::from_millis(200));
    sys.refresh_cpu_usage();
    Ok(sys.global_cpu_usage())
}

/// Close the gaming overlay window if it is open.
#[command]
pub fn hide_gaming_overlay(app: AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("gaming-overlay") {
        win.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}

// ─── PresentMon FPS Counter ───────────────────────────────────────────────────

use std::sync::{Mutex, OnceLock};
use std::sync::atomic::{AtomicBool, Ordering};

static FPS_RUNNING: AtomicBool = AtomicBool::new(false);

static FPS_CHILD: OnceLock<Mutex<Option<std::process::Child>>> = OnceLock::new();

fn fps_child_mutex() -> &'static Mutex<Option<std::process::Child>> {
    FPS_CHILD.get_or_init(|| Mutex::new(None))
}

/// Resolved path where WinOpt stores PresentMon.exe
fn presentmon_path() -> std::path::PathBuf {
    let mut p = std::env::temp_dir();
    p.push("WinOptPro");
    let _ = std::fs::create_dir_all(&p);
    p.push("PresentMon.exe");
    p
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PresentMonStatus {
    pub installed: bool,
    pub path: Option<String>,
}

/// Check whether PresentMon.exe has already been downloaded.
#[command]
pub fn check_presentmon() -> Result<PresentMonStatus, String> {
    let path = presentmon_path();
    let installed = path.exists();
    Ok(PresentMonStatus {
        installed,
        path: if installed { Some(path.to_string_lossy().to_string()) } else { None },
    })
}

/// Download PresentMon v1.10.0 from GitHub releases into the WinOpt temp folder.
#[command]
pub async fn download_presentmon() -> Result<String, String> {
    let out_path = presentmon_path();
    if out_path.exists() {
        return Ok(out_path.to_string_lossy().to_string());
    }

    let url = "https://github.com/GameTechDev/PresentMon/releases/download/v1.10.0/PresentMon-1.10.0-x64.exe";
    let dest = out_path.to_string_lossy().to_string();

    let script = format!(
        r#"Invoke-WebRequest -Uri '{url}' -OutFile '{dest}' -UseBasicParsing
        if (Test-Path '{dest}') {{ 'OK' }} else {{ 'FAIL' }}"#,
        url = url,
        dest = dest.replace('\\', "\\\\")
    );

    let output = tokio::task::spawn_blocking(move || {
        std::process::Command::new("powershell")
            .args(["-NoProfile", "-NonInteractive", "-Command", &script])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
    })
    .await
    .map_err(|e| format!("Task error: {}", e))?
    .map_err(|e| format!("Failed to run PowerShell: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if stdout.contains("OK") {
        Ok(out_path.to_string_lossy().to_string())
    } else {
        Err(format!("Download failed: {}", stdout))
    }
}

/// Start PresentMon targeting the given game process name.
/// Emits `fps-update` events on the app with the current FPS.
#[command]
pub fn start_fps_counter(app: AppHandle, process_name: String) -> Result<(), String> {
    if FPS_RUNNING.load(Ordering::SeqCst) {
        return Ok(()); // already running
    }

    let pm_path = presentmon_path();
    if !pm_path.exists() {
        return Err("PresentMon not found. Please download it first.".to_string());
    }

    // PresentMon v1 flags: capture named process, CSV output to stdout
    let mut child = std::process::Command::new(&pm_path)
        .args([
            "-process_name", &process_name,
            "-output_stdout",
            "-no_top",
            "-stop_existing_session",
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::null())
        .spawn()
        .map_err(|e| format!("Failed to start PresentMon: {}", e))?;

    let stdout = child.stdout.take().ok_or("No stdout from PresentMon")?;

    // Store child handle so we can kill it later
    {
        let mut guard = fps_child_mutex()
            .lock()
            .map_err(|_| "FPS counter state lock is poisoned.".to_string())?;
        *guard = Some(child);
    }

    FPS_RUNNING.store(true, Ordering::SeqCst);

    // Spawn a reader thread
    std::thread::spawn(move || {
        use std::io::{BufRead, BufReader};
        let reader = BufReader::new(stdout);
        let mut fps_window: std::collections::VecDeque<f64> = std::collections::VecDeque::new();
        let mut header_skipped = false;

        for line in reader.lines() {
            if !FPS_RUNNING.load(Ordering::SeqCst) { break; }
            let Ok(line) = line else { break; };

            // Skip CSV header
            if !header_skipped {
                if line.starts_with("Application") { header_skipped = true; }
                continue;
            }

            // Parse msBetweenPresents (column index 11 in PresentMon v1 CSV)
            let cols: Vec<&str> = line.split(',').collect();
            if cols.len() > 11 {
                if let Ok(ms) = cols[11].trim().parse::<f64>() {
                    if ms > 0.0 && ms < 1000.0 {
                        fps_window.push_back(1000.0 / ms);
                        if fps_window.len() > 60 { fps_window.pop_front(); }

                        let avg_fps = fps_window.iter().sum::<f64>() / fps_window.len() as f64;
                        let fps_rounded = (avg_fps * 10.0).round() / 10.0;

                        // Emit to frontend
                        let _ = app.emit("fps-update", fps_rounded);
                    }
                }
            }
        }

        FPS_RUNNING.store(false, Ordering::SeqCst);
        let _ = app.emit("fps-update", -1.0f64); // signal stopped
    });

    Ok(())
}

/// Stop the running PresentMon FPS counter.
#[command]
pub fn stop_fps_counter() -> Result<(), String> {
    FPS_RUNNING.store(false, Ordering::SeqCst);
    let mut guard = fps_child_mutex()
        .lock()
        .map_err(|_| "FPS counter state lock is poisoned.".to_string())?;
    if let Some(mut child) = guard.take() {
        let _ = child.kill();
    }
    Ok(())
}
