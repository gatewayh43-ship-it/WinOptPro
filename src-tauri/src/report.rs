use std::os::windows::process::CommandExt;
use std::process::Command;

const CREATE_NO_WINDOW: u32 = 0x08000000;

fn run_ps(cmd: &str) -> String {
    Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", cmd])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .unwrap_or_default()
}

fn esc(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

#[tauri::command]
pub fn generate_system_report() -> Result<String, String> {
    // Gather data from PowerShell
    let os_info = run_ps(r#"
$os = Get-WmiObject Win32_OperatingSystem
$cs = Get-WmiObject Win32_ComputerSystem
$cpu = Get-WmiObject Win32_Processor | Select-Object -First 1
$gpu = Get-WmiObject Win32_VideoController | Select-Object -First 1
$bios = Get-WmiObject Win32_BIOS
$ram_gb = [math]::Round($cs.TotalPhysicalMemory / 1GB, 2)
$free_gb = [math]::Round($os.FreePhysicalMemory / 1MB, 2)
@{
    computer_name = $cs.Name
    os_name = $os.Caption
    os_version = $os.Version
    os_build = $os.BuildNumber
    cpu_name = $cpu.Name
    cpu_cores = $cpu.NumberOfCores
    cpu_logical = $cpu.NumberOfLogicalProcessors
    ram_gb = $ram_gb
    ram_free_gb = $free_gb
    gpu_name = if ($gpu) { $gpu.Name } else { 'N/A' }
    gpu_driver = if ($gpu) { $gpu.DriverVersion } else { 'N/A' }
    gpu_vram_mb = if ($gpu) { [math]::Round($gpu.AdapterRAM / 1MB) } else { 0 }
    bios_version = $bios.SMBIOSBIOSVersion
    last_boot = $os.LastBootUpTime
} | ConvertTo-Json -Compress
"#);

    let disks = run_ps(r#"
Get-WmiObject Win32_LogicalDisk -Filter "DriveType=3" |
    Select-Object DeviceID,
        @{N='size_gb';E={[math]::Round($_.Size/1GB,1)}},
        @{N='free_gb';E={[math]::Round($_.FreeSpace/1GB,1)}} |
    ConvertTo-Json -Compress
"#);

    let network = run_ps(r#"
Get-WmiObject Win32_NetworkAdapterConfiguration -Filter "IPEnabled=True" |
    Select-Object Description,
        @{N='ip';E={$_.IPAddress -join ', '}},
        @{N='mac';E={$_.MACAddress}} |
    ConvertTo-Json -Compress
"#);

    let startup = run_ps(r#"
$items = @()
$items += Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -ErrorAction SilentlyContinue |
    Get-Member -MemberType NoteProperty | Where-Object Name -notmatch '^PS' |
    ForEach-Object { @{ name=$_.Name; location='HKCU Run' } }
$items += Get-ItemProperty 'HKLM:\Software\Microsoft\Windows\CurrentVersion\Run' -ErrorAction SilentlyContinue |
    Get-Member -MemberType NoteProperty | Where-Object Name -notmatch '^PS' |
    ForEach-Object { @{ name=$_.Name; location='HKLM Run' } }
if ($items.Count -eq 0) { '[]' } else { $items | ConvertTo-Json -Compress }
"#);

    let top_procs = run_ps(r#"
Get-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First 15 |
    Select-Object Name, Id,
        @{N='mem_mb';E={[math]::Round($_.WorkingSet64/1MB,1)}},
        @{N='cpu';E={[math]::Round($_.CPU,1)}} |
    ConvertTo-Json -Compress
"#);

    // Parse OS info for display
    let os_val: serde_json::Value = serde_json::from_str(&os_info).unwrap_or(serde_json::json!({}));
    let disks_val: serde_json::Value = serde_json::from_str(&disks).unwrap_or(serde_json::json!([]));
    let net_val: serde_json::Value = serde_json::from_str(&network).unwrap_or(serde_json::json!([]));
    let startup_val: serde_json::Value =
        serde_json::from_str(&startup).unwrap_or(serde_json::json!([]));
    let procs_val: serde_json::Value =
        serde_json::from_str(&top_procs).unwrap_or(serde_json::json!([]));

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);

    fn str_val(v: &serde_json::Value, k: &str) -> String {
        v.get(k).and_then(|x| x.as_str()).unwrap_or("N/A").to_string()
    }
    fn num_val(v: &serde_json::Value, k: &str) -> String {
        v.get(k).map(|x| x.to_string()).unwrap_or_else(|| "N/A".into())
    }

    let disk_rows = {
        let arr = if disks_val.is_array() {
            disks_val.as_array().cloned().unwrap_or_default()
        } else {
            vec![disks_val.clone()]
        };
        arr.iter()
            .map(|d| {
                let id = str_val(d, "DeviceID");
                let size = num_val(d, "size_gb");
                let free = num_val(d, "free_gb");
                let used = d
                    .get("size_gb")
                    .and_then(|s| s.as_f64())
                    .zip(d.get("free_gb").and_then(|f| f.as_f64()))
                    .map(|(s, f)| format!("{:.1}", s - f))
                    .unwrap_or_else(|| "N/A".into());
                format!("<tr><td>{}</td><td>{} GB</td><td>{} GB</td><td>{} GB</td></tr>",
                    esc(&id), esc(&size), esc(&used), esc(&free))
            })
            .collect::<Vec<_>>()
            .join("\n")
    };

    let net_rows = {
        let arr = if net_val.is_array() {
            net_val.as_array().cloned().unwrap_or_default()
        } else {
            vec![net_val.clone()]
        };
        arr.iter()
            .map(|n| {
                let desc = str_val(n, "Description");
                let ip = str_val(n, "ip");
                let mac = str_val(n, "mac");
                format!("<tr><td>{}</td><td>{}</td><td>{}</td></tr>",
                    esc(&desc), esc(&ip), esc(&mac))
            })
            .collect::<Vec<_>>()
            .join("\n")
    };

    let startup_rows = {
        let arr = if startup_val.is_array() {
            startup_val.as_array().cloned().unwrap_or_default()
        } else {
            vec![startup_val.clone()]
        };
        if arr.is_empty() {
            "<tr><td colspan=\"2\">No startup items found</td></tr>".into()
        } else {
            arr.iter()
                .map(|s| {
                    let name = str_val(s, "name");
                    let loc = str_val(s, "location");
                    format!("<tr><td>{}</td><td>{}</td></tr>", esc(&name), esc(&loc))
                })
                .collect::<Vec<_>>()
                .join("\n")
        }
    };

    let proc_rows = {
        let arr = if procs_val.is_array() {
            procs_val.as_array().cloned().unwrap_or_default()
        } else {
            vec![procs_val.clone()]
        };
        arr.iter()
            .map(|p| {
                let name = str_val(p, "Name");
                let pid = num_val(p, "Id");
                let mem = num_val(p, "mem_mb");
                let cpu = num_val(p, "cpu");
                format!("<tr><td>{}</td><td>{}</td><td>{} MB</td><td>{} s</td></tr>",
                    esc(&name), esc(&pid), esc(&mem), esc(&cpu))
            })
            .collect::<Vec<_>>()
            .join("\n")
    };

    let html = format!(r#"<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>WinOpt Pro — System Report</title>
<style>
  body {{ font-family: Segoe UI, Arial, sans-serif; background: #0f0f1a; color: #e2e8f0; margin: 0; padding: 24px; }}
  h1 {{ font-size: 28px; font-weight: 900; margin-bottom: 4px; }}
  h1 span {{ color: #4318FF; }}
  .meta {{ color: #64748b; font-size: 13px; margin-bottom: 32px; }}
  h2 {{ font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; border-bottom: 1px solid #1e293b; padding-bottom: 8px; margin-top: 32px; }}
  .grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }}
  .card {{ background: #1e293b; border-radius: 10px; padding: 14px 18px; }}
  .card-label {{ font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px; }}
  .card-value {{ font-size: 15px; font-weight: 600; }}
  table {{ width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px; }}
  th {{ text-align: left; padding: 8px 12px; background: #1e293b; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; }}
  td {{ padding: 8px 12px; border-bottom: 1px solid #1e293b; }}
  tr:hover td {{ background: rgba(255,255,255,0.02); }}
  .footer {{ margin-top: 40px; font-size: 11px; color: #334155; text-align: center; }}
</style>
</head>
<body>
<h1>WinOpt <span>Pro</span> — System Report</h1>
<p class="meta">Generated: Unix timestamp {now} &nbsp;·&nbsp; {computer} &nbsp;·&nbsp; {os_name}</p>

<h2>Hardware Summary</h2>
<div class="grid">
  <div class="card"><div class="card-label">CPU</div><div class="card-value">{cpu}</div></div>
  <div class="card"><div class="card-label">CPU Cores / Threads</div><div class="card-value">{cores} cores / {threads} threads</div></div>
  <div class="card"><div class="card-label">RAM (Total / Free)</div><div class="card-value">{ram_total} GB / {ram_free} GB</div></div>
  <div class="card"><div class="card-label">GPU</div><div class="card-value">{gpu}</div></div>
  <div class="card"><div class="card-label">GPU Driver / VRAM</div><div class="card-value">{gpu_driver} / {gpu_vram} MB</div></div>
  <div class="card"><div class="card-label">OS Build</div><div class="card-value">{os_name_short} (Build {build})</div></div>
  <div class="card"><div class="card-label">BIOS Version</div><div class="card-value">{bios}</div></div>
</div>

<h2>Storage</h2>
<table>
  <thead><tr><th>Drive</th><th>Total</th><th>Used</th><th>Free</th></tr></thead>
  <tbody>{disk_rows}</tbody>
</table>

<h2>Network Adapters</h2>
<table>
  <thead><tr><th>Adapter</th><th>IP Address</th><th>MAC</th></tr></thead>
  <tbody>{net_rows}</tbody>
</table>

<h2>Startup Items</h2>
<table>
  <thead><tr><th>Name</th><th>Location</th></tr></thead>
  <tbody>{startup_rows}</tbody>
</table>

<h2>Top Processes by Memory</h2>
<table>
  <thead><tr><th>Name</th><th>PID</th><th>Memory</th><th>CPU Time</th></tr></thead>
  <tbody>{proc_rows}</tbody>
</table>

<div class="footer">Generated by WinOpt Pro · All data sourced locally · No data transmitted externally</div>
</body>
</html>"#,
        now = now,
        computer = esc(&str_val(&os_val, "computer_name")),
        os_name = esc(&str_val(&os_val, "os_name")),
        cpu = esc(&str_val(&os_val, "cpu_name")),
        cores = num_val(&os_val, "cpu_cores"),
        threads = num_val(&os_val, "cpu_logical"),
        ram_total = num_val(&os_val, "ram_gb"),
        ram_free = num_val(&os_val, "ram_free_gb"),
        gpu = esc(&str_val(&os_val, "gpu_name")),
        gpu_driver = esc(&str_val(&os_val, "gpu_driver")),
        gpu_vram = num_val(&os_val, "gpu_vram_mb"),
        os_name_short = esc(&str_val(&os_val, "os_name")),
        build = num_val(&os_val, "os_build"),
        bios = esc(&str_val(&os_val, "bios_version")),
        disk_rows = disk_rows,
        net_rows = net_rows,
        startup_rows = startup_rows,
        proc_rows = proc_rows,
    );

    Ok(html)
}

#[tauri::command]
pub fn save_system_report(path: String, html: String) -> Result<bool, String> {
    std::fs::write(&path, html).map_err(|e| format!("Failed to write report: {}", e))?;
    Ok(true)
}
