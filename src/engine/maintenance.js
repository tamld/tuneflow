const { initDatabase } = require('../db/database');
const { SessionRepo } = require('../db/repositories/session_repo');
const { DB_PATH } = require('../config');

let activeInterval = null;
let repoInstance = null;

function getSessionRepo() {
  if (!repoInstance) {
    const db = initDatabase(DB_PATH);
    repoInstance = new SessionRepo(db);
  }
  return repoInstance;
}

function setSessionRepo(repo) {
  repoInstance = repo;
}

function runSessionCleanup() {
  try {
    const repo = getSessionRepo();
    const count = repo.cleanupExpiredSessions();
    if (count > 0) {
      console.log(`🧹 [Maintenance] Pruned ${count} expired session(s) from SQLite database.`);
    }
    return count;
  } catch (err) {
    console.error('❌ [Maintenance] Error during session cleanup:', err.message);
    return 0;
  }
}

let engineInterval = null;

async function runEngineMaintenanceSweep() {
  try {
    const { updateYtDlpBinary } = require('./ytdlp');
    const result = await updateYtDlpBinary();
    if (result && result.success) {
      console.log(`✅ [Maintenance] yt-dlp binary is up to date (${result.newVersion || 'latest'}).`);
    } else if (result && result.error) {
      console.warn(`⚠️ [Maintenance] yt-dlp check warning: ${result.error}`);
    }
    return result;
  } catch (err) {
    console.error('❌ [Maintenance] Error during engine maintenance sweep:', err.message);
    return { success: false, error: err.message };
  }
}

function startMaintenance(intervalMs = 60 * 60 * 1000, engineIntervalMs = 12 * 60 * 60 * 1000) {
  if (activeInterval) {
    return activeInterval;
  }

  // Run initial cleanup sweep on startup
  runSessionCleanup();

  activeInterval = setInterval(() => {
    runSessionCleanup();
  }, intervalMs);
  activeInterval.unref();

  if (engineIntervalMs && engineIntervalMs > 0) {
    engineInterval = setInterval(() => {
      runEngineMaintenanceSweep().catch(() => {});
    }, engineIntervalMs);
    engineInterval.unref();
  }

  console.log(`⏱️ [Maintenance] Automated session cleanup scheduled (every ${Math.round(intervalMs / 60000)}m).`);
  return activeInterval;
}

function stopMaintenance() {
  if (activeInterval) {
    clearInterval(activeInterval);
    activeInterval = null;
  }
  if (engineInterval) {
    clearInterval(engineInterval);
    engineInterval = null;
  }
  console.log('🛑 [Maintenance] Automated maintenance timer stopped.');
}

function isMaintenanceRunning() {
  return activeInterval !== null;
}

module.exports = {
  startMaintenance,
  stopMaintenance,
  runSessionCleanup,
  runEngineMaintenanceSweep,
  isMaintenanceRunning,
  setSessionRepo
};
