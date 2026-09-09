const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { initDatabase } = require('../src/db/database');
const { UserRepo } = require('../src/db/repositories/user_repo');
const { SessionRepo } = require('../src/db/repositories/session_repo');
const { GuestRepo } = require('../src/db/repositories/guest_repo');
const { hashPassword, verifyPassword, generateToken } = require('../src/auth/crypto_utils');
const { AuthService } = require('../src/auth/auth_service');

describe('Task 2: Crypto Utilities & AuthService Tests', () => {
  let tempDir;
  let dbPath;
  let db;
  let userRepo;
  let sessionRepo;
  let guestRepo;
  let authService;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tuneflow-auth-test-'));
    dbPath = path.join(tempDir, 'test.db');
    db = initDatabase(dbPath);
    userRepo = new UserRepo(db);
    sessionRepo = new SessionRepo(db);
    guestRepo = new GuestRepo(db);
    authService = new AuthService({ userRepo, sessionRepo, guestRepo });
  });

  afterEach(() => {
    if (db && typeof db.close === 'function') {
      db.close();
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Crypto Utilities', () => {
    it('should hash and verify password securely with scrypt and timingSafeEqual', () => {
      const { hash, salt } = hashPassword('MySecretPass123!');
      assert.ok(hash && salt, 'Hash and salt must be returned');

      const isMatch = verifyPassword('MySecretPass123!', hash, salt);
      assert.equal(isMatch, true, 'Valid password must verify true');

      const isWrong = verifyPassword('WrongPassword', hash, salt);
      assert.equal(isWrong, false, 'Wrong password must verify false');
    });

    it('should generate high-entropy random tokens', () => {
      const t1 = generateToken();
      const t2 = generateToken();
      assert.ok(t1.length >= 32);
      assert.notEqual(t1, t2);
    });
  });

  describe('AuthService Operations', () => {
    it('should bootstrap default admin user when database is empty', () => {
      const created = authService.ensureDefaultAdmin('AdminP@ssw0rd!');
      assert.ok(created, 'Default admin should be created');
      assert.equal(created.username, 'admin');
      assert.equal(created.role, 'admin');

      // Subsequent call should be no-op
      const secondCall = authService.ensureDefaultAdmin('AdminP@ssw0rd!');
      assert.equal(secondCall, null);
    });

    it('should authenticate user and issue session token', () => {
      const { hash, salt } = hashPassword('BoMe1234');
      userRepo.createUser({ username: 'bome', passwordHash: hash, salt, role: 'user' });

      const loginResult = authService.login({
        username: 'bome',
        password: 'BoMe1234',
        clientIp: '192.168.1.50',
        userAgent: 'SmartTV'
      });

      assert.ok(loginResult.token, 'Token must be issued');
      assert.equal(loginResult.user.username, 'bome');
      assert.equal(loginResult.user.role, 'user');

      // Verify getMe
      const me = authService.getMe(loginResult.token);
      assert.ok(me);
      assert.equal(me.username, 'bome');
      assert.equal(me.role, 'user');

      // Logout
      const loggedOut = authService.logout(loginResult.token);
      assert.equal(loggedOut, true);
      assert.equal(authService.getMe(loginResult.token), null);
    });

    it('should reject invalid credentials with specific error', () => {
      const { hash, salt } = hashPassword('Correct');
      userRepo.createUser({ username: 'user1', passwordHash: hash, salt, role: 'user' });

      assert.throws(() => {
        authService.login({ username: 'user1', password: 'Wrong' });
      }, /INVALID_CREDENTIALS/);

      assert.throws(() => {
        authService.login({ username: 'nonexistent', password: 'Any' });
      }, /INVALID_CREDENTIALS/);
    });

    it('should manage guest bootstrap and heartbeats', () => {
      const bootstrap = authService.guestBootstrap({
        guestId: 'guest-init-1',
        clientIp: '10.0.0.1',
        fingerprintHash: 'fp-1'
      });

      assert.equal(bootstrap.status, 'active');
      assert.equal(bootstrap.can_listen, true);
      assert.equal(bootstrap.remaining_sec, 1800);

      // Heartbeat 30 seconds
      const hb = authService.recordGuestHeartbeat({
        guestId: 'guest-init-1',
        durationSec: 30
      });

      assert.equal(hb.listen_duration_sec, 30);
      assert.equal(hb.remaining_sec, 1770);
      assert.equal(hb.can_listen, true);
    });
  });
});
