use serde::{Deserialize, Serialize};
use std::process::Stdio;
use tauri::command;
use tokio::process::Command;
use tokio::time::{timeout, Duration};

const INSTALL_TIMEOUT: Duration = Duration::from_secs(120);
const CHECK_TIMEOUT: Duration = Duration::from_secs(15);

// ── Return types ────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppInstallResult {
    pub success: bool,
    pub method: String, // "winget" | "chocolatey" | "none"
    pub output: String,
    pub error: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppCheckResult {
    pub installed: bool,
    pub method: String, // which package manager detected it
}

// ── Helper: run a command with timeout ──────────────────────────────────────

#[cfg(target_os = "windows")]
async fn run_cmd(
    program: &str,
    args: &[&str],
    time_limit: Duration,
) -> Result<(String, String, i32), String> {
    use std::os::windows::process::CommandExt;

    let mut child = Command::new(program)
        .args(args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .creation_flags(0x08000000) // CREATE_NO_WINDOW
        .spawn()
        .map_err(|e| format!("Failed to spawn {}: {}", program, e))?;

    let output = timeout(time_limit, child.wait_with_output())
        .await
        .map_err(|_| {
            let _ = child.start_kill();
            format!("{} timed out after {}s", program, time_limit.as_secs())
        })?
        .map_err(|e| format!("{} execution failed: {}", program, e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    let exit_code = output.status.code().unwrap_or(-1);

    Ok((stdout, stderr, exit_code))
}

#[cfg(not(target_os = "windows"))]
async fn run_cmd(
    _program: &str,
    _args: &[&str],
    _time_limit: Duration,
) -> Result<(String, String, i32), String> {
    Err("App installation is only supported on Windows.".to_string())
}

// ── Commands ────────────────────────────────────────────────────────────────

/// Check if Chocolatey is available on this system.
#[command]
pub async fn check_choco_available() -> Result<bool, String> {
    match run_cmd("choco", &["--version"], CHECK_TIMEOUT).await {
        Ok((_, _, code)) => Ok(code == 0),
        Err(_) => Ok(false),
    }
}

/// Check if an app is installed via winget.
#[command]
pub async fn check_app_installed(winget_id: String) -> Result<AppCheckResult, String> {
    // Sanitize
    if winget_id.contains('&')
        || winget_id.contains('|')
        || winget_id.contains(';')
        || winget_id.contains('>')
        || winget_id.contains('<')
    {
        return Err("Invalid characters in package ID.".to_string());
    }

    // Try winget first
    match run_cmd(
        "winget",
        &["list", "--id", &winget_id, "--accept-source-agreements"],
        CHECK_TIMEOUT,
    )
    .await
    {
        Ok((stdout, _, code)) => {
            if code == 0 && stdout.contains(&winget_id) {
                return Ok(AppCheckResult {
                    installed: true,
                    method: "winget".to_string(),
                });
            }
        }
        Err(_) => {} // winget not available or errored, continue
    }

    Ok(AppCheckResult {
        installed: false,
        method: "none".to_string(),
    })
}

/// Install an app using winget, falling back to Chocolatey if winget fails.
#[command]
pub async fn install_app(winget_id: String, choco_id: String) -> Result<AppInstallResult, String> {
    // Sanitize inputs
    for id in [&winget_id, &choco_id] {
        if id.contains('&')
            || id.contains('|')
            || id.contains(';')
            || id.contains('>')
            || id.contains('<')
        {
            return Err("Invalid characters in package ID.".to_string());
        }
    }

    // ── Attempt 1: winget ───────────────────────────────────────────────────
    match run_cmd(
        "winget",
        &[
            "install",
            "--id",
            &winget_id,
            "--accept-package-agreements",
            "--accept-source-agreements",
            "--silent",
        ],
        INSTALL_TIMEOUT,
    )
    .await
    {
        Ok((stdout, stderr, code)) => {
            if code == 0 {
                return Ok(AppInstallResult {
                    success: true,
                    method: "winget".to_string(),
                    output: stdout,
                    error: String::new(),
                });
            }
            // winget failed — log and try Chocolatey
            log::warn!(
                "winget install failed for {}: exit={}, stderr={}",
                winget_id,
                code,
                stderr
            );
        }
        Err(e) => {
            log::warn!("winget not available or errored: {}", e);
        }
    }

    // ── Attempt 2: Chocolatey ───────────────────────────────────────────────
    if choco_id.is_empty() {
        return Ok(AppInstallResult {
            success: false,
            method: "none".to_string(),
            output: String::new(),
            error: "winget install failed and no Chocolatey package ID provided.".to_string(),
        });
    }

    // Check if Chocolatey is available
    let choco_available = check_choco_available().await.unwrap_or(false);
    if !choco_available {
        return Ok(AppInstallResult {
            success: false,
            method: "none".to_string(),
            output: String::new(),
            error: "winget install failed. Chocolatey is not installed. Install Chocolatey from https://chocolatey.org/install to enable fallback.".to_string(),
        });
    }

    match run_cmd("choco", &["install", &choco_id, "-y"], INSTALL_TIMEOUT).await {
        Ok((stdout, stderr, code)) => {
            if code == 0 {
                Ok(AppInstallResult {
                    success: true,
                    method: "chocolatey".to_string(),
                    output: stdout,
                    error: String::new(),
                })
            } else {
                Ok(AppInstallResult {
                    success: false,
                    method: "chocolatey".to_string(),
                    output: stdout,
                    error: format!("Chocolatey install failed (exit {}): {}", code, stderr),
                })
            }
        }
        Err(e) => Ok(AppInstallResult {
            success: false,
            method: "chocolatey".to_string(),
            output: String::new(),
            error: e,
        }),
    }
}
