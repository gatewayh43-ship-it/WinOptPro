use serde::{Deserialize, Serialize};
use std::process::Stdio;
use tauri::command;
use tokio::process::Command;
use tokio::time::{timeout, Duration};

const ELEVATION_TIMEOUT: Duration = Duration::from_secs(60);

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ElevationResult {
    pub success: bool,
    pub output: String,
    pub error: String,
}

/// Check if the current process is running as Administrator.
#[command]
pub fn is_admin() -> Result<bool, String> {
    #[cfg(windows)]
    {
        use windows::Win32::UI::Shell::IsUserAnAdmin;
        // SAFETY: IsUserAnAdmin is a simple Win32 query with no unsafe memory access.
        Ok(unsafe { IsUserAnAdmin().as_bool() })
    }
    #[cfg(not(windows))]
    {
        Ok(false)
    }
}

/// Execute a PowerShell command with UAC elevation (RunAs).
/// Writes the script to a temp file, executes via ShellExecute "runas" verb,
/// and captures output.
#[command]
pub async fn elevate_and_execute(code: String) -> Result<ElevationResult, String> {
    #[cfg(windows)]
    {
        // Write the PowerShell code + result capture to a temp file
        let temp_dir = std::env::temp_dir();
        let script_id = uuid::Uuid::new_v4().to_string();
        let script_path = temp_dir.join(format!("winopt_{}.ps1", script_id));
        let output_path = temp_dir.join(format!("winopt_{}.out", script_id));
        let error_path = temp_dir.join(format!("winopt_{}.err", script_id));

        // Wrap the user code to capture output to files
        let wrapped_code = format!(
            r#"try {{
    $result = Invoke-Command -ScriptBlock {{ {} }}
    $result | Out-File -FilePath '{}' -Encoding UTF8 -Force
}} catch {{
    $_.Exception.Message | Out-File -FilePath '{}' -Encoding UTF8 -Force
    exit 1
}}"#,
            code,
            output_path.to_string_lossy().replace('\\', "\\\\"),
            error_path.to_string_lossy().replace('\\', "\\\\"),
        );

        std::fs::write(&script_path, &wrapped_code)
            .map_err(|e| format!("Failed to write temp script: {}", e))?;

        // Execute with elevated privileges using PowerShell Start-Process -Verb RunAs
        let child = Command::new("powershell")
            .args([
                "-NoProfile",
                "-NonInteractive",
                "-ExecutionPolicy",
                "Bypass",
                "-Command",
                &format!(
                    "Start-Process powershell -Verb RunAs -Wait -WindowStyle Hidden -ArgumentList '-NoProfile -NonInteractive -ExecutionPolicy Bypass -File \"{}\"'",
                    script_path.to_string_lossy()
                ),
            ])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .kill_on_drop(true)
            .spawn()
            .map_err(|e| format!("Failed to spawn elevated process: {}", e))?;

        let result = timeout(ELEVATION_TIMEOUT, child.wait_with_output())
            .await
            .map_err(|_| "Elevated command timed out after 60 seconds".to_string())?
            .map_err(|e| format!("Elevated command failed: {}", e))?;

        // Read output files
        let output = std::fs::read_to_string(&output_path).unwrap_or_default().trim().to_string();
        let error = std::fs::read_to_string(&error_path).unwrap_or_default().trim().to_string();
        let success = result.status.success() && error.is_empty();

        // Cleanup temp files
        let _ = std::fs::remove_file(&script_path);
        let _ = std::fs::remove_file(&output_path);
        let _ = std::fs::remove_file(&error_path);

        Ok(ElevationResult {
            success,
            output,
            error,
        })
    }

    #[cfg(not(windows))]
    {
        let _ = code;
        Ok(ElevationResult {
            success: false,
            output: String::new(),
            error: "UAC elevation is only supported on Windows.".to_string(),
        })
    }
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DefenderStatus {
    pub realtime_protection_enabled: bool,
    pub signature_out_of_date: bool,
    pub antivirus_signature_age: u32,
    pub quick_scan_age: u32,
    pub full_scan_age: u32,
}

#[command]
pub async fn defender_get_status() -> Result<DefenderStatus, String> {
    #[cfg(windows)]
    {
        let output = tokio::process::Command::new("powershell")
            .args([
                "-NoProfile",
                "-NonInteractive",
                "-Command",
                r#"
                $status = Get-MpComputerStatus
                @{
                    realtimeProtectionEnabled = [bool]$status.RealTimeProtectionEnabled
                    signatureOutOfDate = [bool]($status.AntivirusSignatureUpdateInProgress -eq $false -and $status.AntivirusSignatureAge -gt 14)
                    antivirusSignatureAge = if ($null -eq $status.AntivirusSignatureAge) { 0 } else { [uint32]$status.AntivirusSignatureAge }
                    quickScanAge = if ($null -eq $status.QuickScanAge) { 0 } else { [uint32]$status.QuickScanAge }
                    fullScanAge = if ($null -eq $status.FullScanAge) { 0 } else { [uint32]$status.FullScanAge }
                } | ConvertTo-Json
                "#,
            ])
            .output()
            .await
            .map_err(|e| format!("Failed to execute powershell: {}", e))?;

        if !output.status.success() {
            let err = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Failed to get Defender status: {}", err));
        }

        let json = String::from_utf8_lossy(&output.stdout);
        let status: DefenderStatus = serde_json::from_str(&json).map_err(|e| format!("JSON parsing error: {} - '{}'", e, json))?;
        Ok(status)
    }
    #[cfg(not(windows))]
    {
        Err("Windows Defender is only available on Windows.".to_string())
    }
}

#[command]
pub async fn defender_run_scan(scan_type: String) -> Result<String, String> {
    #[cfg(windows)]
    {
        let type_arg = if scan_type.to_lowercase() == "full" { "FullScan" } else { "QuickScan" };
        let code = format!("Start-MpScan -ScanType {}", type_arg);
        let res = elevate_and_execute(code).await?;
        if res.success {
            Ok("Scan started successfully.".to_string())
        } else {
            Err(res.error)
        }
    }
    #[cfg(not(windows))]
    {
        let _ = scan_type;
        Err("Windows Defender is only available on Windows.".to_string())
    }
}

#[command]
pub async fn defender_update_signatures() -> Result<String, String> {
    #[cfg(windows)]
    {
        let res = elevate_and_execute("Update-MpSignature".to_string()).await?;
        if res.success {
            Ok("Signatures updated successfully.".to_string())
        } else {
            Err(res.error)
        }
    }
    #[cfg(not(windows))]
    {
        Err("Windows Defender is only available on Windows.".to_string())
    }
}

#[command]
pub async fn defender_set_realtime(enabled: bool) -> Result<String, String> {
    #[cfg(windows)]
    {
        let val = if enabled { "$false" } else { "$true" };
        let code = format!("Set-MpPreference -DisableRealtimeMonitoring {}", val);
        let res = elevate_and_execute(code).await?;
        if res.success {
            Ok("Real-time protection setting updated.".to_string())
        } else {
            Err(res.error)
        }
    }
    #[cfg(not(windows))]
    {
        let _ = enabled;
        Err("Windows Defender is only available on Windows.".to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_admin_returns_bool() {
        // Should not panic regardless of elevation state
        let result = is_admin();
        assert!(result.is_ok());
    }

    #[test]
    fn test_elevation_result_serialization() {
        let result = ElevationResult {
            success: true,
            output: "ok".to_string(),
            error: String::new(),
        };
        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("success"));
        assert!(json.contains("output"));
    }
}
