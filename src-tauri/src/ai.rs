use tauri::State;
use std::process::{Command, Child, Stdio};
use std::sync::Mutex;
use std::path::PathBuf;
use std::os::windows::process::CommandExt;
use std::fs;

const CREATE_NO_WINDOW: u32 = 0x08000000;

pub struct OllamaState {
    pub process: Mutex<Option<Child>>,
}

#[tauri::command]
pub async fn start_ollama(state: State<'_, OllamaState>) -> Result<String, String> {
    let mut process_guard = state.process.lock().map_err(|e| e.to_string())?;

    if process_guard.is_some() {
        return Ok("Ollama is already running".to_string());
    }

    let local_app_data = std::env::var("LOCALAPPDATA").unwrap_or_else(|_| "C:\\Temp".to_string());
    let winopt_dir = PathBuf::from(&local_app_data).join("WinOptPro");
    let ollama_exe = winopt_dir.join("ollama.exe");
    let models_dir = winopt_dir.join("AI_Models");

    fs::create_dir_all(&models_dir).map_err(|e| e.to_string())?;

    if !ollama_exe.exists() {
        return Err("OLLAMA_MISSING".to_string());
    }

    // Spawn silently
    let child = Command::new(&ollama_exe)
        .arg("serve")
        .env("OLLAMA_MODELS", &models_dir)
        .creation_flags(CREATE_NO_WINDOW)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| e.to_string())?;

    *process_guard = Some(child);

    Ok("Ollama started silently".to_string())
}

#[tauri::command]
pub async fn stop_ollama(state: State<'_, OllamaState>) -> Result<String, String> {
    let mut process_guard = state.process.lock().map_err(|e| e.to_string())?;

    if let Some(mut child) = process_guard.take() {
        let _ = child.kill();
        let _ = child.wait();
        return Ok("Ollama stopped".to_string());
    }

    Ok("Ollama was not running".to_string())
}

#[tauri::command]
pub async fn download_ollama() -> Result<String, String> {
    let local_app_data = std::env::var("LOCALAPPDATA").unwrap_or_else(|_| "C:\\Temp".to_string());
    let winopt_dir = PathBuf::from(&local_app_data).join("WinOptPro");
    fs::create_dir_all(&winopt_dir).map_err(|e| e.to_string())?;

    let zip_path = winopt_dir.join("ollama.zip");

    // Download zip using powershell
    let download_cmd = format!(
        "Invoke-WebRequest -Uri 'https://ollama.com/download/ollama-windows-amd64.zip' -OutFile '{}'",
        zip_path.display()
    );

    let status = Command::new("powershell")
        .arg("-Command")
        .arg(&download_cmd)
        .creation_flags(CREATE_NO_WINDOW)
        .status()
        .map_err(|e| e.to_string())?;

    if !status.success() {
        return Err("Failed to download Ollama".to_string());
    }

    // Extract zip
    let extract_cmd = format!(
        "Expand-Archive -Path '{}' -DestinationPath '{}' -Force",
        zip_path.display(),
        winopt_dir.display()
    );

    let status = Command::new("powershell")
        .arg("-Command")
        .arg(&extract_cmd)
        .creation_flags(CREATE_NO_WINDOW)
        .status()
        .map_err(|e| e.to_string())?;

    if !status.success() {
        return Err("Failed to extract Ollama".to_string());
    }

    let _ = fs::remove_file(zip_path);

    Ok("Ollama downloaded and extracted successfully".to_string())
}

/// Validate Ollama model name format: "name:tag" — both parts alphanumeric with dots/hyphens/underscores.
/// Prevents command injection via the model name argument.
pub fn is_valid_model_name(model: &str) -> bool {
    if model.is_empty() {
        return false;
    }
    let parts: Vec<&str> = model.splitn(2, ':').collect();
    if parts.len() != 2 {
        return false;
    }
    let valid_part = |s: &str| {
        !s.is_empty() && s.chars().all(|c| c.is_alphanumeric() || c == '.' || c == '-' || c == '_')
    };
    valid_part(parts[0]) && valid_part(parts[1])
}

#[tauri::command]
pub async fn pull_model(model: String) -> Result<String, String> {
    if !is_valid_model_name(&model) {
        return Err(format!(
            "Invalid model name '{}'. Expected format: 'name:tag' (e.g. qwen2.5:1.5b).",
            model
        ));
    }

    let local_app_data = std::env::var("LOCALAPPDATA").unwrap_or_else(|_| "C:\\Temp".to_string());
    let winopt_dir = PathBuf::from(&local_app_data).join("WinOptPro");
    let ollama_exe = winopt_dir.join("ollama.exe");
    let models_dir = winopt_dir.join("AI_Models");

    if !ollama_exe.exists() {
        return Err("OLLAMA_MISSING".to_string());
    }

    let status = Command::new(&ollama_exe)
        .arg("pull")
        .arg(&model)
        .env("OLLAMA_MODELS", &models_dir)
        .creation_flags(CREATE_NO_WINDOW)
        .status()
        .map_err(|e| e.to_string())?;

    if status.success() {
        Ok(format!("Model {} downloaded", model))
    } else {
        Err(format!("Failed to pull model {}", model))
    }
}

/// Synchronous Ollama shutdown — called from the app exit handler.
pub fn stop_ollama_sync(state: &OllamaState) {
    if let Ok(mut guard) = state.process.lock() {
        if let Some(mut child) = guard.take() {
            let _ = child.kill();
            let _ = child.wait();
            log::info!("Ollama process terminated on app exit.");
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_model_names_accepted() {
        let valid = ["qwen2.5:1.5b", "qwen2.5:0.5b", "llama3.2:1b", "mistral:7b"];
        for model in &valid {
            assert!(is_valid_model_name(model), "Model '{}' should be valid", model);
        }
    }

    #[test]
    fn test_invalid_model_names_rejected() {
        let invalid = ["model; rm -rf /", "model`whoami`", "model$(calc)", "", "noconn", "../../../etc/passwd"];
        for model in &invalid {
            assert!(!is_valid_model_name(model), "Model '{}' should be rejected", model);
        }
    }

    #[test]
    fn test_stop_ollama_sync_when_no_process() {
        let state = OllamaState { process: std::sync::Mutex::new(None) };
        stop_ollama_sync(&state); // Must not panic
    }

    #[test]
    fn test_stop_ollama_sync_clears_state() {
        let state = OllamaState { process: std::sync::Mutex::new(None) };
        stop_ollama_sync(&state);
        let guard = state.process.lock().unwrap();
        assert!(guard.is_none());
    }
}
