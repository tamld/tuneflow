const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { initDatabase } = require('../src/db/database');
const { UserRepo } = require('../src/db/repositories/user_repo');
const { SessionRepo } = require('../src/db/repositories/session_repo');
const { GuestRepo } = require('../src/db/repositories/guest_repo');
const { AuthService } = require('../src/auth/auth_service');
const { verifyPassword } = require('../src/auth/crypto_utils');

describe('Task 5: Security Hardening & Fuzzing Suite', () => {
  let tempDir;
  let dbPath;
  let db;
  let userRepo;
  let sessionRepo;
  let guestRepo;
  let authService;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tuneflow-sec-test-'));
    dbPath = path.join(tempDir, 'test.db');
    db = initDatabase(dbPath);
    userRepo = new UserRepo(db);
    sessionRepo = new SessionRepo(db);
    guestRepo = new GuestRepo(db);
    authService = new AuthService({ userRepo, sessionRepo, guestRepo });
    authService.ensureDefaultAdmin('AdminSecure123!');
  });

  afterEach(() => {
    if (db && typeof db.close === 'function') {
      db.close();
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Anti-Bypass Guest Cooldown Hardening', () => {
    it('should prevent cooldown bypass via fingerprint spoofing on same IP', () => {
      const ip = '203.0.113.45';

      // Initial guest session
      const g1 = guestRepo.getOrCreateGuest({
        guestId: 'g-initial',
        clientIp: ip,
        fingerprintHash: 'browser-fp-1'
      });
      assert.equal(g1.can_listen, true);

      // Consume full 30 mins
      guestRepo.recordListeningTime(g1.guest_id, 1800);

      const lockedG1 = guestRepo.getOrCreateGuest({
        guestId: 'g-initial',
        clientIp: ip,
        fingerprintHash: 'browser-fp-1'
      });
      assert.equal(lockedG1.can_listen, false);
      assert.equal(lockedG1.status, 'cooldown');

      // Attacker tries spoofing new guestId and new fingerprint from same IP
      const bypassAttempt = guestRepo.getOrCreateGuest({
        guestId: 'g-spoofed-new',
        clientIp: ip,
        fingerprintHash: 'spoofed-fp-2'
      });

      assert.equal(bypassAttempt.status, 'cooldown', 'Must inherit cooldown from IP');
      assert.equal(bypassAttempt.can_listen, false, 'Must block listening on same IP during cooldown');
    });
  });

  describe('SQL Injection Fuzzing on Login & Repositories', () => {
    const maliciousPayloads = [
      "' OR 1=1 --",
      "admin' --",
      "'; DROP TABLE users; --",
      "admin' OR 'a'='a",
      '1" OR "1"="1',
      '\x00admin',
      '{{7*7}}',
      '<script>alert(1)</script>'
    ];

    it('should resist SQL injection in authentication without leaking data or throwing', () => {
      for (const payload of maliciousPayloads) {
        // Test login with malicious username
        assert.throws(() => {
          authService.login({ username: payload, password: 'password' });
        }, /INVALID_CREDENTIALS/);

        // Test login with malicious password
        assert.throws(() => {
          authService.login({ username: 'admin', password: payload });
        }, /INVALID_CREDENTIALS/);

        // Ensure users table remains intact
        const users = userRepo.listUsers();
        assert.ok(users.length >= 1, 'Users table must not be deleted or corrupted');
      }
    });
  });

  describe('Timing Attack Resistance & Cryptographic Invariants', () => {
    it('should handle malformed, empty, or truncated inputs to verifyPassword gracefully without crashing', () => {
      assert.equal(verifyPassword('', '', ''), false);
      assert.equal(verifyPassword(null, undefined, false), false);
      assert.equal(verifyPassword('pass', 'truncated', 'salt'), false);
      assert.equal(verifyPassword('pass', 'not_hex', 'not_hex'), false);
      assert.equal(verifyPassword('pass', 'a'.repeat(64), 'b'.repeat(16)), false);
    });
  });
});
