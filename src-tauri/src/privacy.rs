use serde::{Deserialize, Serialize};
use std::os::windows::process::CommandExt;
use std::process::Command;

const CREATE_NO_WINDOW: u32 = 0x08000000;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PrivacyIssue {
    pub id: String,
    pub category: String,
    pub title: String,
    pub severity: u32,
    pub description: String,
    pub fix_cmd: String,
    pub is_fixed: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PrivacyAuditResult {
    pub score: u32,
    pub issues: Vec<PrivacyIssue>,
}

fn all_issues() -> Vec<PrivacyIssue> {
    vec![
        PrivacyIssue {
            id: "diagtrack_svc".into(),
            category: "Telemetry".into(),
            title: "Diagnostics Tracking Service running".into(),
            severity: 3,
            description: "The DiagTrack service collects and sends diagnostic and usage data to Microsoft servers continuously.".into(),
            fix_cmd: "Stop-Service DiagTrack -Force -ErrorAction SilentlyContinue; Set-Service DiagTrack -StartupType Disabled -ErrorAction SilentlyContinue".into(),
            is_fixed: false,
        },
        PrivacyIssue {
            id: "telemetry_level".into(),
            category: "Telemetry".into(),
            title: "Telemetry level above Security (0)".into(),
            severity: 3,
            description: "Windows telemetry is configured to send usage and diagnostic data to Microsoft. Setting AllowTelemetry to 0 minimizes data collection to security-critical updates only.".into(),
            fix_cmd: "New-Item -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection' -Force -ErrorAction SilentlyContinue | Out-Null; Set-ItemProperty -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection' -Name AllowTelemetry -Value 0 -Type DWORD -Force".into(),
            is_fixed: false,
        },
        PrivacyIssue {
            id: "advertising_id".into(),
            category: "Registry".into(),
            title: "Advertising ID enabled".into(),
            severity: 2,
            description: "Windows uses an advertising ID to track app usage across sessions for personalized ads. Disabling it prevents cross-app behavioral tracking.".into(),
            fix_cmd: "New-Item -Path 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo' -Force -ErrorAction SilentlyContinue | Out-Null; Set-ItemProperty -Path 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo' -Name Enabled -Value 0 -Type DWORD -Force".into(),
            is_fixed: false,
        },
        PrivacyIssue {
            id: "activity_history".into(),
            category: "Registry".into(),
            title: "Activity History / Timeline enabled".into(),
            severity: 2,
            description: "Windows Timeline tracks your activity (apps, files, websites) and can sync it to the cloud. Disabling prevents this data from leaving your machine.".into(),
            fix_cmd: "New-Item -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\System' -Force -ErrorAction SilentlyContinue | Out-Null; Set-ItemProperty -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\System' -Name PublishUserActivities -Value 0 -Type DWORD -Force; Set-ItemProperty -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\System' -Name UploadUserActivities -Value 0 -Type DWORD -Force".into(),
            is_fixed: false,
        },
        PrivacyIssue {
            id: "cortana_search".into(),
            category: "Registry".into(),
            title: "Bing web search in Start Menu".into(),
            severity: 1,
            description: "Start menu searches are sent to Bing/Microsoft servers. Disabling this keeps all searches local and prevents query logging.".into(),
            fix_cmd: "New-Item -Path 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Search' -Force -ErrorAction SilentlyContinue | Out-Null; Set-ItemProperty -Path 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Search' -Name BingSearchEnabled -Value 0 -Type DWORD -Force; Set-ItemProperty -Path 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Search' -Name CortanaConsent -Value 0 -Type DWORD -Force".into(),
            is_fixed: false,
        },
        PrivacyIssue {
            id: "ceip_tasks".into(),
            category: "Telemetry".into(),
            title: "Customer Experience Improvement tasks active".into(),
            severity: 2,
            description: "Microsoft CEIP scheduled tasks collect software usage statistics and send them to Microsoft. Disabling stops this automatic background data collection.".into(),
            fix_cmd: "Get-ScheduledTask -TaskPath '\\Microsoft\\Windows\\Customer Experience Improvement Program\\' -ErrorAction SilentlyContinue | Disable-ScheduledTask -ErrorAction SilentlyContinue".into(),
            is_fixed: false,
        },
        PrivacyIssue {
            id: "wer_service".into(),
            category: "Services".into(),
            title: "Windows Error Reporting service running".into(),
            severity: 1,
            description: "WerSvc sends crash dumps and diagnostic data to Microsoft automatically. Disabling it prevents crash information from leaving your machine.".into(),
            fix_cmd: "Stop-Service WerSvc -Force -ErrorAction SilentlyContinue; Set-Service WerSvc -StartupType Disabled -ErrorAction SilentlyContinue".into(),
            is_fixed: false,
        },
        PrivacyIssue {
            id: "feedback_prompts".into(),
            category: "Registry".into(),
            title: "Windows feedback prompts enabled".into(),
            severity: 1,
            description: "Windows periodically shows feedback popups and collects usage data. Setting NumberOfSIUFInPeriod to 0 disables these prompts entirely.".into(),
            fix_cmd: "New-Item -Path 'HKCU:\\SOFTWARE\\Microsoft\\Siuf\\Rules' -Force -ErrorAction SilentlyContinue | Out-Null; Set-ItemProperty -Path 'HKCU:\\SOFTWARE\\Microsoft\\Siuf\\Rules' -Name NumberOfSIUFInPeriod -Value 0 -Type DWORD -Force".into(),
            is_fixed: false,
        },
        PrivacyIssue {
            id: "app_launch_tracking".into(),
            category: "Registry".into(),
            title: "App launch tracking enabled".into(),
            severity: 1,
            description: "Windows tracks which apps you launch to improve Start menu suggestions. Disabling this stops app usage data from being recorded.".into(),
            fix_cmd: "Set-ItemProperty -Path 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' -Name Start_TrackProgs -Value 0 -Type DWORD -Force".into(),
            is_fixed: false,
        },
    ]
}

fn run_ps(cmd: &str) -> String {
    Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", cmd])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .unwrap_or_default()
}

fn check_issue(issue: &PrivacyIssue) -> bool {
    match issue.id.as_str() {
        "diagtrack_svc" => {
            let s = run_ps("(Get-Service DiagTrack -ErrorAction SilentlyContinue).StartType");
            s.contains("Disabled")
        }
        "telemetry_level" => {
            let v = run_ps("(Get-ItemProperty -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection' -Name AllowTelemetry -ErrorAction SilentlyContinue).AllowTelemetry");
            v.trim() == "0"
        }
        "advertising_id" => {
            let v = run_ps("(Get-ItemProperty -Path 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo' -Name Enabled -ErrorAction SilentlyContinue).Enabled");
            v.trim() == "0"
        }
        "activity_history" => {
            let v = run_ps("(Get-ItemProperty -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\System' -Name PublishUserActivities -ErrorAction SilentlyContinue).PublishUserActivities");
            v.trim() == "0"
        }
        "cortana_search" => {
            let v = run_ps("(Get-ItemProperty -Path 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Search' -Name BingSearchEnabled -ErrorAction SilentlyContinue).BingSearchEnabled");
            v.trim() == "0"
        }
        "ceip_tasks" => {
            let v = run_ps("@(Get-ScheduledTask -TaskPath '\\Microsoft\\Windows\\Customer Experience Improvement Program\\' -ErrorAction SilentlyContinue | Where-Object State -eq 'Disabled').Count");
            v.trim().parse::<u32>().unwrap_or(0) > 0
        }
        "wer_service" => {
            let s = run_ps("(Get-Service WerSvc -ErrorAction SilentlyContinue).StartType");
            s.contains("Disabled")
        }
        "feedback_prompts" => {
            let v = run_ps("(Get-ItemProperty -Path 'HKCU:\\SOFTWARE\\Microsoft\\Siuf\\Rules' -Name NumberOfSIUFInPeriod -ErrorAction SilentlyContinue).NumberOfSIUFInPeriod");
            v.trim() == "0"
        }
        "app_launch_tracking" => {
            let v = run_ps("(Get-ItemProperty -Path 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' -Name Start_TrackProgs -ErrorAction SilentlyContinue).Start_TrackProgs");
            v.trim() == "0"
        }
        _ => false,
    }
}

fn compute_score(issues: &[PrivacyIssue]) -> u32 {
    let total: u32 = issues.iter().map(|i| i.severity).sum();
    let fixed: u32 = issues.iter().filter(|i| i.is_fixed).map(|i| i.severity).sum();
    if total == 0 {
        return 100;
    }
    ((fixed as f64 / total as f64) * 100.0).round() as u32
}

#[tauri::command]
pub fn scan_privacy_issues() -> Result<PrivacyAuditResult, String> {
    let issues: Vec<PrivacyIssue> = all_issues()
        .into_iter()
        .map(|mut issue| {
            issue.is_fixed = check_issue(&issue);
            issue
        })
        .collect();
    let score = compute_score(&issues);
    Ok(PrivacyAuditResult { score, issues })
}

#[tauri::command]
pub fn fix_privacy_issues(issue_ids: Vec<String>) -> Result<bool, String> {
    let issues = all_issues();
    let mut all_ok = true;
    for id in &issue_ids {
        if let Some(issue) = issues.iter().find(|i| &i.id == id) {
            let out = Command::new("powershell")
                .args(["-NoProfile", "-NonInteractive", "-Command", &issue.fix_cmd])
                .creation_flags(CREATE_NO_WINDOW)
                .output();
            match out {
                Ok(o) if !o.status.success() => {
                    eprintln!("Fix failed for {}: {}", id, String::from_utf8_lossy(&o.stderr));
                    all_ok = false;
                }
                Err(e) => {
                    eprintln!("Error fixing {}: {}", id, e);
                    all_ok = false;
                }
                _ => {}
            }
        }
    }
    Ok(all_ok)
}

#[tauri::command]
pub fn check_privacy_issue(issue_id: String) -> Result<bool, String> {
    let issues = all_issues();
    match issues.iter().find(|i| i.id == issue_id) {
        Some(issue) => Ok(check_issue(issue)),
        None => Err(format!("Unknown issue id: {}", issue_id)),
    }
}
