use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tauri_plugin_updater::UpdaterExt;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UpdateInfo {
    pub version: String,
    pub date: Option<String>,
    pub body: Option<String>,
    pub download_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(tag = "event", content = "data")]
pub enum DownloadProgress {
    Started { content_length: Option<u64> },
    Progress { downloaded: u64, total: Option<u64> },
    Finished,
}

/// Check GitHub Releases for a newer version.
/// Returns the update info if a newer version is found, or null if up to date.
#[tauri::command]
pub async fn check_for_update(app: AppHandle) -> Result<Option<UpdateInfo>, String> {
    let updater = app.updater().map_err(|e| e.to_string())?;
    match updater.check().await {
        Ok(Some(update)) => Ok(Some(UpdateInfo {
            version: update.version.clone(),
            date: update.date.map(|d| d.to_string()),
            body: update.body.clone(),
            download_url: None,
        })),
        Ok(None) => Ok(None),
        Err(e) => {
            // Treat a "no update" or network error gracefully — not a hard error
            let msg = e.to_string();
            if msg.contains("must be greater than") || msg.contains("up to date") {
                Ok(None)
            } else {
                Err(msg)
            }
        }
    }
}

/// Download and install the available update, streaming progress events, then restart.
#[tauri::command]
pub async fn download_and_install_update(
    app: AppHandle,
    on_progress: tauri::ipc::Channel<DownloadProgress>,
) -> Result<(), String> {
    let updater = app.updater().map_err(|e| e.to_string())?;
    let update = updater
        .check()
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "No update available".to_string())?;

    let mut downloaded: u64 = 0;

    update
        .download_and_install(
            |chunk_length, content_length| {
                downloaded += chunk_length as u64;
                if downloaded == chunk_length as u64 {
                    // First chunk — emit Started
                    let _ = on_progress.send(DownloadProgress::Started { content_length });
                }
                let _ = on_progress.send(DownloadProgress::Progress {
                    downloaded,
                    total: content_length,
                });
            },
            || {
                let _ = on_progress.send(DownloadProgress::Finished);
            },
        )
        .await
        .map_err(|e| e.to_string())?;

    app.restart();
}
