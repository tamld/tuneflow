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

function startMaintenance(intervalMs = 60 * 60 * 1000) {
  if (activeInterval) {
    return activeInterval;
  }

  // Run initial cleanup sweep on startup
  runSessionCleanup();

  activeInterval = setInterval(() => {
    runSessionCleanup();
  }, intervalMs);

  activeInterval.unref();
  console.log(`⏱️ [Maintenance] Automated session cleanup scheduled (every ${Math.round(intervalMs / 60000)}m).`);
  return activeInterval;
}

function stopMaintenance() {
  if (activeInterval) {
    clearInterval(activeInterval);
    activeInterval = null;
    console.log('🛑 [Maintenance] Automated maintenance timer stopped.');
  }
}

function isMaintenanceRunning() {
  return activeInterval !== null;
}

module.exports = {
  startMaintenance,
  stopMaintenance,
  runSessionCleanup,
  isMaintenanceRunning,
  setSessionRepo
};
