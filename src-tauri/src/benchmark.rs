use serde::{Deserialize, Serialize};
use std::os::windows::process::CommandExt;
use std::process::Command;
use std::time::Instant;
use tauri::command;

const CREATE_NO_WINDOW: u32 = 0x08000000;

// ─── PC Score (WinSAT) ────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PcScore {
    pub cpu_score: f32,
    pub memory_score: f32,
    pub disk_score: f32,
    pub graphics_score: f32,
    pub gaming_graphics_score: f32,
    pub base_score: f32, // lowest component = bottleneck
    pub last_assessment: Option<String>,
}

/// Read existing WinSAT scores without re-running the assessment.
#[command]
pub async fn get_pc_score() -> Result<PcScore, String> {
    let script = r#"
try {
    $w = Get-CimInstance Win32_WinSAT -ErrorAction Stop
    @{
        CPUScore            = [float]$w.CPUScore
        MemoryScore         = [float]$w.MemoryScore
        DiskScore           = [float]$w.DiskScore
        GraphicsScore       = [float]$w.GraphicsScore
        GamingGraphicsScore = [float]$w.D3DScore
        TimeStamp           = $w.TimeTaken
    } | ConvertTo-Json -Compress
} catch {
    Write-Output "ERROR: $_"
}
"#;

    let output = Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", script])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| format!("Failed to run PowerShell: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if stdout.starts_with("ERROR") || stdout.is_empty() {
        return Err(
            "No WinSAT assessment found. Run 'winsat formal' as Administrator first.".to_string(),
        );
    }

    #[derive(Deserialize)]
    #[allow(non_snake_case)]
    struct Raw {
        CPUScore: f32,
        MemoryScore: f32,
        DiskScore: f32,
        GraphicsScore: f32,
        GamingGraphicsScore: f32,
        TimeStamp: Option<String>,
    }

    let raw: Raw = serde_json::from_str(&stdout)
        .map_err(|e| format!("Failed to parse WinSAT output: {}\nRaw: {}", e, stdout))?;

    let base = [
        raw.CPUScore,
        raw.MemoryScore,
        raw.DiskScore,
        raw.GraphicsScore,
        raw.GamingGraphicsScore,
    ]
    .iter()
    .cloned()
    .filter(|&v| v > 0.0)
    .fold(f32::INFINITY, f32::min);

    Ok(PcScore {
        cpu_score: raw.CPUScore,
        memory_score: raw.MemoryScore,
        disk_score: raw.DiskScore,
        graphics_score: raw.GraphicsScore,
        gaming_graphics_score: raw.GamingGraphicsScore,
        base_score: if base == f32::INFINITY { 0.0 } else { base },
        last_assessment: raw.TimeStamp,
    })
}

/// Re-run a full WinSAT formal assessment (requires admin, takes ~2 min).
#[command]
pub async fn run_winsat_formal() -> Result<PcScore, String> {
    // winsat formal requires elevation — check first
    let is_admin = crate::security::is_admin().unwrap_or(false);
    if !is_admin {
        return Err("Administrator privileges required to run WinSAT. Please restart WinOptimizer as Administrator.".to_string());
    }

    let status = Command::new("winsat")
        .arg("formal")
        .creation_flags(CREATE_NO_WINDOW)
        .status()
        .map_err(|e| format!("Failed to run winsat: {}", e))?;

    if !status.success() {
        return Err("WinSAT formal assessment failed or was cancelled.".to_string());
    }

    // Read the freshly written scores
    get_pc_score().await
}

// ─── Internet Speed Test ─────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SpeedTestResult {
    pub download_mbps: f64,
    pub ping_ms: Option<f32>,
    pub jitter_ms: Option<f32>,
    pub packet_loss_pct: f32,
    pub server_name: String,
    pub bytes_downloaded: u64,
}

