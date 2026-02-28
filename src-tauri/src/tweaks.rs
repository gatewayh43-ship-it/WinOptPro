use serde::{Deserialize, Serialize};
use std::process::Stdio;
use std::time::Instant;
use tauri::{command, State};
use tokio::process::Command;
use tokio::time::{timeout, Duration};

use crate::db::{self, DbState, TweakHistoryEntry};

const TWEAK_TIMEOUT: Duration = Duration::from_secs(30);

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

/// Run a PowerShell command with a proper async timeout.
/// If the timeout fires, the child process is killed immediately.
async fn run_powershell(code: &str) -> Result<(String, String, i32, i64), String> {
    let start = Instant::now();

    let mut child = Command::new("powershell")
        .args([
            "-NoProfile",
            "-NonInteractive",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            code,
        ])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true)
        .spawn()
        .map_err(|e| format!("Failed to spawn PowerShell: {}", e))?;

    let output = timeout(TWEAK_TIMEOUT, child.wait_with_output())
        .await
        .map_err(|_| "Tweak timed out after 30 seconds".to_string())?
        .map_err(|e| format!("PowerShell execution failed: {}", e))?;

    let duration_ms = start.elapsed().as_millis() as i64;
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    let exit_code = output.status.code().unwrap_or(-1);

    Ok((stdout, stderr, exit_code, duration_ms))
}

/// Execute a single tweak's PowerShell code.
#[command]
pub async fn execute_tweak(
    db: State<'_, DbState>,
    tweak_id: String,
    tweak_name: String,
    code: String,
) -> Result<TweakResult, String> {
    let (stdout, stderr, exit_code, duration_ms) = run_powershell(&code).await?;
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
pub async fn validate_tweak(validation_cmd: String) -> Result<TweakValidationResult, String> {
    if validation_cmd.trim().is_empty() {
        return Ok(TweakValidationResult {
            state: "Unknown".to_string(),
            raw_output: String::new(),
        });
    }

    match run_powershell(&validation_cmd).await {
        Ok((stdout, _stderr, exit_code, _duration)) => {
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
pub async fn revert_tweak(
    db: State<'_, DbState>,
    tweak_id: String,
    tweak_name: String,
    revert_code: String,
) -> Result<TweakResult, String> {
    let (stdout, stderr, exit_code, duration_ms) = run_powershell(&revert_code).await?;
    let success = exit_code == 0 && stderr.is_empty();

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
pub async fn execute_batch_tweaks(
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
        )
        .await?;
        results.push(result);
    }

    Ok(results)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_run_powershell_basic() {
        let result = run_powershell("Write-Output 'hello world'").await;
        assert!(result.is_ok());
        let (stdout, stderr, exit_code, duration_ms) = result.unwrap();
        assert_eq!(stdout, "hello world");
        assert!(stderr.is_empty());
        assert_eq!(exit_code, 0);
        assert!(duration_ms > 0);
    }

    #[tokio::test]
    async fn test_run_powershell_exit_code() {
        let result = run_powershell("exit 42").await;
        assert!(result.is_ok());
        let (_, _, exit_code, _) = result.unwrap();
        assert_eq!(exit_code, 42);
    }

    #[tokio::test]
    async fn test_run_powershell_stderr() {
        let result = run_powershell("Write-Error 'test error' -EA Continue").await;
        assert!(result.is_ok());
        let (_, stderr, _, _) = result.unwrap();
        assert!(!stderr.is_empty());
    }

    #[tokio::test]
    async fn test_tweak_result_serialization() {
        let result = TweakResult {
            success: true,
            tweak_id: "test".to_string(),
            stdout: "ok".to_string(),
            stderr: String::new(),
            exit_code: 0,
            duration_ms: 100,
        };
        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("tweakId")); // camelCase
        assert!(json.contains("durationMs"));
    }

    #[tokio::test]
    async fn test_batch_tweak_deserialization() {
        let json = r#"{"id":"test","name":"Test Tweak","code":"echo 1"}"#;
        let batch: BatchTweak = serde_json::from_str(json).unwrap();
        assert_eq!(batch.id, "test");
        assert_eq!(batch.name, "Test Tweak");
        assert_eq!(batch.code, "echo 1");
    }
}
