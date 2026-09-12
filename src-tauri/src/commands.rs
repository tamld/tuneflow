use crate::config;
use serde::{Deserialize, Serialize};
use std::time::Instant;
use tauri::{AppHandle, Manager};

#[derive(Debug, Serialize, Deserialize)]
pub struct ServerStatus {
    pub status: String,
    pub version: String,
    pub latency_ms: u64,
    pub endpoint: String,
}

#[derive(Debug, Deserialize)]
struct HealthApiResponse {
    #[serde(default)]
    status: Option<String>,
    #[serde(default)]
    version: Option<String>,
}

#[tauri::command]
pub async fn connect_server(endpoint: String) -> Result<ServerStatus, String> {
    let mut clean_endpoint = endpoint.trim().trim_end_matches('/').to_string();
    if !clean_endpoint.starts_with("http://") && !clean_endpoint.starts_with("https://") {
        clean_endpoint = format!("http://{}", clean_endpoint);
    }

    let health_url = format!("{}/api/health", clean_endpoint);
    let start = Instant::now();

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(3))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let res = client
        .get(&health_url)
        .send()
        .await
        .map_err(|e| format!("Network request failed: {}", e))?;

    let latency_ms = start.elapsed().as_millis() as u64;

    if !res.status().is_success() {
        return Err(format!("Server returned HTTP {}", res.status()));
    }

    let parsed: HealthApiResponse = res.json().await.unwrap_or(HealthApiResponse {
        status: Some("healthy".to_string()),
        version: Some("v2.7.0".to_string()),
    });

    Ok(ServerStatus {
        status: parsed.status.unwrap_or_else(|| "healthy".to_string()),
        version: parsed.version.unwrap_or_else(|| "v2.7.0".to_string()),
        latency_ms,
        endpoint: clean_endpoint,
    })
}

#[tauri::command]
pub fn get_client_config() -> Result<config::ClientConfig, String> {
    config::load_config()
}

#[tauri::command]
pub fn save_client_config(config: config::ClientConfig) -> Result<(), String> {
    config::save_config(&config)
}

#[tauri::command]
pub fn open_downloads_folder() -> Result<(), String> {
    let folder = if let Some(down) = dirs::download_dir() {
        let tf_dir = down.join("TuneFlow");
        if tf_dir.exists() {
            tf_dir
        } else {
            down
        }
    } else {
        std::env::current_dir().unwrap_or_default()
    };

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&folder)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&folder)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&folder)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
pub fn minimize_to_tray(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}