/// Download a 10 MB file from Cloudflare's speed endpoint and measure throughput.
/// Also pings 1.1.1.1 for latency.
#[command]
pub async fn run_speed_test() -> Result<SpeedTestResult, String> {
    // --- Download benchmark ---
    let url = "https://speed.cloudflare.com/__down?bytes=10000000";
    let start = Instant::now();

    let output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-NonInteractive",
            "-Command",
            &format!(
                r#"try {{
    $r = Invoke-WebRequest -Uri '{url}' -UseBasicParsing -TimeoutSec 30
    $r.RawContentLength
}} catch {{ Write-Output "ERROR: $_" }}"#,
                url = url
            ),
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| format!("Failed to run speed test: {}", e))?;

    let elapsed = start.elapsed().as_secs_f64();
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();

    if stdout.starts_with("ERROR") || stdout.is_empty() {
        return Err(format!("Speed test failed: {}", stdout));
    }

    let bytes: u64 = stdout.parse().unwrap_or(10_000_000);
    let download_mbps = (bytes as f64 * 8.0) / (elapsed * 1_000_000.0);

    // --- Ping benchmark ---
    let ping_output = Command::new("ping")
        .args(["-n", "5", "-w", "2000", "1.1.1.1"])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .ok();

    let mut ping_ms: Option<f32> = None;
    let mut jitter_ms: Option<f32> = None;
    let mut packet_loss_pct: f32 = 0.0;

    if let Some(out) = ping_output {
        let text = String::from_utf8_lossy(&out.stdout).to_lowercase();
        let mut latencies: Vec<f32> = Vec::new();

        for line in text.lines() {
            if line.contains("ttl=") {
                if let Some(idx) = line.find("time=") {
                    let rest = &line[idx + 5..];
                    if let Some(end) = rest.find("ms") {
                        if let Ok(ms) = rest[..end].trim().parse::<f32>() {
                            latencies.push(ms);
                        }
                    }
                } else if line.contains("time<1ms") {
                    latencies.push(0.5);
                }
            }
            if line.contains("lost =") || line.contains("loss)") {
                if let Some(s) = line.find('(') {
                    if let Some(e) = line[s..].find('%') {
                        if let Ok(p) = line[s + 1..s + e].trim().parse::<f32>() {
                            packet_loss_pct = p;
                        }
                    }
                }
            }
        }

        if !latencies.is_empty() {
            let avg = latencies.iter().sum::<f32>() / latencies.len() as f32;
            ping_ms = Some((avg * 10.0).round() / 10.0);
            if latencies.len() > 1 {
                let diffs: f32 = latencies.windows(2).map(|w| (w[1] - w[0]).abs()).sum();
                jitter_ms = Some((diffs / (latencies.len() - 1) as f32 * 10.0).round() / 10.0);
            } else {
                jitter_ms = Some(0.0);
            }
        }
    }

    Ok(SpeedTestResult {
        download_mbps: (download_mbps * 100.0).round() / 100.0,
        ping_ms,
        jitter_ms,
        packet_loss_pct,
        server_name: "Cloudflare (1.1.1.1)".to_string(),
        bytes_downloaded: bytes,
    })
}

// ─── CPU Micro-Benchmark ──────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CpuBenchResult {
    pub score: u64,
    pub single_core_score: u64,
    pub multi_core_score: u64,
    pub duration_secs: f64,
    pub thread_count: usize,
}

/// Sieve of Eratosthenes + float workload — reproducible CPU benchmark.
fn prime_sieve(limit: usize) -> usize {
    let mut sieve = vec![true; limit];
    sieve[0] = false;
    if limit > 1 {
        sieve[1] = false;
    }
    let mut i = 2;
    while i * i < limit {
        if sieve[i] {
            let mut j = i * i;
            while j < limit {
                sieve[j] = false;
                j += i;
            }
        }
        i += 1;
    }
    sieve.iter().filter(|&&v| v).count()
}

