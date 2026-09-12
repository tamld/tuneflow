use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Profile {
    pub name: String,
    pub url: String,
    #[serde(rename = "isLocalDaemon", default)]
    pub is_local_daemon: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BehaviorConfig {
    #[serde(rename = "autoReconnect", default = "default_true")]
    pub auto_reconnect: bool,
    #[serde(rename = "maxReconnectAttempts", default = "default_three")]
    pub max_reconnect_attempts: u32,
    #[serde(rename = "fallbackToStandalone", default)]
    pub fallback_to_standalone: bool,
}

fn default_true() -> bool {
    true
}

fn default_three() -> u32 {
    3
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ClientConfig {
    #[serde(default = "default_version")]
    pub version: String,
    #[serde(rename = "activeProfile", default = "default_active")]
    pub active_profile: String,
    #[serde(default)]
    pub profiles: HashMap<String, Profile>,
    #[serde(default)]
    pub behavior: Option<BehaviorConfig>,
}

fn default_version() -> String {
    "1.0.0".to_string()
}

fn default_active() -> String {
    "default".to_string()
}

impl Default for ClientConfig {
    fn default() -> Self {
        let mut profiles = HashMap::new();
        profiles.insert(
            "default".to_string(),
            Profile {
                name: "Local Standalone".to_string(),
                url: "http://127.0.0.1:3000".to_string(),
                is_local_daemon: true,
            },
        );
        profiles.insert(
            "remote".to_string(),
            Profile {
                name: "Dedicated Remote Server".to_string(),
                url: "http://192.168.1.100:3000".to_string(),
                is_local_daemon: false,
            },
        );
        Self {
            version: "1.0.0".to_string(),
            active_profile: "default".to_string(),
            profiles,
            behavior: Some(BehaviorConfig {
                auto_reconnect: true,
                max_reconnect_attempts: 3,
                fallback_to_standalone: false,
            }),
        }
    }
}

pub fn resolve_config_path() -> PathBuf {
    #[cfg(target_os = "macos")]
    {
        if let Some(data_dir) = dirs::data_dir() {
            return data_dir.join("TuneFlow").join("client-config.json");
        }
    }
    if let Some(config_dir) = dirs::config_dir() {
        config_dir.join("tuneflow").join("client-config.json")
    } else {
        PathBuf::from("client-config.json")
    }
}

pub fn load_config() -> Result<ClientConfig, String> {
    let path = resolve_config_path();
    if !path.exists() {
        return Ok(ClientConfig::default());
    }
    let content = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read config from {}: {}", path.display(), e))?;
    serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse config JSON: {}", e))
}

pub fn save_config(config: &ClientConfig) -> Result<(), String> {
    let path = resolve_config_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create config dir {}: {}", parent.display(), e))?;
    }
    let json = serde_json::to_string_pretty(config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;
    fs::write(&path, json)
        .map_err(|e| format!("Failed to write config {}: {}", path.display(), e))?;

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let perms = fs::Permissions::from_mode(0o600);
        let _ = fs::set_permissions(&path, perms);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_client_config_defaults() {
        let config = ClientConfig::default();
        assert_eq!(config.version, "1.0.0");
        assert_eq!(config.active_profile, "default");
        assert!(config.profiles.contains_key("default"));
        assert!(config.profiles.contains_key("remote"));
        let default_profile = config.profiles.get("default").unwrap();
        assert_eq!(default_profile.url, "http://127.0.0.1:3000");
        assert!(default_profile.is_local_daemon);
    }

    #[test]
    fn test_serialization_roundtrip() {
        let original = ClientConfig::default();
        let serialized = serde_json::to_string(&original).expect("serialize");
        let deserialized: ClientConfig = serde_json::from_str(&serialized).expect("deserialize");
        assert_eq!(deserialized.version, original.version);
        assert_eq!(deserialized.active_profile, original.active_profile);
    }

    #[test]
    fn test_resolve_config_path_structure() {
        let path = resolve_config_path();
        assert!(path.to_string_lossy().contains("client-config.json"));
    }
}

