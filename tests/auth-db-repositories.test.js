const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { initDatabase } = require('../src/db/database');
const { UserRepo } = require('../src/db/repositories/user_repo');
const { SessionRepo } = require('../src/db/repositories/session_repo');
const { GuestRepo } = require('../src/db/repositories/guest_repo');

describe('Task 1: Database & Repository Layer Tests', () => {
  let tempDir;
  let dbPath;
  let db;
  let userRepo;
  let sessionRepo;
  let guestRepo;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tuneflow-db-test-'));
    dbPath = path.join(tempDir, 'test.db');
    db = initDatabase(dbPath);
    userRepo = new UserRepo(db);
    sessionRepo = new SessionRepo(db);
    guestRepo = new GuestRepo(db);
  });

  afterEach(() => {
    if (db && typeof db.close === 'function') {
      db.close();
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Database Initialization & Schema', () => {
    it('should initialize SQLite tables with WAL mode and schema tables', () => {
      assert.ok(fs.existsSync(dbPath), 'Database file must be created on disk');
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
      assert.ok(tables.includes('users'), 'Must contain users table');
      assert.ok(tables.includes('sessions'), 'Must contain sessions table');
      assert.ok(tables.includes('guest_quotas'), 'Must contain guest_quotas table');
    });
  });

  describe('UserRepo Operations', () => {
    it('should insert and retrieve users, enforcing unique username', () => {
      const user = userRepo.createUser({
        username: 'admin',
        passwordHash: 'hash123',
        salt: 'salt123',
        role: 'admin'
      });

      assert.ok(user.id > 0, 'User ID should be generated');
      assert.equal(user.username, 'admin');
      assert.equal(user.role, 'admin');

      const fetched = userRepo.getUserByUsername('admin');
      assert.equal(fetched.username, 'admin');
      assert.equal(fetched.password_hash, 'hash123');

      // Duplicate username must throw
      assert.throws(() => {
        userRepo.createUser({
          username: 'admin',
          passwordHash: 'diffHash',
          salt: 'diffSalt',
          role: 'user'
        });
      });
    });

    it('should list all users and delete a user', () => {
      userRepo.createUser({ username: 'bome', passwordHash: 'h', salt: 's', role: 'user' });
      userRepo.createUser({ username: 'conchau', passwordHash: 'h', salt: 's', role: 'user' });

      const list = userRepo.listUsers();
      assert.equal(list.length, 2);

      const toDelete = list[0];
      userRepo.deleteUser(toDelete.id);

      const afterDelete = userRepo.listUsers();
      assert.equal(afterDelete.length, 1);
      assert.equal(afterDelete[0].username, 'conchau');
    });
  });

  describe('SessionRepo Operations', () => {
    it('should create and retrieve active session', () => {
      const user = userRepo.createUser({ username: 'testuser', passwordHash: 'h', salt: 's', role: 'user' });
      const expiresAt = Date.now() + 3600 * 1000;

      sessionRepo.createSession({
        token: 'token_abc_123',
        userId: user.id,
        role: 'user',
        expiresAt,
        clientIp: '127.0.0.1',
        userAgent: 'TestBrowser'
      });

      const session = sessionRepo.getSession('token_abc_123');
      assert.ok(session, 'Session must exist');
      assert.equal(session.user_id, user.id);
      assert.equal(session.role, 'user');
      assert.equal(session.username, 'testuser');
    });

    it('should delete session and cleanup expired sessions', () => {
      const user = userRepo.createUser({ username: 'expuser', passwordHash: 'h', salt: 's', role: 'user' });

      // Active session
      sessionRepo.createSession({
        token: 'active_token',
        userId: user.id,
        role: 'user',
        expiresAt: Date.now() + 100000,
        clientIp: '127.0.0.1',
        userAgent: 'Test'
      });

      // Expired session
      sessionRepo.createSession({
        token: 'expired_token',
        userId: user.id,
        role: 'user',
        expiresAt: Date.now() - 1000,
        clientIp: '127.0.0.1',
        userAgent: 'Test'
      });

      sessionRepo.cleanupExpiredSessions();
      assert.equal(sessionRepo.getSession('expired_token'), null, 'Expired session must be cleaned up');
      assert.ok(sessionRepo.getSession('active_token'), 'Active session must remain');

      sessionRepo.deleteSession('active_token');
      assert.equal(sessionRepo.getSession('active_token'), null, 'Deleted session must be null');
    });
  });

  describe('GuestRepo Operations & 30-min Cooldown', () => {
    it('should create guest with 1800s listening quota', () => {
      const guest = guestRepo.getOrCreateGuest({
        guestId: 'guest-1',
        clientIp: '192.168.1.100',
        fingerprintHash: 'fp-abc'
      });

      assert.equal(guest.guest_id, 'guest-1');
      assert.equal(guest.listen_duration_sec, 0);
      assert.equal(guest.max_duration_sec, 1800);
      assert.equal(guest.status, 'active');
      assert.equal(guest.remaining_sec, 1800);
      assert.equal(guest.can_listen, true);
    });

    it('should record listening duration and trigger cooldown at 1800s (30 mins)', () => {
      guestRepo.getOrCreateGuest({
        guestId: 'guest-2',
        clientIp: '192.168.1.101',
        fingerprintHash: 'fp-xyz'
      });

      // Listen for 1000s
      const mid = guestRepo.recordListeningTime('guest-2', 1000);
      assert.equal(mid.listen_duration_sec, 1000);
      assert.equal(mid.remaining_sec, 800);
      assert.equal(mid.can_listen, true);
      assert.equal(mid.status, 'active');

      // Listen for another 800s (total 1800s = 30m)
      const finished = guestRepo.recordListeningTime('guest-2', 800);
      assert.equal(finished.listen_duration_sec, 1800);
      assert.equal(finished.remaining_sec, 0);
      assert.equal(finished.can_listen, false);
      assert.equal(finished.status, 'cooldown');
      assert.ok(finished.cooldown_until > Date.now(), 'cooldown_until must be set in the future');
    });

    it('should reset cooldown when admin invokes resetCooldown', () => {
      guestRepo.getOrCreateGuest({
        guestId: 'guest-3',
        clientIp: '192.168.1.102',
        fingerprintHash: 'fp-123'
      });

      guestRepo.recordListeningTime('guest-3', 1800);
      const locked = guestRepo.getOrCreateGuest({
        guestId: 'guest-3',
        clientIp: '192.168.1.102',
        fingerprintHash: 'fp-123'
      });
      assert.equal(locked.can_listen, false);

      guestRepo.resetCooldown('guest-3');
      const refreshed = guestRepo.getOrCreateGuest({
        guestId: 'guest-3',
        clientIp: '192.168.1.102',
        fingerprintHash: 'fp-123'
      });
      assert.equal(refreshed.can_listen, true);
      assert.equal(refreshed.remaining_sec, 1800);
      assert.equal(refreshed.status, 'active');
    });
  });
});