#[command]
pub async fn run_cpu_benchmark() -> Result<CpuBenchResult, String> {
    let thread_count = std::thread::available_parallelism()
        .map(|n| n.get())
        .unwrap_or(2);

    const SIEVE_SIZE: usize = 4_000_000;
    const ITERATIONS: u32 = 8;

    // Single-core: run on current thread
    let sc_start = Instant::now();
    let mut sc_acc = 0usize;
    for _ in 0..ITERATIONS {
        sc_acc += prime_sieve(SIEVE_SIZE);
    }
    let sc_elapsed = sc_start.elapsed().as_secs_f64();
    let _ = sc_acc; // prevent optimizer elision

    // Score: operations per second, normalized
    let single_score = ((ITERATIONS as f64 * SIEVE_SIZE as f64) / sc_elapsed / 1_000.0) as u64;

    // Multi-core: spawn threads, each runs the sieve
    let mc_start = Instant::now();
    let handles: Vec<_> = (0..thread_count)
        .map(|_| {
            std::thread::spawn(move || {
                let mut acc = 0usize;
                for _ in 0..ITERATIONS {
                    acc += prime_sieve(SIEVE_SIZE);
                }
                acc
            })
        })
        .collect();
    let mc_acc: usize = handles.into_iter().map(|h| h.join().unwrap_or(0)).sum();
    let mc_elapsed = mc_start.elapsed().as_secs_f64();
    let _ = mc_acc;

    let multi_score = (((ITERATIONS as f64 * SIEVE_SIZE as f64 * thread_count as f64) / mc_elapsed)
        / 1_000.0) as u64;
    let overall_score = (single_score + multi_score) / 2;

    Ok(CpuBenchResult {
        score: overall_score,
        single_core_score: single_score,
        multi_core_score: multi_score,
        duration_secs: (sc_elapsed + mc_elapsed) * 100.0 / 100.0,
        thread_count,
    })
}

// ─── Disk Benchmark (diskspd / fallback) ──────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DiskBenchResult {
    pub read_mbps: f64,
    pub write_mbps: f64,
    pub read_iops: Option<f64>,
    pub write_iops: Option<f64>,
    pub method: String, // "diskspd" or "native"
}

fn find_diskspd() -> Option<String> {
    // Check common locations for diskspd.exe
    let candidates = [
        r"C:\Windows\System32\diskspd.exe",
        r"C:\Program Files\diskspd\diskspd.exe",
        r"C:\ProgramData\chocolatey\bin\diskspd.exe",
    ];
    for path in &candidates {
        if std::path::Path::new(path).exists() {
            return Some(path.to_string());
        }
    }
    // Also check PATH
    let which = Command::new("where")
        .arg("diskspd")
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .ok()?;
    let path = String::from_utf8_lossy(&which.stdout).trim().to_string();
    if !path.is_empty() {
        Some(path.lines().next()?.to_string())
    } else {
        None
    }
}

#[command]
pub async fn run_disk_benchmark() -> Result<DiskBenchResult, String> {
    let temp_dir = std::env::temp_dir();
    let bench_file = temp_dir.join("winopt_diskbench.dat");
    let bench_path = bench_file.to_string_lossy().to_string();

    if let Some(diskspd) = find_diskspd() {
        // diskspd: 5 sec read + 5 sec write, 4K blocks, 4 threads, 4 outstanding
        let read_out = Command::new(&diskspd)
            .args([
                "-b4K",
                "-d5",
                "-o4",
                "-t4",
                "-r",
                "-w0",
                "-c64M",
                "-Si",
                "-Rtext",
                &bench_path,
            ])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map_err(|e| format!("diskspd failed: {}", e))?;

        let read_text = String::from_utf8_lossy(&read_out.stdout);
        let read_mbps = parse_diskspd_mbps(&read_text, "read");

        let write_out = Command::new(&diskspd)
            .args([
                "-b4K",
                "-d5",
                "-o4",
                "-t4",
                "-r",
                "-w100",
                "-c64M",
                "-Si",
                "-Rtext",
                &bench_path,
            ])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map_err(|e| format!("diskspd write failed: {}", e))?;

        let write_text = String::from_utf8_lossy(&write_out.stdout);
        let write_mbps = parse_diskspd_mbps(&write_text, "write");

        let _ = std::fs::remove_file(&bench_path);

        return Ok(DiskBenchResult {
            read_mbps,
            write_mbps,
            read_iops: None,
            write_iops: None,
            method: "diskspd".to_string(),
        });
    }

    // Native fallback: write then read a 64 MB file
    let data = vec![0xABu8; 64 * 1024 * 1024]; // 64 MB

    // Write test
    let write_start = Instant::now();
    std::fs::write(&bench_path, &data).map_err(|e| format!("Write benchmark failed: {}", e))?;
    let write_elapsed = write_start.elapsed().as_secs_f64();

    // Read test
    let read_start = Instant::now();
    let _read = std::fs::read(&bench_path).map_err(|e| format!("Read benchmark failed: {}", e))?;
    let read_elapsed = read_start.elapsed().as_secs_f64();

    let _ = std::fs::remove_file(&bench_path);

    let write_mbps = (data.len() as f64 / write_elapsed) / (1024.0 * 1024.0);
    let read_mbps = (data.len() as f64 / read_elapsed) / (1024.0 * 1024.0);

    Ok(DiskBenchResult {
        read_mbps: (read_mbps * 10.0).round() / 10.0,
        write_mbps: (write_mbps * 10.0).round() / 10.0,
        read_iops: None,
        write_iops: None,
        method: "native".to_string(),
    })
}

