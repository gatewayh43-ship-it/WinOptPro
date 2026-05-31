use serde::{Deserialize, Serialize};
use std::fs;
use std::os::windows::process::CommandExt;
use std::path::PathBuf;
use std::process::Command;

const CREATE_NO_WINDOW: u32 = 0x08000000;
const TASK_ROOT: &str = "\\WinOpt\\";
const SOFTWARE_UPDATE_TASK: &str = "SoftwareAutoUpdate";
const SOFTWARE_UPDATE_DIR: &str = "WinOpt";
const SOFTWARE_UPDATE_SCRIPT: &str = "software-update.ps1";
const SOFTWARE_UPDATE_SETTINGS: &str = "software-update-settings.json";
const FEATURE_AUTOMATION_DIR: &str = "Automations";
const WEEKLY_TEMP_CLEANUP: &str = "Remove-Item -Path $env:TEMP\\* -Recurse -Force -ErrorAction SilentlyContinue; Remove-Item -Path C:\\Windows\\Temp\\* -Recurse -Force -ErrorAction SilentlyContinue";
const MONTHLY_DISK_SCAN: &str = "Get-WmiObject -Class Win32_DiskDrive | ForEach-Object { $status = $_.Status; Add-Content -Path $env:TEMP\\winopt-disk-health.log -Value \"$(Get-Date) $($_.Model) Status:$status\" }";

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MaintenanceTask {
    pub id: String,
    pub name: String,
    pub schedule: String,
    pub last_run: String,
    pub next_run: String,
    pub enabled: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SoftwareUpdateAutomationPackage {
    pub package_id: String,
    pub beta_package_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SoftwareUpdateAutomationSettings {
    pub enabled: bool,
    pub frequency: String,
    pub time: String,
    pub channel: String,
    pub scope: String,
    pub include_pinned: bool,
    pub allow_reboot: bool,
    pub packages: Vec<SoftwareUpdateAutomationPackage>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SoftwareUpdateAutomationState {
    pub settings: SoftwareUpdateAutomationSettings,
    pub task: Option<MaintenanceTask>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FeatureAutomationPreset {
    pub id: String,
    pub label: String,
    pub category: String,
    pub description: String,
    pub default_frequency: String,
    pub requires_admin: bool,
    pub risk: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FeatureAutomationConfig {
    pub id: String,
    pub enabled: bool,
    pub frequency: String,
    pub time: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FeatureAutomationState {
    pub preset: FeatureAutomationPreset,
    pub config: Option<FeatureAutomationConfig>,
    pub task: Option<MaintenanceTask>,
}

fn run_cmd(args: &[&str]) -> std::io::Result<std::process::Output> {
    Command::new("schtasks")
        .args(args)
        .creation_flags(CREATE_NO_WINDOW)
        .output()
}

fn run_ps(cmd: &str) -> String {
    Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", cmd])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .unwrap_or_default()
}

fn validate_task_name(name: &str) -> Result<(), String> {
    if name.is_empty() || name.len() > 64 {
        return Err("Task name must be 1-64 characters.".to_string());
    }
    if !name
        .chars()
        .all(|ch| ch.is_ascii_alphanumeric() || ch == '_' || ch == '-')
    {
        return Err("Task name may only contain letters, numbers, '-' and '_'.".to_string());
    }
    Ok(())
}

fn validate_package_id(id: &str) -> Result<String, String> {
    let clean = id.trim();
    if clean.is_empty() || clean.len() > 120 {
        return Err("Package ID must be 1-120 characters.".to_string());
    }
    if !clean
        .chars()
        .all(|ch| ch.is_ascii_alphanumeric() || matches!(ch, '.' | '_' | '-'))
    {
        return Err("Package ID contains unsupported characters.".to_string());
    }
    Ok(clean.to_string())
}

fn validate_schedule_time(time: &str) -> Result<String, String> {
    let parts: Vec<&str> = time.split(':').collect();
    if parts.len() != 2 {
        return Err("Time must use HH:mm format.".to_string());
    }
    let hour = parts[0]
        .parse::<u8>()
        .map_err(|_| "Hour must be a number.".to_string())?;
    let minute = parts[1]
        .parse::<u8>()
        .map_err(|_| "Minute must be a number.".to_string())?;
    if hour > 23 || minute > 59 {
        return Err("Time must be between 00:00 and 23:59.".to_string());
    }
    Ok(format!("{:02}:{:02}", hour, minute))
}

fn program_data_path(file_name: &str) -> Result<PathBuf, String> {
    let root = std::env::var("PROGRAMDATA").unwrap_or_else(|_| "C:\\ProgramData".to_string());
    let dir = PathBuf::from(root).join(SOFTWARE_UPDATE_DIR);
    match fs::create_dir_all(&dir) {
        Ok(_) => Ok(dir.join(file_name)),
        Err(program_data_error) => {
            let local_root = std::env::var("LOCALAPPDATA")
                .or_else(|_| std::env::var("TEMP"))
                .map_err(|_| format!("Failed to create WinOpt data directory: {}", program_data_error))?;
            let local_dir = PathBuf::from(local_root).join(SOFTWARE_UPDATE_DIR);
            fs::create_dir_all(&local_dir).map_err(|local_error| {
                format!(
                    "Failed to create WinOpt data directory in ProgramData ({}) or user profile ({})",
                    program_data_error, local_error
                )
            })?;
            Ok(local_dir.join(file_name))
        }
    }
}

fn automation_data_path(file_name: &str) -> Result<PathBuf, String> {
    let root = std::env::var("PROGRAMDATA").unwrap_or_else(|_| "C:\\ProgramData".to_string());
    let dir = PathBuf::from(root)
        .join(SOFTWARE_UPDATE_DIR)
        .join(FEATURE_AUTOMATION_DIR);
    fs::create_dir_all(&dir)
        .map_err(|e| format!("Failed to create automation directory: {}", e))?;
    Ok(dir.join(file_name))
}

fn escape_ps_single(value: &str) -> String {
    value.replace('\'', "''")
}

fn normalize_automation_settings(
    settings: SoftwareUpdateAutomationSettings,
) -> Result<SoftwareUpdateAutomationSettings, String> {
    let frequency = match settings.frequency.as_str() {
        "DAILY" | "WEEKLY" | "MONTHLY" => settings.frequency,
        _ => return Err("Frequency must be DAILY, WEEKLY, or MONTHLY.".to_string()),
    };
    let channel = match settings.channel.as_str() {
        "stable" | "beta" => settings.channel,
        _ => return Err("Channel must be stable or beta.".to_string()),
    };
    let scope = match settings.scope.as_str() {
        "all" | "selected" => settings.scope,
        _ => return Err("Scope must be all or selected.".to_string()),
    };
    let time = validate_schedule_time(&settings.time)?;

    let packages: Vec<SoftwareUpdateAutomationPackage> = settings
        .packages
        .into_iter()
        .map(|pkg| {
            Ok(SoftwareUpdateAutomationPackage {
                package_id: validate_package_id(&pkg.package_id)?,
                beta_package_id: pkg
                    .beta_package_id
                    .map(|id| validate_package_id(&id))
                    .transpose()?,
            })
        })
        .collect::<Result<_, String>>()?;

    if scope == "selected" && packages.is_empty() {
        return Err("Select at least one package for selected-package automation.".to_string());
    }
    if channel == "beta" && !packages.iter().any(|pkg| pkg.beta_package_id.is_some()) {
        return Err("Beta automation requires at least one package with a known beta channel.".to_string());
    }

    Ok(SoftwareUpdateAutomationSettings {
        enabled: settings.enabled,
        frequency,
        time,
        channel,
        scope,
        include_pinned: settings.include_pinned,
        allow_reboot: settings.allow_reboot,
        packages,
    })
}

fn build_software_update_script(settings: &SoftwareUpdateAutomationSettings) -> String {
    let mut script = String::from(
        r#"$ErrorActionPreference = 'Continue'
$logDir = Join-Path $env:ProgramData 'WinOpt\Logs'
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$log = Join-Path $logDir 'software-updates.log'
function Write-WinOptLog([string]$message) {
  Add-Content -Path $log -Value "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $message"
}
$common = @('--silent', '--accept-package-agreements', '--accept-source-agreements', '--disable-interactivity', '--force')
"#,
    );

    if settings.include_pinned {
        script.push_str("$common += '--include-pinned'\n");
    }
    if settings.allow_reboot {
        script.push_str("$common += '--allow-reboot'\n");
    }

    script.push_str("Write-WinOptLog 'Starting software update automation.'\n");
    script.push_str("& winget source update --disable-interactivity 2>&1 | Tee-Object -FilePath $log -Append\n");

    if settings.scope == "all" && settings.channel == "stable" {
        script.push_str("& winget upgrade --all @common 2>&1 | Tee-Object -FilePath $log -Append\n");
    } else {
        for package in &settings.packages {
            let target = if settings.channel == "beta" {
                package.beta_package_id.as_ref().unwrap_or(&package.package_id)
            } else {
                &package.package_id
            };
            let target = escape_ps_single(target);
            if settings.channel == "beta" {
                script.push_str(&format!(
                    "Write-WinOptLog 'Installing beta channel {target}.'\n& winget install --id '{target}' -e @common 2>&1 | Tee-Object -FilePath $log -Append\n"
                ));
            } else {
                script.push_str(&format!(
                    "Write-WinOptLog 'Upgrading {target}.'\n& winget upgrade --id '{target}' -e @common 2>&1 | Tee-Object -FilePath $log -Append\n"
                ));
            }
        }
    }

    script.push_str("Write-WinOptLog 'Software update automation finished.'\n");
    script
}

fn software_update_task_path() -> String {
    format!("{}\\{}", TASK_ROOT.trim_end_matches('\\'), SOFTWARE_UPDATE_TASK)
}

fn feature_task_name(id: &str) -> String {
    format!("Feature_{}", id)
}

fn feature_task_path(id: &str) -> String {
    format!(
        "{}\\{}",
        TASK_ROOT.trim_end_matches('\\'),
        feature_task_name(id)
    )
}

fn feature_automation_presets() -> Vec<FeatureAutomationPreset> {
    vec![
        FeatureAutomationPreset {
            id: "storage-temp-cleanup".into(),
            label: "Temp File Cleanup".into(),
            category: "Storage".into(),
            description: "Clears user temp, Windows temp, and safe cache leftovers.".into(),
            default_frequency: "WEEKLY".into(),
            requires_admin: true,
            risk: "Low".into(),
        },
        FeatureAutomationPreset {
            id: "storage-trim".into(),
            label: "SSD TRIM Optimization".into(),
            category: "Storage".into(),
            description: "Runs Optimize-Volume -ReTrim on fixed SSD volumes.".into(),
            default_frequency: "WEEKLY".into(),
            requires_admin: true,
            risk: "Low".into(),
        },
        FeatureAutomationPreset {
            id: "defender-signatures".into(),
            label: "Defender Signature Updates".into(),
            category: "Security".into(),
            description: "Refreshes Microsoft Defender malware definitions.".into(),
            default_frequency: "DAILY".into(),
            requires_admin: true,
            risk: "Low".into(),
        },
        FeatureAutomationPreset {
            id: "defender-quick-scan".into(),
            label: "Defender Quick Scan".into(),
            category: "Security".into(),
            description: "Starts a Windows Defender quick scan and logs the result.".into(),
            default_frequency: "WEEKLY".into(),
            requires_admin: true,
            risk: "Low".into(),
        },
        FeatureAutomationPreset {
            id: "disk-health-snapshot".into(),
            label: "Disk Health Snapshot".into(),
            category: "Storage".into(),
            description: "Exports physical disk health and reliability counters.".into(),
            default_frequency: "WEEKLY".into(),
            requires_admin: false,
            risk: "None".into(),
        },
        FeatureAutomationPreset {
            id: "driver-inventory".into(),
            label: "Driver Inventory".into(),
            category: "Drivers".into(),
            description: "Exports signed/unsigned PnP driver state for auditing.".into(),
            default_frequency: "MONTHLY".into(),
            requires_admin: false,
            risk: "None".into(),
        },
        FeatureAutomationPreset {
            id: "startup-inventory".into(),
            label: "Startup App Inventory".into(),
            category: "Startup".into(),
            description: "Exports registry and Startup folder launch entries.".into(),
            default_frequency: "WEEKLY".into(),
            requires_admin: false,
            risk: "None".into(),
        },
        FeatureAutomationPreset {
            id: "process-snapshot".into(),
            label: "Top Process Snapshot".into(),
            category: "Processes".into(),
            description: "Logs the busiest processes by CPU and memory usage.".into(),
            default_frequency: "DAILY".into(),
            requires_admin: false,
            risk: "None".into(),
        },
        FeatureAutomationPreset {
            id: "network-health-check".into(),
            label: "Network Health Check".into(),
            category: "Network".into(),
            description: "Pings common DNS endpoints and logs latency/loss.".into(),
            default_frequency: "DAILY".into(),
            requires_admin: false,
            risk: "None".into(),
        },
        FeatureAutomationPreset {
            id: "battery-health-snapshot".into(),
            label: "Battery Health Report".into(),
            category: "Power".into(),
            description: "Generates a Windows battery report when supported.".into(),
            default_frequency: "MONTHLY".into(),
            requires_admin: false,
            risk: "None".into(),
        },
        FeatureAutomationPreset {
            id: "wsl-status-snapshot".into(),
            label: "WSL Status Snapshot".into(),
            category: "WSL".into(),
            description: "Logs WSL status, version, and installed distributions.".into(),
            default_frequency: "WEEKLY".into(),
            requires_admin: false,
            risk: "None".into(),
        },
        FeatureAutomationPreset {
            id: "system-inventory-report".into(),
            label: "System Inventory Report".into(),
            category: "Reports".into(),
            description: "Exports hardware, OS, BIOS, and installed software inventory.".into(),
            default_frequency: "MONTHLY".into(),
            requires_admin: false,
            risk: "None".into(),
        },
        FeatureAutomationPreset {
            id: "privacy-baseline-check".into(),
            label: "Privacy Baseline Check".into(),
            category: "Privacy".into(),
            description: "Logs telemetry, advertising ID, activity history, and CEIP task state.".into(),
            default_frequency: "WEEKLY".into(),
            requires_admin: false,
            risk: "None".into(),
        },
    ]
}

fn feature_preset(id: &str) -> Option<FeatureAutomationPreset> {
    feature_automation_presets()
        .into_iter()
        .find(|preset| preset.id == id)
}

fn feature_script_body(id: &str) -> Option<String> {
    let common_header = format!(
        r#"$ErrorActionPreference = 'Continue'
$root = Join-Path $env:ProgramData 'WinOpt\AutomationLogs'
New-Item -ItemType Directory -Path $root -Force | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$log = Join-Path $root '{}.log'
function Write-WinOptLog([string]$message) {{
  Add-Content -Path $log -Value "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $message"
}}
Write-WinOptLog 'Starting automation.'
"#,
        id
    );

    let body = match id {
        "storage-temp-cleanup" => r#"
$paths = @($env:TEMP, "$env:WINDIR\Temp", "$env:LOCALAPPDATA\Microsoft\Windows\Explorer")
foreach ($path in $paths) {
  if (Test-Path $path) {
    Write-WinOptLog "Cleaning $path"
    Get-ChildItem -LiteralPath $path -Force -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -like 'thumbcache_*' -or $path -notlike '*\Explorer' } |
      Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
  }
}
try { Clear-RecycleBin -Force -ErrorAction SilentlyContinue } catch {}
"#,
        "storage-trim" => r#"
Get-Volume | Where-Object DriveType -eq 'Fixed' | ForEach-Object {
  try {
    Write-WinOptLog "Running TRIM on $($_.DriveLetter):"
    Optimize-Volume -DriveLetter $_.DriveLetter -ReTrim -Verbose 2>&1 | Tee-Object -FilePath $log -Append
  } catch { Write-WinOptLog $_.Exception.Message }
}
"#,
        "defender-signatures" => r#"
Update-MpSignature 2>&1 | Tee-Object -FilePath $log -Append
"#,
        "defender-quick-scan" => r#"
Start-MpScan -ScanType QuickScan 2>&1 | Tee-Object -FilePath $log -Append
"#,
        "disk-health-snapshot" => r#"
$out = Join-Path $root "disk-health-$stamp.json"
$result = Get-PhysicalDisk | ForEach-Object {
  $counter = $null
  try { $counter = Get-StorageReliabilityCounter -PhysicalDisk $_ -ErrorAction SilentlyContinue } catch {}
  [pscustomobject]@{
    FriendlyName = $_.FriendlyName
    MediaType = $_.MediaType
    HealthStatus = $_.HealthStatus
    Size = $_.Size
    Wear = if ($counter) { $counter.Wear } else { $null }
    Temperature = if ($counter) { $counter.Temperature } else { $null }
    ReadErrorsTotal = if ($counter) { $counter.ReadErrorsTotal } else { $null }
    WriteErrorsTotal = if ($counter) { $counter.WriteErrorsTotal } else { $null }
  }
}
$result | ConvertTo-Json -Depth 4 | Out-File -FilePath $out -Encoding UTF8 -Force
Write-WinOptLog "Wrote $out"
"#,
        "driver-inventory" => r#"
$out = Join-Path $root "drivers-$stamp.csv"
Get-CimInstance Win32_PnPSignedDriver |
  Select-Object DeviceName, Manufacturer, DriverVersion, DriverDate, IsSigned, InfName |
  Export-Csv -Path $out -NoTypeInformation -Force
Write-WinOptLog "Wrote $out"
"#,
        "startup-inventory" => r#"
$out = Join-Path $root "startup-$stamp.json"
$items = @()
$runKeys = @(
  'HKLM:\Software\Microsoft\Windows\CurrentVersion\Run',
  'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
)
foreach ($key in $runKeys) {
  if (Test-Path $key) {
    $props = Get-ItemProperty $key
    foreach ($prop in $props.PSObject.Properties | Where-Object { $_.Name -notlike 'PS*' }) {
      $items += [pscustomobject]@{ Source = $key; Name = $prop.Name; Command = [string]$prop.Value }
    }
  }
}
$startupFolders = @([Environment]::GetFolderPath('Startup'), "$env:ProgramData\Microsoft\Windows\Start Menu\Programs\Startup")
foreach ($folder in $startupFolders) {
  if (Test-Path $folder) {
    Get-ChildItem $folder -Force -ErrorAction SilentlyContinue | ForEach-Object {
      $items += [pscustomobject]@{ Source = $folder; Name = $_.Name; Command = $_.FullName }
    }
  }
}
$items | ConvertTo-Json -Depth 4 | Out-File -FilePath $out -Encoding UTF8 -Force
Write-WinOptLog "Wrote $out"
"#,
        "process-snapshot" => r#"
$out = Join-Path $root "processes-$stamp.csv"
Get-Process |
  Sort-Object CPU -Descending |
  Select-Object -First 40 ProcessName, Id, CPU, WorkingSet64, StartTime |
  Export-Csv -Path $out -NoTypeInformation -Force
Write-WinOptLog "Wrote $out"
"#,
        "network-health-check" => r#"
$out = Join-Path $root "network-health-$stamp.json"
$targets = @('1.1.1.1', '8.8.8.8', 'dns.google')
$results = foreach ($target in $targets) {
  $pings = Test-Connection -TargetName $target -Count 4 -ErrorAction SilentlyContinue
  [pscustomobject]@{
    Target = $target
    Sent = 4
    Received = @($pings).Count
    LossPercent = if (@($pings).Count -eq 0) { 100 } else { [math]::Round((4 - @($pings).Count) / 4 * 100, 2) }
    AverageMs = if (@($pings).Count -gt 0) { [math]::Round((@($pings) | Measure-Object -Property Latency -Average).Average, 2) } else { $null }
  }
}
$results | ConvertTo-Json -Depth 4 | Out-File -FilePath $out -Encoding UTF8 -Force
Write-WinOptLog "Wrote $out"
"#,
        "battery-health-snapshot" => r#"
$out = Join-Path $root "battery-report-$stamp.html"
powercfg /batteryreport /output $out 2>&1 | Tee-Object -FilePath $log -Append
"#,
        "wsl-status-snapshot" => r#"
$out = Join-Path $root "wsl-status-$stamp.txt"
try {
  wsl --status | Out-File -FilePath $out -Encoding UTF8 -Force
  "`n--- Distros ---`n" | Add-Content -Path $out
  wsl --list --verbose | Add-Content -Path $out
  Write-WinOptLog "Wrote $out"
} catch { Write-WinOptLog $_.Exception.Message }
"#,
        "system-inventory-report" => r#"
$out = Join-Path $root "system-inventory-$stamp.json"
$payload = [pscustomobject]@{
  Computer = Get-CimInstance Win32_ComputerSystem | Select-Object Manufacturer, Model, TotalPhysicalMemory
  OS = Get-CimInstance Win32_OperatingSystem | Select-Object Caption, Version, BuildNumber, InstallDate, LastBootUpTime
  BIOS = Get-CimInstance Win32_BIOS | Select-Object Manufacturer, SMBIOSBIOSVersion, ReleaseDate
  CPU = Get-CimInstance Win32_Processor | Select-Object Name, NumberOfCores, NumberOfLogicalProcessors
  Apps = Get-ItemProperty HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*, HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\* -ErrorAction SilentlyContinue |
    Where-Object DisplayName |
    Select-Object DisplayName, DisplayVersion, Publisher, InstallDate
}
$payload | ConvertTo-Json -Depth 5 | Out-File -FilePath $out -Encoding UTF8 -Force
Write-WinOptLog "Wrote $out"
"#,
        "privacy-baseline-check" => r#"
$out = Join-Path $root "privacy-baseline-$stamp.json"
$read = {
  param($Path, $Name)
  try { (Get-ItemProperty -Path $Path -Name $Name -ErrorAction Stop).$Name } catch { $null }
}
$tasks = @(
  '\Microsoft\Windows\Application Experience\Microsoft Compatibility Appraiser',
  '\Microsoft\Windows\Customer Experience Improvement Program\Consolidator',
  '\Microsoft\Windows\Customer Experience Improvement Program\UsbCeip'
)
$payload = [pscustomobject]@{
  AllowTelemetry = & $read 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection' 'AllowTelemetry'
  AdvertisingIdDisabled = & $read 'HKCU:\Software\Microsoft\Windows\CurrentVersion\AdvertisingInfo' 'Enabled'
  ActivityUploadDisabled = & $read 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\System' 'UploadUserActivities'
  TailoredExperiencesDisabled = & $read 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Privacy' 'TailoredExperiencesWithDiagnosticDataEnabled'
  CeipTasks = foreach ($task in $tasks) {
    $info = schtasks /Query /TN $task /FO CSV 2>$null | ConvertFrom-Csv
    [pscustomobject]@{ Task = $task; Status = $info.Status }
  }
}
$payload | ConvertTo-Json -Depth 5 | Out-File -FilePath $out -Encoding UTF8 -Force
Write-WinOptLog "Wrote $out"
"#,
        _ => return None,
    };

    Some(format!(
        "{}\n{}\nWrite-WinOptLog 'Automation finished.'\n",
        common_header, body
    ))
}

fn normalize_feature_automation_config(
    config: FeatureAutomationConfig,
) -> Result<FeatureAutomationConfig, String> {
    if feature_preset(&config.id).is_none() {
        return Err("Unknown automation preset.".to_string());
    }
    validate_task_name(&feature_task_name(&config.id))?;
    let frequency = match config.frequency.as_str() {
        "DAILY" | "WEEKLY" | "MONTHLY" => config.frequency,
        _ => return Err("Frequency must be DAILY, WEEKLY, or MONTHLY.".to_string()),
    };
    let time = validate_schedule_time(&config.time)?;
    Ok(FeatureAutomationConfig {
        id: config.id,
        enabled: config.enabled,
        frequency,
        time,
    })
}

fn feature_config_path(id: &str) -> Result<PathBuf, String> {
    automation_data_path(&format!("{}.json", id))
}

fn feature_script_path(id: &str) -> Result<PathBuf, String> {
    automation_data_path(&format!("{}.ps1", id))
}

fn predefined_action(name: &str) -> Option<&'static str> {
    match name {
        "WeeklyTempCleanup" => Some(WEEKLY_TEMP_CLEANUP),
        "MonthlyDiskScan" => Some(MONTHLY_DISK_SCAN),
        _ => None,
    }
}

#[tauri::command]
pub fn list_maintenance_tasks() -> Result<Vec<MaintenanceTask>, String> {
    let script = r#"
$tasks = Get-ScheduledTask -TaskPath '\WinOpt\' -ErrorAction SilentlyContinue
if (-not $tasks) { '[]'; return }
$result = @()
foreach ($t in $tasks) {
    $info = $t | Get-ScheduledTaskInfo -ErrorAction SilentlyContinue
    $trigger = $t.Triggers | Select-Object -First 1
    $schedule = if ($trigger) { $trigger.CimClass.CimClassName -replace 'MSFT_Task', '' } else { 'Unknown' }
    $result += [pscustomobject]@{
        id       = $t.TaskName
        name     = $t.TaskName
        schedule = $schedule
        last_run = if ($info.LastRunTime) { $info.LastRunTime.ToString('yyyy-MM-dd HH:mm') } else { 'Never' }
        next_run = if ($info.NextRunTime) { $info.NextRunTime.ToString('yyyy-MM-dd HH:mm') } else { 'N/A' }
        enabled  = ($t.State -ne 'Disabled')
    }
}
if ($result.Count -eq 0) { '[]' } else { $result | ConvertTo-Json -Compress }
"#;
    let out = run_ps(script);
    if out.is_empty() || out == "null" {
        return Ok(vec![]);
    }
    if out.starts_with('{') {
        let single: MaintenanceTask =
            serde_json::from_str(&out).map_err(|e| format!("Parse error: {}", e))?;
        return Ok(vec![single]);
    }
    serde_json::from_str::<Vec<MaintenanceTask>>(&out)
        .map_err(|e| format!("Parse error: {} — raw: {}", e, &out[..out.len().min(300)]))
}

#[tauri::command]
pub fn create_maintenance_task(
    name: String,
    schedule: String,
    action_cmd: String,
) -> Result<bool, String> {
    validate_task_name(&name)?;
    let action_cmd = predefined_action(&name)
        .filter(|expected| *expected == action_cmd)
        .ok_or_else(|| "Only predefined maintenance tasks can be scheduled.".to_string())?;

    let task_path = format!("{}\\{}", TASK_ROOT.trim_end_matches('\\'), name);
    // Delete existing task with same name first (ignore errors)
    run_cmd(&["/Delete", "/TN", &task_path, "/F"]).ok();

    let ps_action = format!(
        "powershell.exe -NoProfile -NonInteractive -WindowStyle Hidden -Command \"{}\"",
        action_cmd
    );

    let sc_flag = match schedule.as_str() {
        "WEEKLY" => "WEEKLY",
        "MONTHLY" => "MONTHLY",
        "DAILY" => "DAILY",
        _ => "WEEKLY",
    };

    let output = run_cmd(&[
        "/Create", "/TN", &task_path, "/TR", &ps_action, "/SC", sc_flag, "/ST", "03:00", "/RL",
        "HIGHEST", "/F",
    ])
    .map_err(|e| format!("Failed to create task: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("schtasks failed: {}", stderr));
    }
    Ok(true)
}

#[tauri::command]
pub fn delete_maintenance_task(name: String) -> Result<bool, String> {
    validate_task_name(&name)?;
    let task_path = format!("{}\\{}", TASK_ROOT.trim_end_matches('\\'), name);
    let output = run_cmd(&["/Delete", "/TN", &task_path, "/F"])
        .map_err(|e| format!("Failed to delete task: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("schtasks delete failed: {}", stderr));
    }
    Ok(true)
}

#[tauri::command]
pub fn run_maintenance_task_now(name: String) -> Result<bool, String> {
    validate_task_name(&name)?;
    let task_path = format!("{}\\{}", TASK_ROOT.trim_end_matches('\\'), name);
    let output =
        run_cmd(&["/Run", "/TN", &task_path]).map_err(|e| format!("Failed to run task: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("schtasks run failed: {}", stderr));
    }
    Ok(true)
}

#[tauri::command]
pub fn get_software_update_automation() -> Result<Option<SoftwareUpdateAutomationState>, String> {
    let settings_path = program_data_path(SOFTWARE_UPDATE_SETTINGS)?;
    if !settings_path.exists() {
        return Ok(None);
    }

    let settings_json = fs::read_to_string(&settings_path)
        .map_err(|e| format!("Failed to read automation settings: {}", e))?;
    let settings: SoftwareUpdateAutomationSettings = serde_json::from_str(&settings_json)
        .map_err(|e| format!("Failed to parse automation settings: {}", e))?;
    let task = list_maintenance_tasks()?
        .into_iter()
        .find(|task| task.name == SOFTWARE_UPDATE_TASK);

    Ok(Some(SoftwareUpdateAutomationState { settings, task }))
}

#[tauri::command]
pub fn configure_software_update_automation(
    settings: SoftwareUpdateAutomationSettings,
) -> Result<bool, String> {
    let settings = normalize_automation_settings(settings)?;
    let script_path = program_data_path(SOFTWARE_UPDATE_SCRIPT)?;
    let settings_path = program_data_path(SOFTWARE_UPDATE_SETTINGS)?;

    let script = build_software_update_script(&settings);
    fs::write(&script_path, script)
        .map_err(|e| format!("Failed to write automation script: {}", e))?;
    fs::write(
        &settings_path,
        serde_json::to_string_pretty(&settings)
            .map_err(|e| format!("Failed to serialize automation settings: {}", e))?,
    )
    .map_err(|e| format!("Failed to write automation settings: {}", e))?;

    let task_path = software_update_task_path();
    run_cmd(&["/Delete", "/TN", &task_path, "/F"]).ok();

    if !settings.enabled {
        return Ok(true);
    }

    let ps_action = format!(
        "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \"{}\"",
        script_path.display()
    );

    let output = run_cmd(&[
        "/Create",
        "/TN",
        &task_path,
        "/TR",
        &ps_action,
        "/SC",
        &settings.frequency,
        "/ST",
        &settings.time,
        "/RL",
        "HIGHEST",
        "/F",
    ])
    .map_err(|e| format!("Failed to create software update task: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("schtasks failed: {}", stderr));
    }

    Ok(true)
}

#[tauri::command]
pub fn delete_software_update_automation() -> Result<bool, String> {
    let task_path = software_update_task_path();
    run_cmd(&["/Delete", "/TN", &task_path, "/F"]).ok();

    if let Ok(path) = program_data_path(SOFTWARE_UPDATE_SETTINGS) {
        fs::remove_file(path).ok();
    }
    if let Ok(path) = program_data_path(SOFTWARE_UPDATE_SCRIPT) {
        fs::remove_file(path).ok();
    }

    Ok(true)
}

#[tauri::command]
pub fn list_feature_automation_presets() -> Result<Vec<FeatureAutomationPreset>, String> {
    Ok(feature_automation_presets())
}

#[tauri::command]
pub fn list_feature_automations() -> Result<Vec<FeatureAutomationState>, String> {
    let tasks = list_maintenance_tasks()?;
    let states = feature_automation_presets()
        .into_iter()
        .map(|preset| {
            let config = feature_config_path(&preset.id)
                .ok()
                .and_then(|path| fs::read_to_string(path).ok())
                .and_then(|json| serde_json::from_str::<FeatureAutomationConfig>(&json).ok());
            let task_name = feature_task_name(&preset.id);
            let task = tasks.iter().find(|task| task.name == task_name).cloned();
            FeatureAutomationState {
                preset,
                config,
                task,
            }
        })
        .collect();
    Ok(states)
}

#[tauri::command]
pub fn configure_feature_automation(config: FeatureAutomationConfig) -> Result<bool, String> {
    let config = normalize_feature_automation_config(config)?;
    let script = feature_script_body(&config.id)
        .ok_or_else(|| "No script is available for this automation.".to_string())?;
    let script_path = feature_script_path(&config.id)?;
    let config_path = feature_config_path(&config.id)?;
    fs::write(&script_path, script)
        .map_err(|e| format!("Failed to write automation script: {}", e))?;
    fs::write(
        &config_path,
        serde_json::to_string_pretty(&config)
            .map_err(|e| format!("Failed to serialize automation config: {}", e))?,
    )
    .map_err(|e| format!("Failed to write automation config: {}", e))?;

    let task_path = feature_task_path(&config.id);
    run_cmd(&["/Delete", "/TN", &task_path, "/F"]).ok();
    if !config.enabled {
        return Ok(true);
    }

    let ps_action = format!(
        "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \"{}\"",
        script_path.display()
    );
    let output = run_cmd(&[
        "/Create",
        "/TN",
        &task_path,
        "/TR",
        &ps_action,
        "/SC",
        &config.frequency,
        "/ST",
        &config.time,
        "/RL",
        "HIGHEST",
        "/F",
    ])
    .map_err(|e| format!("Failed to create automation task: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("schtasks failed: {}", stderr));
    }

    Ok(true)
}

#[tauri::command]
pub fn delete_feature_automation(id: String) -> Result<bool, String> {
    if feature_preset(&id).is_none() {
        return Err("Unknown automation preset.".to_string());
    }
    let task_path = feature_task_path(&id);
    run_cmd(&["/Delete", "/TN", &task_path, "/F"]).ok();
    if let Ok(path) = feature_config_path(&id) {
        fs::remove_file(path).ok();
    }
    if let Ok(path) = feature_script_path(&id) {
        fs::remove_file(path).ok();
    }
    Ok(true)
}

#[tauri::command]
pub fn run_feature_automation_now(id: String) -> Result<bool, String> {
    if feature_preset(&id).is_none() {
        return Err("Unknown automation preset.".to_string());
    }
    let script_path = feature_script_path(&id)?;
    if !script_path.exists() {
        let script = feature_script_body(&id)
            .ok_or_else(|| "No script is available for this automation.".to_string())?;
        fs::write(&script_path, script)
            .map_err(|e| format!("Failed to write automation script: {}", e))?;
    }
    let output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            &script_path.to_string_lossy(),
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| format!("Failed to run automation: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Automation failed: {}", stderr));
    }
    Ok(true)
}
