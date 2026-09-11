const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { initDatabase } = require('../src/db/database');
const { SessionRepo } = require('../src/db/repositories/session_repo');
const { UserRepo } = require('../src/db/repositories/user_repo');

describe('Issue #103: Automated Session Cleanup & Maintenance Engine Suite', () => {
  let db;
  let testDbPath;
  let sessionRepo;
  let userRepo;
  let testUserId;

  before(() => {
    testDbPath = path.join(os.tmpdir(), `tuneflow-maintenance-${Date.now()}.db`);
    db = initDatabase(testDbPath);
    sessionRepo = new SessionRepo(db);
    userRepo = new UserRepo(db);

    const user = userRepo.createUser({ username: 'cleanup_test_user', passwordHash: 'hash123', salt: 'salt123', role: 'user' });
    testUserId = user.id;
  });

  after(() => {
    try {
      db.close();
    } catch (_e) {}
    try {
      if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    } catch (_e) {}
  });

  it('should verify cleanupExpiredSessions returns count of deleted rows and retains active sessions', () => {
    const now = Date.now();

    // Create 3 expired sessions and 2 active sessions
    sessionRepo.createSession({ token: 'expired_token_1', userId: testUserId, role: 'user', expiresAt: now - 3600000 });
    sessionRepo.createSession({ token: 'expired_token_2', userId: testUserId, role: 'user', expiresAt: now - 1800000 });
    sessionRepo.createSession({ token: 'expired_token_3', userId: testUserId, role: 'user', expiresAt: now - 60000 });
    sessionRepo.createSession({ token: 'active_token_1', userId: testUserId, role: 'user', expiresAt: now + 3600000 });
    sessionRepo.createSession({ token: 'active_token_2', userId: testUserId, role: 'user', expiresAt: now + 7200000 });

    // Run cleanup
    const changes = sessionRepo.cleanupExpiredSessions();
    assert.strictEqual(typeof changes, 'number', 'cleanupExpiredSessions must return count number');
    assert.strictEqual(changes, 3, 'Must prune exactly 3 expired sessions');

    // Verify expired sessions are gone from DB
    const countRow = db.prepare("SELECT COUNT(*) as count FROM sessions WHERE token LIKE 'expired_token_%'").get();
    assert.strictEqual(countRow.count, 0, 'Expired sessions must be deleted from DB');

    // Verify active sessions remain intact
    assert.ok(sessionRepo.getSession('active_token_1'));
    assert.ok(sessionRepo.getSession('active_token_2'));
  });

  it('should verify maintenance engine module exists and exports lifecycle methods', () => {
    const maintenance = require('../src/engine/maintenance');
    assert.strictEqual(typeof maintenance.startMaintenance, 'function', 'Must export startMaintenance');
    assert.strictEqual(typeof maintenance.stopMaintenance, 'function', 'Must export stopMaintenance');
    assert.strictEqual(typeof maintenance.runSessionCleanup, 'function', 'Must export runSessionCleanup');
    assert.strictEqual(typeof maintenance.isMaintenanceRunning, 'function', 'Must export isMaintenanceRunning');
  });

  it('should verify runSessionCleanup executes successfully via maintenance engine', () => {
    const maintenance = require('../src/engine/maintenance');
    const prunedCount = maintenance.runSessionCleanup();
    assert.strictEqual(typeof prunedCount, 'number', 'runSessionCleanup must return integer count');
    assert.ok(prunedCount >= 0, 'Pruned count must be >= 0');
  });

  it('should verify maintenance timer lifecycle (start, double-start idempotency, and stop)', () => {
    const maintenance = require('../src/engine/maintenance');

    maintenance.startMaintenance(5000);
    assert.ok(maintenance.isMaintenanceRunning(), 'Maintenance must be running after start');

    // Idempotent start
    maintenance.startMaintenance(5000);
    assert.ok(maintenance.isMaintenanceRunning(), 'Maintenance must remain running on duplicate start');

    // Stop
    maintenance.stopMaintenance();
    assert.strictEqual(maintenance.isMaintenanceRunning(), false, 'Maintenance must stop after stopMaintenance');
  });

  it('should verify server.js gracefully integrates maintenance engine on startup and shutdown', () => {
    const serverJsPath = path.join(__dirname, '../src/server.js');
    const serverJs = fs.readFileSync(serverJsPath, 'utf8');

    assert.match(serverJs, /require\(['"].\/engine\/maintenance['"]\)/, 'server.js must import maintenance engine');
    assert.match(serverJs, /startMaintenance\s*\(/, 'server.js must call startMaintenance');
    assert.match(serverJs, /stopMaintenance\s*\(/, 'server.js must call stopMaintenance on graceful shutdown');
  });
});