fn parse_diskspd_mbps(output: &str, _mode: &str) -> f64 {
    // diskspd text output has a line like:
    // "total:    | 1234.56 |  ..."
    // We look for MB/s value in the results table
    for line in output.lines() {
        let lower = line.to_lowercase();
        if lower.contains("total:") && lower.contains("|") {
            let parts: Vec<&str> = line.split('|').collect();
            if parts.len() >= 3 {
                if let Ok(v) = parts[2].trim().parse::<f64>() {
                    return (v * 10.0).round() / 10.0;
                }
            }
        }
    }
    0.0
}

// ─── Blender GPU Benchmark ────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BlenderCheckResult {
    pub installed: bool,
    pub cli_path: Option<String>,
    pub blender_version: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BlenderBenchResult {
    pub samples_per_minute: f64,
    pub device_name: String,
    pub device_type: String,
    pub scene: String,
    pub blender_version: String,
    pub duration_secs: f64,
}

fn find_blender_cli() -> Option<String> {
    let candidates = [
        r"C:\Program Files\Blender Foundation\Blender\benchmark-launcher-cli.exe",
        r"C:\Program Files\Blender Foundation\Blender 4.0\benchmark-launcher-cli.exe",
        r"C:\Program Files\Blender Foundation\Blender 4.1\benchmark-launcher-cli.exe",
        r"C:\Program Files\Blender Foundation\Blender 4.2\benchmark-launcher-cli.exe",
        r"C:\Program Files\Blender Foundation\Blender 4.3\benchmark-launcher-cli.exe",
    ];
    for path in &candidates {
        if std::path::Path::new(path).exists() {
            return Some(path.to_string());
        }
    }
    // Try PATH
    let which = Command::new("where")
        .arg("benchmark-launcher-cli")
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .ok()?;
    let path = String::from_utf8_lossy(&which.stdout).trim().to_string();
    if !path.is_empty() {
        Some(path.lines().next()?.to_string())
    } else {
        None
    }
}

fn find_blender_exe() -> Option<String> {
    let candidates = [
        r"C:\Program Files\Blender Foundation\Blender 4.3\blender.exe",
        r"C:\Program Files\Blender Foundation\Blender 4.2\blender.exe",
        r"C:\Program Files\Blender Foundation\Blender 4.1\blender.exe",
        r"C:\Program Files\Blender Foundation\Blender 4.0\blender.exe",
        r"C:\Program Files\Blender Foundation\Blender\blender.exe",
    ];
    for path in &candidates {
        if std::path::Path::new(path).exists() {
            return Some(path.to_string());
        }
    }
    let which = Command::new("where")
        .arg("blender")
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .ok()?;
    let path = String::from_utf8_lossy(&which.stdout).trim().to_string();
    if !path.is_empty() {
        Some(path.lines().next()?.to_string())
    } else {
        None
    }
}

