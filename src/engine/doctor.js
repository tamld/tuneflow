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
const { engineHealthMonitor } = require('./engine_health');

/**
 * Check whether a binary exists statically on the filesystem or within PATH.
 * Distinguishes static disk presence from runtime executability.
 * @param {string} binPath
 * @returns {boolean}
 */
function checkBinaryStaticPresence(binPath) {
  if (!binPath) return false;
  if (path.isAbsolute(binPath)) {
    return fs.existsSync(binPath);
  }
  const pathEnv = process.env.PATH || "";
  const delimiter = process.platform === "win32" ? ";" : ":";
  const dirs = pathEnv.split(delimiter);
  const ext = process.platform === "win32" ? ".exe" : "";
  for (const dir of dirs) {
    if (!dir) continue;
    try {
      const full = path.join(dir, `${binPath}${ext}`);
      if (fs.existsSync(full)) return true;
    } catch (_e) {}
  }
  return false;
}

/**
 * Probes runtime writability by creating, writing, and unlinking a temporary file.
 * Handles read-only container mounts, NFS root_squash, and ACLs where accessSync(W_OK) lies.
 * Guarantees zero orphan file leakage via strict try/finally cleanup.
 * @param {string} dirPath
 * @returns {{ writable: boolean, writeProbe: string, error: string|null }}
 */
function probeDirectoryWritability(dirPath) {
  let writable = false;
  let writeProbe = "skipped";
  let error = null;

  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    fs.accessSync(dirPath, fs.constants.W_OK);

    const probeFile = path.join(
      dirPath,
      `.tuneflow_doctor_probe_${Date.now()}_${process.pid}_${Math.random().toString(36).slice(2)}.tmp`
    );
    try {
      fs.writeFileSync(probeFile, "ok", "utf8");
      writeProbe = "passed";
      writable = true;
    } finally {
      try {
        if (fs.existsSync(probeFile)) {
          fs.unlinkSync(probeFile);
        }
      } catch (_cleanupErr) {
        // Suppress cleanup error to avoid masking probe status
      }
    }
  } catch (err) {
    error = err.message;
    writeProbe = "failed";
    writable = false;
  }

  return { writable, writeProbe, error };
}

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

  // 2. Downloads Directory Check (Static existence + Probed runtime writability)
  const downloadsExists = fs.existsSync(DOWNLOADS_DIR);
  let audioFilesCount = 0;
  try {
    if (downloadsExists) {
      const files = fs.readdirSync(DOWNLOADS_DIR);
      audioFilesCount = files.filter(f => /\.(mp3|m4a|webm|wav)$/i.test(f)).length;
    }
  } catch (_e) {}

  const probeResult = probeDirectoryWritability(DOWNLOADS_DIR);

  const downloadsDirCheck = {
    ok: probeResult.writable,
    writable: probeResult.writable,
    exists: downloadsExists || probeResult.writable,
    probed: true,
    writeProbe: probeResult.writeProbe,
    path: DOWNLOADS_DIR,
    audioFilesCount,
    ...(probeResult.error ? { error: probeResult.error } : {})
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

  // 4. yt-dlp & ffmpeg Sidecar Checks (Static presence vs Probed runtime execution)
  const ytdlpBin = resolveSidecarBinary("yt-dlp");
  const ffmpegBin = resolveSidecarBinary("ffmpeg");

  const ytdlpPresent = checkBinaryStaticPresence(ytdlpBin);
  const ffmpegPresent = checkBinaryStaticPresence(ffmpegBin);

  const [ytdlpVersion, ffmpegVersion] = await Promise.all([
    getYtDlpVersion().catch(() => "Unavailable"),
    getFFmpegVersion().catch(() => "Unavailable")
  ]);

  const INVALID_VERSIONS = ["Unavailable", "not_installed", "unknown", ""];
  const ytdlpRuntimeVerified = Boolean(ytdlpVersion && !INVALID_VERSIONS.includes(ytdlpVersion));
  const ffmpegRuntimeVerified = Boolean(ffmpegVersion && !INVALID_VERSIONS.includes(ffmpegVersion));

  const ytdlpOk = ytdlpPresent && ytdlpRuntimeVerified;
  const ffmpegOk = ffmpegPresent && ffmpegRuntimeVerified;

  const ytdlpStatus = ytdlpOk ? "operational" : (ytdlpPresent ? "exec_failed" : "missing");
  const ffmpegStatus = ffmpegOk ? "operational" : (ffmpegPresent ? "exec_failed" : "missing");

  const engineHealthStatus = engineHealthMonitor.getStatus();

  const checks = {
    node: nodeCheck,
    downloadsDir: downloadsDirCheck,
    database: databaseCheck,
    ytdlp: {
      ok: ytdlpOk,
      binary: ytdlpBin,
      version: ytdlpVersion,
      present: ytdlpPresent,
      runtimeVerified: ytdlpRuntimeVerified,
      status: ytdlpStatus
    },
    ffmpeg: {
      ok: ffmpegOk,
      binary: ffmpegBin,
      version: ffmpegVersion,
      present: ffmpegPresent,
      runtimeVerified: ffmpegRuntimeVerified,
      status: ffmpegStatus
    },
    processes: {
      ok: true,
      ...processManager.getSnapshot()
    },
    engineHealth: {
      ok: engineHealthStatus.healthy,
      ...engineHealthStatus
    }
  };

  const coreHealthy = nodeCheck.ok && downloadsDirCheck.ok && databaseCheck.ok;
  const status = (coreHealthy && ytdlpOk && !engineHealthStatus.degraded) ? "healthy" : "degraded";

  const report = {
    ok: coreHealthy,
    success: coreHealthy,
    status,
    timestamp: new Date().toISOString(),
    checks
  };

  if (writeLog && process.env.LOCALAPPDATA) {
    try {
      const logDir = path.join(process.env.LOCALAPPDATA, "TuneFlow", "logs");
      fs.mkdirSync(logDir, { recursive: true });
      fs.writeFileSync(path.join(logDir, "doctor.json"), JSON.stringify(report, null, 2), "utf8");
    } catch (_e) {
      // Non-fatal if log dir cannot be written in sandboxed env
    }
  }

  return report;
}

module.exports = {
  runSystemDoctor,
  checkBinaryStaticPresence,
  probeDirectoryWritability
};
