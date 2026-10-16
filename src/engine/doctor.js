/**
 * TuneFlow Built-In System Doctor & Troubleshooter (SPEC-0017 / REQ-PKG-02)
 * Verifies Node runtime, SQLite database, Downloads directory writability,
 * and yt-dlp / ffmpeg sidecar binaries.
 */

const fs = require('fs');
const path = require('path');
const { DOWNLOADS_DIR, DB_PATH } = require('../config');
const { initDatabase } = require('../db/database');
const { resolveSidecarBinary } = require('../security/binary_guard');
const { getYtDlpVersion, getFFmpegVersion } = require('./ytdlp');
const { processManager } = require('./process_manager');

/**
 * Run comprehensive system diagnostics for CLI (`--doctor`) and HTTP (`/api/system/doctor`).
 * @param {object} [options]
 * @param {boolean} [options.writeLog=true]
 * @returns {Promise<object>}
 */
async function runSystemDoctor(options = {}) {
  const writeLog = options.writeLog !== false;

  // 1. Node Runtime Check
  const nodeCheck = {
    ok: true,
    version: process.version,
    platform: process.platform,
    arch: process.arch,
    execPath: process.execPath
  };

  // 2. Downloads Directory Check
  let downloadsWritable = false;
  let audioFilesCount = 0;
  let downloadsError = null;
  try {
    if (!fs.existsSync(DOWNLOADS_DIR)) {
      fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
    }
    fs.accessSync(DOWNLOADS_DIR, fs.constants.W_OK);
    downloadsWritable = true;
    const files = fs.readdirSync(DOWNLOADS_DIR);
    audioFilesCount = files.filter(f => /\.(mp3|m4a|webm|wav)$/i.test(f)).length;
  } catch (err) {
    downloadsError = err.message;
  }

  const downloadsDirCheck = {
    ok: downloadsWritable,
    writable: downloadsWritable,
    path: DOWNLOADS_DIR,
    audioFilesCount,
    ...(downloadsError ? { error: downloadsError } : {})
  };

  // 3. SQLite Database Check
  let dbOk = false;
  let dbError = null;
  try {
    const dbInstance = initDatabase(DB_PATH);
    if (dbInstance) {
      dbOk = true;
    }
  } catch (err) {
    dbError = err.message;
  }

  const databaseCheck = {
    ok: dbOk,
    path: DB_PATH,
    ...(dbError ? { error: dbError } : {})
  };

  // 4. yt-dlp & ffmpeg Sidecar Checks
  const ytdlpBin = resolveSidecarBinary('yt-dlp');
  const ffmpegBin = resolveSidecarBinary('ffmpeg');
  const [ytdlpVersion, ffmpegVersion] = await Promise.all([
    getYtDlpVersion().catch(() => 'Unavailable'),
    getFFmpegVersion().catch(() => 'Unavailable')
  ]);

  const ytdlpOk = Boolean(ytdlpVersion && ytdlpVersion !== 'Unavailable');
  const ffmpegOk = Boolean(ffmpegVersion && ffmpegVersion !== 'Unavailable');

  const checks = {
    node: nodeCheck,
    downloadsDir: downloadsDirCheck,
    database: databaseCheck,
    ytdlp: {
      ok: ytdlpOk,
      binary: ytdlpBin,
      version: ytdlpVersion
    },
    ffmpeg: {
      ok: ffmpegOk,
      binary: ffmpegBin,
      version: ffmpegVersion
    },
    processes: {
      ok: true,
      ...processManager.getSnapshot()
    }
  };

  const coreHealthy = nodeCheck.ok && downloadsDirCheck.ok && databaseCheck.ok;
  const status = (coreHealthy && ytdlpOk) ? 'healthy' : 'degraded';

  const report = {
    ok: coreHealthy,
    success: coreHealthy,
    status,
    timestamp: new Date().toISOString(),
    checks
  };

  if (writeLog && process.env.LOCALAPPDATA) {
    try {
      const logDir = path.join(process.env.LOCALAPPDATA, 'TuneFlow', 'logs');
      fs.mkdirSync(logDir, { recursive: true });
      fs.writeFileSync(path.join(logDir, 'doctor.json'), JSON.stringify(report, null, 2), 'utf8');
    } catch (_e) {
      // Non-fatal if log dir cannot be written in sandboxed env
    }
  }

  return report;
}

module.exports = {
  runSystemDoctor
};