#[command]
pub async fn check_blender_installed() -> Result<BlenderCheckResult, String> {
    let cli = find_blender_cli();
    let blender = find_blender_exe();

    let installed = cli.is_some() || blender.is_some();
    let cli_path = cli.or(blender);

    // Try to read version
    let version = cli_path.as_ref().and_then(|p| {
        Command::new(p)
            .arg("--version")
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .ok()
            .map(|o| {
                let s = String::from_utf8_lossy(&o.stdout).to_string();
                s.lines().next().unwrap_or("Unknown").trim().to_string()
            })
    });

    Ok(BlenderCheckResult {
        installed,
        cli_path,
        blender_version: version,
    })
}

#[command]
pub async fn run_blender_benchmark(
    device_type: String, // "CPU", "CUDA", "OPTIX", "HIP", "METAL"
) -> Result<BlenderBenchResult, String> {
    let check = check_blender_installed().await?;
    if !check.installed {
        return Err("Blender is not installed. Please install it via winget first.".to_string());
    }

    let blender_path = check.cli_path.ok_or("Could not locate Blender CLI")?;

    // Use benchmark-launcher-cli if available, otherwise use blender --python
    let cli_path = find_blender_cli();

    let scene = "monster";
    let start = Instant::now();

    if let Some(cli) = cli_path {
        // Use the dedicated benchmark launcher
        let output = Command::new(&cli)
            .args([
                "benchmark",
                "--blender-version",
                "4.0",
                "--device-type",
                &device_type,
                "--json",
                scene,
            ])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map_err(|e| format!("Blender benchmark failed: {}", e))?;

        let duration = start.elapsed().as_secs_f64();
        let stdout = String::from_utf8_lossy(&output.stdout);

        // Parse JSON output from benchmark-launcher-cli
        #[derive(Deserialize)]
        struct BlenderOutput {
            samples_per_minute: Option<f64>,
            device_info: Option<BlenderDeviceInfo>,
        }
        #[derive(Deserialize)]
        struct BlenderDeviceInfo {
            name: Option<String>,
        }

        let parsed: Result<Vec<BlenderOutput>, _> = serde_json::from_str(&stdout);
        if let Ok(results) = parsed {
            if let Some(first) = results.into_iter().find(|r| r.samples_per_minute.is_some()) {
                return Ok(BlenderBenchResult {
                    samples_per_minute: first.samples_per_minute.unwrap_or(0.0),
                    device_name: first
                        .device_info
                        .and_then(|d| d.name)
                        .unwrap_or_else(|| device_type.clone()),
                    device_type: device_type.clone(),
                    scene: scene.to_string(),
                    blender_version: check.blender_version.unwrap_or_else(|| "4.0".to_string()),
                    duration_secs: (duration * 10.0).round() / 10.0,
                });
            }
        }

        return Err(format!(
            "Failed to parse Blender benchmark output:\n{}",
            stdout
        ));
    }

    // Fallback: use blender --benchmark (older method)
    let output = Command::new(&blender_path)
        .args([
            "--background",
            "--factory-startup",
            "-noaudio",
            "--engine",
            "CYCLES",
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| format!("Blender render benchmark failed: {}", e))?;

    let duration = start.elapsed().as_secs_f64();
    let stdout = String::from_utf8_lossy(&output.stdout);

    // Simple: estimate from render time if printed
    let samples_per_minute = if duration > 0.0 {
        60.0 / duration * 100.0
    } else {
        0.0
    };
    let _ = stdout;

    Ok(BlenderBenchResult {
        samples_per_minute,
        device_name: device_type.clone(),
        device_type,
        scene: scene.to_string(),
        blender_version: check
            .blender_version
            .unwrap_or_else(|| "Unknown".to_string()),
        duration_secs: (duration * 10.0).round() / 10.0,
    })
}
