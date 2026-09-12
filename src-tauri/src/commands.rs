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

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UpdateInfo {
    pub should_update: bool,
    pub current_version: String,
    pub latest_version: String,
    pub release_notes: String,
    pub download_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SystemDiagnostics {
    pub os: String,
    pub arch: String,
    pub client_version: String,
    pub downloads_dir_exists: bool,
    pub downloads_dir_writable: bool,
    pub downloads_path: String,
    pub active_profile: String,
    pub active_endpoint: String,
    pub backend_reachable: bool,
    pub latency_ms: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HealingResult {
    pub healed: bool,
    pub message: String,
    pub active_endpoint: String,
    pub previous_endpoint: String,
    pub action_taken: String,
}

#[tauri::command]
pub async fn check_for_updates() -> Result<UpdateInfo, String> {
    let current_version = "3.0.0".to_string();
    let manifest_url = std::env::var("TUNEFLOW_UPDATE_MANIFEST_URL")
        .unwrap_or_else(|_| "https://raw.githubusercontent.com/tamld/tuneflow/master/dist/latest.json".to_string());

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(4))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    if let Ok(res) = client.get(&manifest_url).send().await {
        if res.status().is_success() {
            if let Ok(manifest) = res.json::<serde_json::Value>().await {
                let latest = manifest.get("version").and_then(|v| v.as_str()).unwrap_or("3.0.0");
                let notes = manifest.get("notes").and_then(|n| n.as_str()).unwrap_or("Bản phát hành mới của TuneFlow.");
                let url = manifest.get("url").and_then(|u| u.as_str()).map(|s| s.to_string());
                let should = latest != current_version;
                return Ok(UpdateInfo {
                    should_update: should,
                    current_version,
                    latest_version: latest.to_string(),
                    release_notes: notes.to_string(),
                    download_url: url,
                });
            }
        }
    }

    Ok(UpdateInfo {
        should_update: false,
        current_version: current_version.clone(),
        latest_version: current_version,
        release_notes: "Bạn đang sử dụng phiên bản mới nhất.".to_string(),
        download_url: None,
    })
}

#[tauri::command]
pub async fn get_system_diagnostics() -> Result<SystemDiagnostics, String> {
    let cfg = config::load_config().unwrap_or_default();
    let profile = cfg.profiles.get(&cfg.active_profile).cloned();
    let endpoint = profile.map(|p| p.url).unwrap_or_else(|| "http://127.0.0.1:3000".to_string());

    let downloads_dir = dirs::download_dir().unwrap_or_default();
    let tf_downloads = downloads_dir.join("TuneFlow");
    let target_dir = if tf_downloads.exists() { tf_downloads } else { downloads_dir };
    let downloads_dir_exists = target_dir.exists();

    let test_file = target_dir.join(".tuneflow_write_test");
    let downloads_dir_writable = match std::fs::write(&test_file, b"ok") {
        Ok(_) => {
            let _ = std::fs::remove_file(&test_file);
            true
        }
        Err(_) => false,
    };

    let (backend_reachable, latency_ms) = match connect_server(endpoint.clone()).await {
        Ok(status) => (true, Some(status.latency_ms)),
        Err(_) => (false, None),
    };

    Ok(SystemDiagnostics {
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        client_version: "3.0.0".to_string(),
        downloads_dir_exists,
        downloads_dir_writable,
        downloads_path: target_dir.to_string_lossy().to_string(),
        active_profile: cfg.active_profile,
        active_endpoint: endpoint,
        backend_reachable,
        latency_ms,
    })
}

#[tauri::command]
pub async fn self_heal_connectivity(preferred_endpoint: Option<String>) -> Result<HealingResult, String> {
    let mut cfg = config::load_config().unwrap_or_default();
    let previous_endpoint = cfg.profiles.get(&cfg.active_profile)
        .map(|p| p.url.clone())
        .unwrap_or_else(|| "http://127.0.0.1:3000".to_string());

    if let Some(ref target) = preferred_endpoint {
        if let Ok(status) = connect_server(target.clone()).await {
            if let Some(p) = cfg.profiles.get_mut(&cfg.active_profile) {
                p.url = status.endpoint.clone();
            }
            let _ = config::save_config(&cfg);
            return Ok(HealingResult {
                healed: true,
                message: format!("Đã kết nối thành công tới máy chủ mong muốn: {} (độ trễ {}ms)", status.endpoint, status.latency_ms),
                active_endpoint: status.endpoint,
                previous_endpoint,
                action_taken: "CONNECTED_PREFERRED".to_string(),
            });
        }
    }

    if let Ok(status) = connect_server(previous_endpoint.clone()).await {
        return Ok(HealingResult {
            healed: true,
            message: format!("Máy chủ hiện tại đã phục hồi và phản hồi bình thường (độ trễ {}ms)", status.latency_ms),
            active_endpoint: status.endpoint,
            previous_endpoint,
            action_taken: "RECONNECTED_CURRENT".to_string(),
        });
    }

    let localhost = "http://127.0.0.1:3000".to_string();
    if let Ok(_status) = connect_server(localhost.clone()).await {
        cfg.active_profile = "default".to_string();
        let _ = config::save_config(&cfg);
        return Ok(HealingResult {
            healed: true,
            message: "Đã tự động chuyển đổi phục hồi về Máy chủ Cục bộ (Local Standalone: 127.0.0.1:3000)".to_string(),
            active_endpoint: localhost,
            previous_endpoint,
            action_taken: "FALLBACK_STANDALONE".to_string(),
        });
    }

    Ok(HealingResult {
        healed: false,
        message: "Không thể kết nối đến máy chủ chỉ định hoặc máy chủ cục bộ 127.0.0.1:3000. Vui lòng kiểm tra dịch vụ TuneFlow.".to_string(),
        active_endpoint: previous_endpoint.clone(),
        previous_endpoint,
        action_taken: "FAILED_RETRY".to_string(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_update_info_defaults() {
        let info = UpdateInfo {
            should_update: false,
            current_version: "3.0.0".to_string(),
            latest_version: "3.0.0".to_string(),
            release_notes: "Latest".to_string(),
            download_url: None,
        };
        assert!(!info.should_update);
        assert_eq!(info.current_version, "3.0.0");
    }

    #[test]
    fn test_diagnostics_serialization() {
        let diag = SystemDiagnostics {
            os: "macos".to_string(),
            arch: "aarch64".to_string(),
            client_version: "3.0.0".to_string(),
            downloads_dir_exists: true,
            downloads_dir_writable: true,
            downloads_path: "/tmp".to_string(),
            active_profile: "default".to_string(),
            active_endpoint: "http://127.0.0.1:3000".to_string(),
            backend_reachable: true,
            latency_ms: Some(10),
        };
        let serialized = serde_json::to_string(&diag).expect("serialize");
        assert!(serialized.contains("downloads_dir_writable"));
        assert!(serialized.contains("latency_ms"));
    }

    #[test]
    fn test_healing_result_serialization() {
        let res = HealingResult {
            healed: true,
            message: "Healed".to_string(),
            active_endpoint: "http://127.0.0.1:3000".to_string(),
            previous_endpoint: "http://192.168.1.100:3000".to_string(),
            action_taken: "FALLBACK_STANDALONE".to_string(),
        };
        let serialized = serde_json::to_string(&res).expect("serialize");
        assert!(serialized.contains("FALLBACK_STANDALONE"));
    }
}

