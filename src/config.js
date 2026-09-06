const path = require('path');
const fs = require('fs');

const ROOT_DIR = path.resolve(__dirname, '..');
const DOWNLOADS_DIR = process.env.DOWNLOADS_DIR || path.join(ROOT_DIR, 'downloads');
const TEMP_DIR = process.env.TEMP_DIR || path.join(DOWNLOADS_DIR, 'temp');

// Ensure directories exist
if (!fs.existsSync(DOWNLOADS_DIR)) {
  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

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
  DEFAULT_FORMAT: 'mp3',
  SUPPORTED_FORMATS: ['mp3', 'mp4', 'm4a']
};
