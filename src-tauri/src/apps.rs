use serde::{Deserialize, Serialize};
use std::process::Stdio;
use regex::Regex;
use tauri::command;
use tokio::process::Command;
use tokio::time::{timeout, Duration};

const INSTALL_TIMEOUT: Duration = Duration::from_secs(20 * 60);
const CHECK_TIMEOUT: Duration = Duration::from_secs(15);
const UPDATE_TIMEOUT: Duration = Duration::from_secs(30 * 60);
const CREATE_NO_WINDOW: u32 = 0x08000000;

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
pub struct SoftwareUpdateItem {
    pub name: String,
    pub package_id: String,
    pub current_version: String,
    pub available_version: String,
    pub source: String,
    pub beta_package_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SoftwareUpdateResult {
    pub success: bool,
    pub method: String,
    pub package_id: String,
    pub target_package_id: String,
    pub channel: String,
    pub output: String,
    pub error: String,
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
    let executable = resolve_windows_tool(program).unwrap_or_else(|| program.to_string());
    let child = Command::new(&executable)
        .args(args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true)
        .creation_flags(CREATE_NO_WINDOW)
        .spawn()
        .map_err(|e| format!("Failed to start {}. Make sure it is installed and available for this Windows user. Details: {}", program, e))?;

    let output = timeout(time_limit, child.wait_with_output())
        .await
        .map_err(|_| format!("{} timed out after {}s", program, time_limit.as_secs()))?
        .map_err(|e| format!("{} execution failed: {}", program, e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    let exit_code = output.status.code().unwrap_or(-1);

    Ok((stdout, stderr, exit_code))
}

#[cfg(target_os = "windows")]
fn resolve_windows_tool(program: &str) -> Option<String> {
    if program.eq_ignore_ascii_case("winget") {
        return resolve_winget();
    }
    if program.eq_ignore_ascii_case("choco") {
        return resolve_choco();
    }
    None
}

#[cfg(target_os = "windows")]
fn resolve_winget() -> Option<String> {
    let mut candidates = Vec::new();
    if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
        candidates.push(format!(r"{}\Microsoft\WindowsApps\winget.exe", local_app_data));
    }
    if let Ok(user_profile) = std::env::var("USERPROFILE") {
        candidates.push(format!(r"{}\AppData\Local\Microsoft\WindowsApps\winget.exe", user_profile));
    }
    if let Ok(program_files) = std::env::var("ProgramFiles") {
        if let Ok(entries) = std::fs::read_dir(format!(r"{}\WindowsApps", program_files)) {
            for entry in entries.flatten() {
                let name = entry.file_name().to_string_lossy().to_string();
                if name.starts_with("Microsoft.DesktopAppInstaller_") && name.ends_with("__8wekyb3d8bbwe") {
                    candidates.push(entry.path().join("winget.exe").to_string_lossy().to_string());
                }
            }
        }
    }
    candidates.into_iter().find(|path| std::path::Path::new(path).exists())
}

#[cfg(target_os = "windows")]
fn resolve_choco() -> Option<String> {
    let mut candidates = Vec::new();
    if let Ok(program_data) = std::env::var("ProgramData") {
        candidates.push(format!(r"{}\chocolatey\bin\choco.exe", program_data));
    }
    candidates.into_iter().find(|path| std::path::Path::new(path).exists())
}

fn validate_winget_search_query(query: &str) -> Result<String, String> {
    let clean = query.trim();
    if clean.is_empty() {
        return Ok(String::new());
    }
    if clean.len() > 80 {
        return Err("Search query is too long.".to_string());
    }
    if clean.starts_with('-') || clean.starts_with('/') {
        return Err("Search query cannot start with an option prefix.".to_string());
    }
    if !clean
        .chars()
        .all(|ch| ch.is_ascii_alphanumeric() || matches!(ch, ' ' | '.' | '_' | '-' | '+'))
    {
        return Err("Search query contains unsupported characters.".to_string());
    }
    Ok(clean.to_string())
}

fn validate_package_id(id: &str) -> Result<String, String> {
    let clean = id.trim();
    if clean.is_empty() {
        return Err("Package ID is required.".to_string());
    }
    if clean.len() > 120 {
        return Err("Package ID is too long.".to_string());
    }
    if !clean
        .chars()
        .all(|ch| ch.is_ascii_alphanumeric() || matches!(ch, '.' | '_' | '-'))
    {
        return Err("Package ID contains unsupported characters.".to_string());
    }
    Ok(clean.to_string())
}

fn known_beta_package_id(package_id: &str) -> Option<String> {
    match package_id {
        "Microsoft.VisualStudioCode" => Some("Microsoft.VisualStudioCode.Insiders".to_string()),
        "Microsoft.Edge" => Some("Microsoft.EdgeBeta".to_string()),
        "Google.Chrome" => Some("Google.Chrome.Beta".to_string()),
        "BitSum.ProcessLasso" => Some("BitSum.ProcessLasso.Beta".to_string()),
        _ => None,
    }
}

fn slice_table_cell(line: &str, start: usize, end: Option<usize>) -> String {
    line.chars()
        .skip(start)
        .take(end.unwrap_or_else(|| line.chars().count()).saturating_sub(start))
        .collect::<String>()
        .trim()
        .to_string()
}

fn looks_like_update_source(value: &str) -> bool {
    matches!(value.to_ascii_lowercase().as_str(), "winget" | "msstore")
}

fn parse_winget_update_row(line: &str) -> Option<SoftwareUpdateItem> {
    let trimmed = line.trim();
    if trimmed.is_empty()
        || trimmed.chars().all(|ch| ch == '-' || ch.is_whitespace())
        || trimmed.contains("upgrades available")
        || trimmed.contains("package(s) have version numbers")
        || trimmed.starts_with("Name ")
    {
        return None;
    }

    let tokens: Vec<&str> = trimmed.split_whitespace().collect();
    if tokens.len() < 5 {
        return None;
    }

    let source = tokens.last()?.trim();
    if !looks_like_update_source(source) {
        return None;
    }

    let available_version = tokens.get(tokens.len().checked_sub(2)?)?.trim();
    let current_version = tokens.get(tokens.len().checked_sub(3)?)?.trim();
    let package_id = tokens.get(tokens.len().checked_sub(4)?)?.trim();
    let name_tokens = &tokens[..tokens.len().saturating_sub(4)];
    let name = name_tokens.join(" ").trim().to_string();

    if name.is_empty() || current_version.is_empty() || available_version.is_empty() {
        return None;
    }

    let clean_id = package_id.to_string();
    if !clean_id.contains('…') && validate_package_id(&clean_id).is_err() {
        return None;
    }

    Some(SoftwareUpdateItem {
        name,
        current_version: current_version.to_string(),
        available_version: available_version.to_string(),
        beta_package_id: known_beta_package_id(&clean_id),
        package_id: clean_id,
        source: source.to_string(),
    })
}

fn parse_winget_upgrade_table(stdout: &str) -> Vec<SoftwareUpdateItem> {
    let lines: Vec<&str> = stdout.lines().collect();
    let Some(header_index) = lines.iter().position(|line| {
        line.contains("Name")
            && line.contains("Id")
            && line.contains("Version")
            && line.contains("Available")
    }) else {
        return Vec::new();
    };

    let header = lines[header_index];
    let Some(id_start) = header.chars().collect::<String>().find("Id") else {
        return Vec::new();
    };
    let Some(version_start) = header.chars().collect::<String>().find("Version") else {
        return Vec::new();
    };
    let Some(available_start) = header.chars().collect::<String>().find("Available") else {
        return Vec::new();
    };
    let source_start = header.chars().collect::<String>().find("Source");

    lines
        .iter()
        .skip(header_index + 1)
        .filter_map(|line| {
            if let Some(row) = parse_winget_update_row(line) {
                return Some(row);
            }

            let trimmed = line.trim();
            if trimmed.is_empty() || trimmed.chars().all(|ch| ch == '-' || ch.is_whitespace()) {
                return None;
            }

            let package_id = slice_table_cell(line, id_start, Some(version_start));
            if package_id.is_empty()
                || (!package_id.contains('…') && validate_package_id(&package_id).is_err())
            {
                return None;
            }

            let available_end = source_start.unwrap_or(line.len());
            let source = source_start
                .map(|start| slice_table_cell(line, start, None))
                .unwrap_or_default();

            Some(SoftwareUpdateItem {
                name: slice_table_cell(line, 0, Some(id_start)),
                current_version: slice_table_cell(line, version_start, Some(available_start)),
                available_version: slice_table_cell(line, available_start, Some(available_end)),
                beta_package_id: known_beta_package_id(&package_id),
                package_id,
                source,
            })
        })
        .collect()
}

fn parse_choco_outdated_table(stdout: &str) -> Vec<SoftwareUpdateItem> {
    stdout
        .lines()
        .filter_map(|line| {
            let trimmed = line.trim();
            if trimmed.is_empty() || trimmed.starts_with("Chocolatey ") {
                return None;
            }

            let parts: Vec<&str> = trimmed.split('|').map(str::trim).collect();
            if parts.len() < 3 {
                return None;
            }

            let package_id = parts[0].to_string();
            if validate_package_id(&package_id).is_err() {
                return None;
            }

            Some(SoftwareUpdateItem {
                name: package_id.clone(),
                package_id,
                current_version: parts[1].to_string(),
                available_version: parts[2].to_string(),
                source: "chocolatey".to_string(),
                beta_package_id: None,
            })
        })
        .collect()
}

fn dedupe_software_updates(items: Vec<SoftwareUpdateItem>) -> Vec<SoftwareUpdateItem> {
    let mut seen = std::collections::HashSet::new();
    let mut result = Vec::new();

    for item in items {
        let key = format!("{}:{}", item.source.to_ascii_lowercase(), item.package_id.to_ascii_lowercase());
        if seen.insert(key) {
            result.push(item);
        }
    }

    result
}

async fn resolve_truncated_winget_ids(items: Vec<SoftwareUpdateItem>) -> Vec<SoftwareUpdateItem> {
    let mut resolved = Vec::with_capacity(items.len());

    for item in items {
        if !item.package_id.contains('…') {
            resolved.push(item);
            continue;
        }

        let prefix = item.package_id.replace('…', "").trim().to_string();
        if prefix.len() < 4 {
            resolved.push(item);
            continue;
        }

        let lookup = run_cmd(
            "winget",
            &[
                "list",
                "--id",
                &prefix,
                "--upgrade-available",
                "--accept-source-agreements",
                "--disable-interactivity",
            ],
            CHECK_TIMEOUT,
        )
        .await;

        if let Ok((stdout, _, 0)) = lookup {
            if let Some(full) = parse_winget_upgrade_table(&stdout)
                .into_iter()
                .find(|candidate| !candidate.package_id.contains('…'))
            {
                resolved.push(full);
                continue;
            }
        }

        resolved.push(item);
    }

    resolved
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
    let clean_query = validate_winget_search_query(&query)?;
    if clean_query.is_empty() {
        return Ok(Vec::new());
    }

    match run_cmd(
        "winget",
        &["search", &clean_query, "--accept-source-agreements", "--disable-interactivity"],
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
                let parts: Vec<&str> = line
                    .split("  ")
                    .filter(|s| !s.is_empty())
                    .map(|s| s.trim())
                    .collect();
                if parts.len() >= 3 {
                    results.push(WingetSearchResult {
                        name: parts[0].to_string(),
                        id: parts[1].to_string(),
                        version: parts[2].to_string(),
                        match_type: if parts.len() > 3 {
                            parts[3].to_string()
                        } else {
                            "".to_string()
                        },
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
        &["show", "--id", &clean_id, "-e", "--accept-source-agreements", "--disable-interactivity"],
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
                if txt.is_empty() {
                    continue;
                }

                // The output format is loosely Key: Value
                if txt.starts_with("Found ") {
                    info.name = txt
                        .replace("Found ", "")
                        .split(" [")
                        .next()
                        .unwrap_or("")
                        .trim()
                        .to_string();
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

fn clean_http_url(url: &str) -> Option<String> {
    let clean = url.trim();
    if clean.len() > 2048 || !(clean.starts_with("https://") || clean.starts_with("http://")) {
        return None;
    }
    if clean
        .chars()
        .any(|ch| matches!(ch, '"' | '\'' | '`' | '<' | '>' | '|' | ';'))
    {
        return None;
    }
    Some(clean.to_string())
}

fn origin_for(url: &str) -> String {
    let Some((scheme, rest)) = url.split_once("://") else {
        return String::new();
    };
    let host = rest.split('/').next().unwrap_or_default();
    format!("{}://{}", scheme, host)
}

fn absolute_url(value: &str, base_url: &str) -> Option<String> {
    let value = value.trim();
    if value.is_empty() {
        return None;
    }
    if value.starts_with("https://") || value.starts_with("http://") {
        return clean_http_url(value);
    }
    if value.starts_with("//") {
        return clean_http_url(&format!("https:{}", value));
    }
    if value.starts_with('/') {
        return clean_http_url(&format!("{}{}", origin_for(base_url), value));
    }
    None
}

fn read_attr(attrs: &str, wanted: &str) -> Option<String> {
    let attr_re = Regex::new(r#"(?i)([a-z_:.-]+)\s*=\s*["']([^"']*)["']"#).ok()?;
    let value = attr_re.captures_iter(attrs).find_map(|cap| {
        if cap.get(1)?.as_str().eq_ignore_ascii_case(wanted) {
            Some(cap.get(2)?.as_str().trim().to_string())
        } else {
            None
        }
    });
    value
}

fn extract_metadata_from_html(html: &str, base_url: &str) -> AppScrapeMetadata {
    let mut meta = AppScrapeMetadata {
        screenshots: Vec::new(),
        github_url: None,
        social_links: Vec::new(),
        alternative_downloads: Vec::new(),
    };

    let tag_re = Regex::new(r#"(?is)<(meta|link|a)\s+([^>]+)>"#).ok();
    if let Some(tag_re) = tag_re {
        for cap in tag_re.captures_iter(html).take(250) {
            let tag = cap.get(1).map(|m| m.as_str().to_ascii_lowercase()).unwrap_or_default();
            let attrs = cap.get(2).map(|m| m.as_str()).unwrap_or_default();

            if tag == "meta" {
                let key = read_attr(attrs, "property")
                    .or_else(|| read_attr(attrs, "name"))
                    .unwrap_or_default()
                    .to_ascii_lowercase();
                if matches!(key.as_str(), "og:image" | "twitter:image" | "twitter:image:src") {
                    if let Some(url) = read_attr(attrs, "content").and_then(|value| absolute_url(&value, base_url)) {
                        if !meta.screenshots.contains(&url) {
                            meta.screenshots.push(url);
                        }
                    }
                }
            }

            if tag == "link" || tag == "a" {
                if let Some(href) = read_attr(attrs, "href").and_then(|value| absolute_url(&value, base_url)) {
                    let lower = href.to_ascii_lowercase();
                    if lower.contains("github.com/") && meta.github_url.is_none() {
                        meta.github_url = Some(href.clone());
                    }
                    if lower.contains("twitter.com/")
                        || lower.contains("x.com/")
                        || lower.contains("linkedin.com/")
                        || lower.contains("youtube.com/")
                    {
                        if !meta.social_links.contains(&href) {
                            meta.social_links.push(href.clone());
                        }
                    }
                    if (lower.contains("/download") || lower.contains("download."))
                        && !meta.alternative_downloads.contains(&href)
                    {
                        meta.alternative_downloads.push(href);
                    }
                }
            }
        }
    }

    meta.screenshots.truncate(6);
    meta.social_links.truncate(8);
    meta.alternative_downloads.truncate(6);
    meta
}

async fn fetch_homepage_html(homepage: &str) -> Result<String, String> {
    let clean = clean_http_url(homepage).ok_or_else(|| "Homepage URL is not a valid HTTP URL.".to_string())?;
    let escaped = clean.replace('\'', "''");
    let script = format!(
        "$ProgressPreference='SilentlyContinue'; (Invoke-WebRequest -UseBasicParsing -Uri '{}' -MaximumRedirection 5 -TimeoutSec 8).Content",
        escaped
    );
    let (stdout, stderr, code) = run_cmd(
        "powershell",
        &["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", &script],
        CHECK_TIMEOUT,
    )
    .await?;
    if code == 0 {
        Ok(stdout)
    } else if stderr.is_empty() {
        Err(format!("Metadata request returned {}", code))
    } else {
        Err(stderr)
    }
}

pub async fn scrape_app_metadata_internal(
    _app_name: String,
    _publisher: String,
    homepage: String,
) -> AppScrapeMetadata {
    let mut meta = if let Ok(html) = fetch_homepage_html(&homepage).await {
        extract_metadata_from_html(&html, &homepage)
    } else {
        AppScrapeMetadata {
            screenshots: Vec::new(),
            github_url: None,
            social_links: Vec::new(),
            alternative_downloads: Vec::new(),
        }
    };

    if meta.github_url.is_none() && homepage.to_ascii_lowercase().contains("github.com/") {
        meta.github_url = clean_http_url(&homepage);
    }
    if meta.alternative_downloads.is_empty() {
        if let Some(url) = clean_http_url(&homepage) {
            meta.alternative_downloads.push(url);
        }
    }

    meta
}

#[command]
pub async fn scrape_app_metadata(
    app_name: String,
    publisher: String,
    homepage: String,
) -> Result<AppScrapeMetadata, String> {
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

/// Scan installed software that WinGet can upgrade.
#[command]
pub async fn scan_software_updates() -> Result<Vec<SoftwareUpdateItem>, String> {
    let mut updates = Vec::new();
    let mut errors = Vec::new();

    match run_cmd(
        "winget",
        &[
            "upgrade",
            "--include-unknown",
            "--include-pinned",
            "--accept-source-agreements",
            "--disable-interactivity",
        ],
        UPDATE_TIMEOUT,
    )
    .await
    {
        Ok((stdout, stderr, code)) => {
            if code != 0 {
                errors.push(if stderr.is_empty() {
                    format!("winget upgrade returned {}", code)
                } else {
                    stderr
                });
            } else {
                updates.extend(resolve_truncated_winget_ids(parse_winget_upgrade_table(&stdout)).await);
            }
        }
        Err(e) => errors.push(e),
    }

    match run_cmd(
        "choco",
        &["outdated", "--limit-output", "--no-color"],
        UPDATE_TIMEOUT,
    )
    .await
    {
        Ok((stdout, stderr, code)) => {
            if code == 0 {
                updates.extend(parse_choco_outdated_table(&stdout));
            } else if updates.is_empty() && !stderr.is_empty() {
                errors.push(stderr);
            }
        }
        Err(e) => {
            if updates.is_empty() {
                errors.push(e);
            }
        }
    }

    let updates = dedupe_software_updates(updates);
    if updates.is_empty() && !errors.is_empty() {
        Err(errors.join(" | "))
    } else {
        Ok(updates)
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
        &["list", "--id", &winget_id, "-e", "--accept-source-agreements", "--disable-interactivity"],
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

/// Update a selected package. Stable uses WinGet upgrade; beta uses a known alternate package ID.
#[command]
pub async fn update_software_package(
    package_id: String,
    channel: String,
    beta_package_id: Option<String>,
    source: Option<String>,
) -> Result<SoftwareUpdateResult, String> {
    let clean_id = validate_package_id(&package_id)?;
    let clean_channel = channel.trim().to_ascii_lowercase();
    if clean_channel != "stable" && clean_channel != "beta" {
        return Err("Channel must be stable or beta.".to_string());
    }
    let clean_source = source
        .unwrap_or_else(|| "winget".to_string())
        .trim()
        .to_ascii_lowercase();

    let target_id = if clean_channel == "beta" {
        let candidate = beta_package_id.or_else(|| known_beta_package_id(&clean_id));
        validate_package_id(
            candidate
                .as_deref()
                .ok_or_else(|| "No known beta package is available for this app.".to_string())?,
        )?
    } else {
        clean_id.clone()
    };

    if clean_source == "chocolatey" || clean_source == "choco" {
        if clean_channel == "beta" {
            return Ok(SoftwareUpdateResult {
                success: false,
                method: "chocolatey-upgrade".to_string(),
                package_id: clean_id,
                target_package_id: target_id,
                channel: clean_channel,
                output: String::new(),
                error: "Chocolatey packages do not expose beta channels in WinOpt Pro.".to_string(),
            });
        }

        let args = vec!["upgrade", target_id.as_str(), "-y", "--no-progress"];
        return match run_cmd("choco", &args, UPDATE_TIMEOUT).await {
            Ok((stdout, stderr, code)) => Ok(SoftwareUpdateResult {
                success: code == 0,
                method: "chocolatey-upgrade".to_string(),
                package_id: clean_id,
                target_package_id: target_id,
                channel: clean_channel,
                output: stdout,
                error: if code == 0 {
                    String::new()
                } else if stderr.is_empty() {
                    format!("choco returned {}", code)
                } else {
                    stderr
                },
            }),
            Err(e) => Ok(SoftwareUpdateResult {
                success: false,
                method: "chocolatey-upgrade".to_string(),
                package_id: clean_id,
                target_package_id: target_id,
                channel: clean_channel,
                output: String::new(),
                error: e,
            }),
        };
    }

    let args = if clean_channel == "beta" {
        vec![
            "install",
            "--id",
            target_id.as_str(),
            "-e",
            "--silent",
            "--accept-package-agreements",
            "--accept-source-agreements",
            "--disable-interactivity",
        ]
    } else {
        vec![
            "upgrade",
            "--id",
            target_id.as_str(),
            "-e",
            "--silent",
            "--accept-package-agreements",
            "--accept-source-agreements",
            "--disable-interactivity",
        ]
    };

    match run_cmd("winget", &args, UPDATE_TIMEOUT).await {
        Ok((stdout, stderr, code)) => Ok(SoftwareUpdateResult {
            success: code == 0,
            method: if clean_channel == "beta" {
                "winget-install-beta".to_string()
            } else {
                "winget-upgrade".to_string()
            },
            package_id: clean_id,
            target_package_id: target_id,
            channel: clean_channel,
            output: stdout,
            error: if code == 0 {
                String::new()
            } else if stderr.is_empty() {
                format!("winget returned {}", code)
            } else {
                stderr
            },
        }),
        Err(e) => Ok(SoftwareUpdateResult {
            success: false,
            method: "winget".to_string(),
            package_id: clean_id,
            target_package_id: target_id,
            channel: clean_channel,
            output: String::new(),
            error: e,
        }),
    }
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
            "-e",
            "--accept-package-agreements",
            "--accept-source-agreements",
            "--disable-interactivity",
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_winget_upgrade_rows_without_fixed_width_columns() {
        let stdout = r#"
Name                        Id                          Version   Available Source
-------------------------------------------------------------------------------
7-Zip 25.01 (x64)           7zip.7zip                   25.01     26.01     winget
PowerToys (Preview) x64     XP89DCGQ3K6VLD              0.97.2    0.99.1    msstore
54 upgrades available.
"#;

        let items = parse_winget_upgrade_table(stdout);

        assert_eq!(items.len(), 2);
        assert_eq!(items[0].name, "7-Zip 25.01 (x64)");
        assert_eq!(items[0].package_id, "7zip.7zip");
        assert_eq!(items[1].package_id, "XP89DCGQ3K6VLD");
        assert_eq!(items[1].source, "msstore");
    }

    #[test]
    fn preserves_truncated_winget_ids_for_later_resolution() {
        let stdout = r#"
Name                        Id                          Version Available Source
-----------------------------------------------------------------------------
CrystalDiskInfo             CrystalDewWorld.CrystalDis… 9.7.2.0 9.9.1     winget
"#;

        let items = parse_winget_upgrade_table(stdout);

        assert_eq!(items.len(), 1);
        assert_eq!(items[0].package_id, "CrystalDewWorld.CrystalDis…");
    }

    #[test]
    fn parses_chocolatey_outdated_limit_output() {
        let stdout = "chocolatey|2.6.0|2.7.2|false\n";

        let items = parse_choco_outdated_table(stdout);

        assert_eq!(items.len(), 1);
        assert_eq!(items[0].name, "chocolatey");
        assert_eq!(items[0].package_id, "chocolatey");
        assert_eq!(items[0].source, "chocolatey");
        assert_eq!(items[0].available_version, "2.7.2");
    }
}
