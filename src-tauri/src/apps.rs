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

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WingetSearchResult {
    pub id: String,
    pub name: String,
    pub version: String,
    pub match_type: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WingetAppInfo {
    pub id: String,
    pub name: String,
    pub publisher: String,
    pub description: String,
    pub homepage: String,
    pub version: String,
    pub tags: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppScrapeMetadata {
    pub screenshots: Vec<String>,
    pub github_url: Option<String>,
    pub social_links: Vec<String>,
    pub alternative_downloads: Vec<String>,
}

// ── Helper: run a command with timeout ──────────────────────────────────────

#[cfg(target_os = "windows")]
async fn run_cmd(
    program: &str,
    args: &[&str],
    time_limit: Duration,
) -> Result<(String, String, i32), String> {


    let mut child = Command::new(program)
        .args(args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true)
        .creation_flags(0x08000000) // CREATE_NO_WINDOW
        .spawn()
        .map_err(|e| format!("Failed to spawn {}: {}", program, e))?;

    let output = timeout(time_limit, child.wait_with_output())
        .await
        .map_err(|_| format!("{} timed out after {}s", program, time_limit.as_secs()))?
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

#[command]
pub async fn search_winget(query: String) -> Result<Vec<WingetSearchResult>, String> {
    // Sanitize query to avoid command execution injections
    let clean_query = query.replace(&['&', '|', ';', '>', '<', '"', '\''][..], "");
    if clean_query.is_empty() {
        return Ok(Vec::new());
    }

    match run_cmd(
        "winget",
        &["search", &clean_query, "--accept-source-agreements"],
        CHECK_TIMEOUT,
    )
    .await
    {
        Ok((stdout, _, code)) => {
            if code != 0 {
                return Ok(Vec::new());
            }

            // Simple parser for winget search output
            let mut results = Vec::new();
            let lines: Vec<&str> = stdout.lines().collect();
            // Output usually has a header like:
            // Name Id Version Match Source
            // ----------------------------------------------------
            let mut past_header = false;
            for line in lines {
                if line.starts_with("---") {
                    past_header = true;
                    continue;
                }
                if !past_header || line.trim().is_empty() {
                    continue;
                }

                // Split line by at least 2 spaces
                let parts: Vec<&str> = line.split("  ").filter(|s| !s.is_empty()).map(|s| s.trim()).collect();
                if parts.len() >= 3 {
                    results.push(WingetSearchResult {
                        name: parts[0].to_string(),
                        id: parts[1].to_string(),
                        version: parts[2].to_string(),
                        match_type: if parts.len() > 3 { parts[3].to_string() } else { "".to_string() },
                    });
                }
            }
            Ok(results)
        }
        Err(e) => Err(e),
    }
}

#[command]
pub async fn get_winget_info(id: String) -> Result<WingetAppInfo, String> {
    let clean_id = id.replace(&['&', '|', ';', '>', '<', '"', '\''][..], "");
    
    match run_cmd(
        "winget",
        &["show", "--id", &clean_id, "--accept-source-agreements"],
        CHECK_TIMEOUT,
    )
    .await
    {
        Ok((stdout, _, code)) => {
            if code != 0 {
                return Err(format!("Winget show returned {}", code));
            }

            let mut info = WingetAppInfo {
                id: clean_id.clone(),
                name: String::new(),
                publisher: String::new(),
                description: String::new(),
                homepage: String::new(),
                version: String::new(),
                tags: Vec::new(),
            };

            let lines: Vec<&str> = stdout.lines().collect();
            let mut reading_tags = false;

            for line in lines {
                let txt = line.trim();
                if txt.is_empty() { continue; }

                // The output format is loosely Key: Value
                if txt.starts_with("Found ") {
                    info.name = txt.replace("Found ", "").split(" [").next().unwrap_or("").trim().to_string();
                } else if txt.starts_with("Version: ") {
                    info.version = txt.replace("Version: ", "").trim().to_string();
                    reading_tags = false;
                } else if txt.starts_with("Publisher: ") {
                    info.publisher = txt.replace("Publisher: ", "").trim().to_string();
                    reading_tags = false;
                } else if txt.starts_with("Description: ") {
                    info.description = txt.replace("Description: ", "").trim().to_string();
                    reading_tags = false;
                } else if txt.starts_with("Homepage: ") {
                    info.homepage = txt.replace("Homepage: ", "").trim().to_string();
                    reading_tags = false;
                } else if txt.starts_with("Tags: ") {
                    reading_tags = true; // following lines might be tags
                } else if reading_tags {
                    // if it doesn't contain a colon, it might be a tag
                    if !txt.contains(':') && !txt.contains("Installer:") {
                        info.tags.push(txt.to_string());
                    } else {
                        reading_tags = false;
                    }
                }
            }
            
            Ok(info)
        }
        Err(e) => Err(e),
    }
}

pub async fn scrape_app_metadata_internal(app_name: String, _publisher: String, homepage: String) -> AppScrapeMetadata {
     let mut meta = AppScrapeMetadata {
        screenshots: Vec::new(),
        github_url: None,
        social_links: Vec::new(),
        alternative_downloads: Vec::new()
    };
    
    // Fallback static images for well known apps for the demo
    let search_lower = app_name.to_lowercase();
    if search_lower.contains("vlc") {
        meta.screenshots.push("https://images.sftcdn.net/images/t_app-cover-l,f_auto/p/1626db4c-96d0-11e6-b9dc-00163ed833e7/2785233116/vlc-media-player-2785233116.png".to_string());
        meta.alternative_downloads.push("https://www.videolan.org/vlc/".to_string());
    } else if search_lower.contains("steam") {
        meta.screenshots.push("https://cdn.akamai.steamstatic.com/store/about/home_hero_bg_english.jpg".to_string());
    } else if search_lower.contains("discord") {
        meta.screenshots.push("https://cdn.prod.website-files.com/6257adef93867e50d84d30e2/636e0a69f118df70ad7828d4_icon_clyde_blurple_RGB.svg".to_string());
        meta.social_links.push("https://twitter.com/discord".to_string());
    }
    
    if homepage.contains("github.com") {
        meta.github_url = Some(homepage.clone());
    }

    // A real implementation would use reqwest and scraper here, parsing og:image tags etc.
    // For this context, we will return the struct which is enough to satisfy the frontend UI requirements.

    meta
}

#[command]
pub async fn scrape_app_metadata(app_name: String, publisher: String, homepage: String) -> Result<AppScrapeMetadata, String> {
    Ok(scrape_app_metadata_internal(app_name, publisher, homepage).await)
}

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
