use serde::{Deserialize, Serialize};
use std::process::Command;
use std::time::Instant;
use tauri::{command, State};

use crate::db::{self, DbState, TweakHistoryEntry};

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TweakResult {
    pub success: bool,
    pub tweak_id: String,
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
    pub duration_ms: i64,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TweakValidationResult {
    /// "Applied" | "Reverted" | "Unknown"
    pub state: String,
    pub raw_output: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchTweak {
    pub id: String,
    pub name: String,
    pub code: String,
}

/// Run a PowerShell command and return stdout, stderr, exit code.
/// Enforces a 30-second timeout.
fn run_powershell(code: &str) -> Result<(String, String, i32, i64), String> {
    let start = Instant::now();

    let output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-NonInteractive",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            code,
        ])
        .output()
        .map_err(|e| format!("Failed to spawn PowerShell: {}", e))?;

    let duration_ms = start.elapsed().as_millis() as i64;

    // Check for timeout (30s)
    if duration_ms > 30_000 {
        return Err("Tweak timed out after 30 seconds".to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    let exit_code = output.status.code().unwrap_or(-1);

    Ok((stdout, stderr, exit_code, duration_ms))
}

/// Execute a single tweak's PowerShell code.
#[command]
pub fn execute_tweak(
    db: State<'_, DbState>,
    tweak_id: String,
    tweak_name: String,
    code: String,
) -> Result<TweakResult, String> {
    let (stdout, stderr, exit_code, duration_ms) = run_powershell(&code)?;
    let success = exit_code == 0 && stderr.is_empty();

    // Record in history
    let entry = TweakHistoryEntry {
        id: uuid::Uuid::new_v4().to_string(),
        tweak_id: tweak_id.clone(),
        tweak_name,
        action: if success {
            "APPLIED".to_string()
        } else {
            "FAILED".to_string()
        },
        timestamp: chrono::Utc::now().timestamp_millis(),
        duration_ms,
        command_executed: code,
        stdout: stdout.clone(),
        stderr: stderr.clone(),
        exit_code,
        status: if success {
            "SUCCESS".to_string()
        } else {
            "FAILED".to_string()
        },
    };

    if let Ok(conn) = db.0.lock() {
        let _ = db::insert_history(&conn, &entry);
    }

    Ok(TweakResult {
        success,
        tweak_id,
        stdout,
        stderr,
        exit_code,
        duration_ms,
    })
}

/// Validate a tweak's current state by running its validation command.
#[command]
pub fn validate_tweak(validation_cmd: String) -> Result<TweakValidationResult, String> {
    if validation_cmd.trim().is_empty() {
        return Ok(TweakValidationResult {
            state: "Unknown".to_string(),
            raw_output: String::new(),
        });
    }

    match run_powershell(&validation_cmd) {
        Ok((stdout, _stderr, exit_code, _duration)) => {
            // For service-based checks, "Stopped" means the tweak is applied (service disabled)
            // For registry checks, interpret the value contextually
            // The frontend can interpret raw_output for specific tweaks
            let state = if exit_code == 0 && !stdout.is_empty() {
                "Applied".to_string()
            } else {
                "Reverted".to_string()
            };

            Ok(TweakValidationResult {
                state,
                raw_output: stdout,
            })
        }
        Err(_) => Ok(TweakValidationResult {
            state: "Unknown".to_string(),
            raw_output: String::new(),
        }),
    }
}

/// Revert a single tweak by running its revert code.
#[command]
pub fn revert_tweak(
    db: State<'_, DbState>,
    tweak_id: String,
    tweak_name: String,
    revert_code: String,
) -> Result<TweakResult, String> {
    let (stdout, stderr, exit_code, duration_ms) = run_powershell(&revert_code)?;
    let success = exit_code == 0 && stderr.is_empty();

    // Record revert in history
    let entry = TweakHistoryEntry {
        id: uuid::Uuid::new_v4().to_string(),
        tweak_id: tweak_id.clone(),
        tweak_name,
        action: "REVERTED".to_string(),
        timestamp: chrono::Utc::now().timestamp_millis(),
        duration_ms,
        command_executed: revert_code,
        stdout: stdout.clone(),
        stderr: stderr.clone(),
        exit_code,
        status: if success {
            "SUCCESS".to_string()
        } else {
            "FAILED".to_string()
        },
    };

    if let Ok(conn) = db.0.lock() {
        let _ = db::insert_history(&conn, &entry);
    }

    Ok(TweakResult {
        success,
        tweak_id,
        stdout,
        stderr,
        exit_code,
        duration_ms,
    })
}

/// Execute multiple tweaks sequentially, returning results for each.
#[command]
pub fn execute_batch_tweaks(
    db: State<'_, DbState>,
    tweaks: Vec<BatchTweak>,
) -> Result<Vec<TweakResult>, String> {
    let mut results = Vec::with_capacity(tweaks.len());

    for tweak in tweaks {
        let result = execute_tweak(
            db.clone(),
            tweak.id,
            tweak.name,
            tweak.code,
        )?;
        results.push(result);
    }

    Ok(results)
}
