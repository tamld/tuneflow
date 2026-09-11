const path = require('path');
const fs = require('fs');
const os = require('os');
const { resolveStoragePaths } = require('./security/binary_guard');

// Ensure standard binary directories are in PATH (GUI apps on macOS/Linux don't inherit shell PATH)
if (process.platform !== 'win32') {
  const extraPaths = [
    '/opt/homebrew/bin',
    '/opt/homebrew/sbin',
    '/usr/local/bin',
    '/usr/bin',
    '/bin',
    '/usr/sbin',
    '/sbin',
    path.join(os.homedir(), '.local', 'bin')
  ];
  const current = (process.env.PATH || '').split(path.delimiter);
  for (const p of extraPaths) {
    if (fs.existsSync(p) && !current.includes(p)) {
      current.unshift(p);
    }
  }
  process.env.PATH = current.join(path.delimiter);
}

const ROOT_DIR = path.resolve(__dirname, '..');
const storage = resolveStoragePaths(process.platform);
const DOWNLOADS_DIR = process.env.DOWNLOADS_DIR || storage.downloadsDir;
const TEMP_DIR = process.env.TEMP_DIR || path.join(DOWNLOADS_DIR, 'temp');

const DATA_DIR = process.env.DATA_DIR || storage.dataDir;

// Ensure directories exist
if (!fs.existsSync(DOWNLOADS_DIR)) {
  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'tuneflow.db');

module.exports = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  ROOT_DIR,
  DOWNLOADS_DIR,
  TEMP_DIR,
  MAX_DOWNLOADS: parseInt(process.env.MAX_DOWNLOADS || '2', 10),
  MAX_CONVERSIONS: parseInt(process.env.MAX_CONVERSIONS || '1', 10),
  MAX_RETRIES: parseInt(process.env.MAX_RETRIES || '3', 10),
  DOWNLOAD_TTL_HOURS: parseInt(process.env.DOWNLOAD_TTL_HOURS || '24', 10),
  MAX_STORAGE_MB: parseInt(process.env.MAX_STORAGE_MB || '2048', 10),
  DATA_DIR,
  DB_PATH,
  GUEST_MAX_LISTEN_SEC: parseInt(process.env.GUEST_MAX_LISTEN_SEC || '1800', 10),
  GUEST_COOLDOWN_SEC: parseInt(process.env.GUEST_COOLDOWN_SEC || '3600', 10),
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin',
  DEFAULT_FORMAT: 'mp3',
  SUPPORTED_FORMATS: ['mp3', 'mp4', 'm4a'],
  YTDLP_COOKIES_PATH: process.env.YTDLP_COOKIES_PATH || (fs.existsSync(path.join(ROOT_DIR, 'cookies.txt')) ? path.join(ROOT_DIR, 'cookies.txt') : null),
  YTDLP_PROXY: process.env.YTDLP_PROXY || null,
  YTDLP_EXTRACTOR_ARGS: process.env.YTDLP_EXTRACTOR_ARGS || null
};
