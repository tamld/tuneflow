/**
 * TuneFlow Client Configuration & Profile Manager
 * Authority: SPEC-0013 (Tri-Mode Deployment & Remote Homelab Topology)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const DEFAULT_CONFIG_FILENAME = 'client-config.json';

/**
 * Determine network medium type from URL
 * @param {string} urlStr
 * @returns {{ valid: boolean, type?: string, url?: string, normalizedUrl?: string, error?: string, isSecure: boolean }}
 */
function validateServerUrl(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') {
    return { valid: false, error: 'URL string is required' };
  }

  const trimmed = urlStr.trim();
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch (_e) {
    return { valid: false, error: 'Malformed URL format' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, error: `Protocol "${parsed.protocol}" not permitted (must be http: or https:)` };
  }

  const hostname = parsed.hostname;
  const isSecure = parsed.protocol === 'https:';

  let type = 'domain';
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
    type = 'localhost';
  } else if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
    // IPv4 address check
    const octets = hostname.split('.').map(Number);
    const validOctets = octets.every(o => o >= 0 && o <= 255);
    if (!validOctets) {
      return { valid: false, error: 'Invalid IPv4 address octets' };
    }
    type = 'ipv4';
  } else if (hostname.startsWith('[') && hostname.endsWith(']')) {
    type = 'ipv6';
  } else if (hostname.endsWith('.local') || hostname.endsWith('.home.lab') || hostname.endsWith('.lan')) {
    type = 'mdns';
  } else if (isSecure) {
    type = 'fqdn_https';
  } else {
    type = 'domain';
  }

  const port = parsed.port ? parseInt(parsed.port, 10) : (isSecure ? 443 : 80);
  if (port < 1 || port > 65535) {
    return { valid: false, error: 'TCP port must be between 1 and 65535' };
  }

  // Normalize: Strip trailing slash
  const normalizedUrl = `${parsed.protocol}//${parsed.host}`;

  return {
    valid: true,
    type,
    url: trimmed,
    normalizedUrl,
    isSecure,
    hostname,
    port
  };
}

/**
 * Returns OS-standard path for client-config.json
 * @param {string} [customDir]
 * @returns {string}
 */
function resolveClientConfigPath(customDir) {
  if (customDir) {
    return path.join(customDir, DEFAULT_CONFIG_FILENAME);
  }

  const home = os.homedir();
  if (process.platform === 'darwin') {
    return path.join(home, 'Library', 'Application Support', 'TuneFlow', DEFAULT_CONFIG_FILENAME);
  }
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming');
    return path.join(appData, 'TuneFlow', DEFAULT_CONFIG_FILENAME);
  }
  const configHome = process.env.XDG_CONFIG_HOME || path.join(home, '.config');
  return path.join(configHome, 'tuneflow', DEFAULT_CONFIG_FILENAME);
}

/**
 * Creates default initial client configuration
 * @returns {object}
 */
function getDefaultClientConfig() {
  return {
    version: '1.0.0',
    activeProfile: 'default',
    profiles: {
      default: {
        name: 'Local Standalone',
        url: 'http://127.0.0.1:3000',
        timeoutMs: 5000,
        isLocalDaemon: true
      }
    },
    behavior: {
      autoReconnect: true,
      maxReconnectAttempts: 3,
      fallbackToStandalone: false
    }
  };
}

/**
 * Load and validate client config from disk
 * @param {string} configPath
 * @returns {object}
 */
function loadClientConfig(configPath) {
  if (!fs.existsSync(configPath)) {
    return getDefaultClientConfig();
  }

  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed.profiles || typeof parsed.profiles !== 'object') {
      return getDefaultClientConfig();
    }
    return {
      version: parsed.version || '1.0.0',
      activeProfile: parsed.activeProfile || Object.keys(parsed.profiles)[0] || 'default',
      profiles: parsed.profiles,
      behavior: Object.assign({
        autoReconnect: true,
        maxReconnectAttempts: 3,
        fallbackToStandalone: false
      }, parsed.behavior || {})
    };
  } catch (_err) {
    return getDefaultClientConfig();
  }
}

/**
 * Atomically save client config to disk with restricted permissions
 * @param {object} config
 * @param {string} configPath
 */
function saveClientConfig(config, configPath) {
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const tmpPath = `${configPath}.tmp.${Date.now()}`;
  fs.writeFileSync(tmpPath, JSON.stringify(config, null, 2), {
    mode: 0o600, // User-read/write only (chmod 600)
    encoding: 'utf8'
  });
  fs.renameSync(tmpPath, configPath);
}

/**
 * Add or update profile in client config
 * @param {object} config
 * @param {string} key
 * @param {{ name: string, url: string, authToken?: string, timeoutMs?: number, isLocalDaemon?: boolean }} data
 * @returns {boolean}
 */
function setProfile(config, key, data) {
  const validation = validateServerUrl(data.url);
  if (!validation.valid) {
    throw new Error(`Invalid server URL for profile "${key}": ${validation.error}`);
  }

  config.profiles[key] = {
    name: data.name || key,
    url: validation.normalizedUrl,
    authToken: data.authToken || null,
    timeoutMs: data.timeoutMs || 5000,
    isLocalDaemon: !!data.isLocalDaemon
  };
  return true;
}

/**
 * Resolve active server endpoint URL
 * @param {object} config
 * @returns {string}
 */
function resolveActiveServerUrl(config) {
  // 1. Environment variable override
  if (process.env.TUNEFLOW_SERVER_URL) {
    const v = validateServerUrl(process.env.TUNEFLOW_SERVER_URL);
    if (v.valid) return v.normalizedUrl;
  }

  // 2. Active profile lookup
  const profileKey = config.activeProfile || 'default';
  const profile = config.profiles[profileKey] || config.profiles[Object.keys(config.profiles)[0]];
  if (profile && profile.url) {
    const v = validateServerUrl(profile.url);
    if (v.valid) return v.normalizedUrl;
  }

  return 'http://127.0.0.1:3000';
}

module.exports = {
  validateServerUrl,
  resolveClientConfigPath,
  getDefaultClientConfig,
  loadClientConfig,
  saveClientConfig,
  setProfile,
  resolveActiveServerUrl
};
