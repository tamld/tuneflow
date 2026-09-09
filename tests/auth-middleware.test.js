const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { initDatabase } = require('../src/db/database');
const { UserRepo } = require('../src/db/repositories/user_repo');
const { SessionRepo } = require('../src/db/repositories/session_repo');
const { GuestRepo } = require('../src/db/repositories/guest_repo');
const { hashPassword } = require('../src/auth/crypto_utils');
const { AuthService } = require('../src/auth/auth_service');
const { createAuthenticateMiddleware } = require('../src/middleware/authenticate');
const { authorize } = require('../src/middleware/authorize');
const { createGuestGuardMiddleware } = require('../src/middleware/guest_guard');

describe('Task 3: RBAC & Guest Guard Middleware Tests', () => {
  let tempDir;
  let dbPath;
  let db;
  let userRepo;
  let sessionRepo;
  let guestRepo;
  let authService;
  let authenticate;
  let guestGuard;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tuneflow-mw-test-'));
    dbPath = path.join(tempDir, 'test.db');
    db = initDatabase(dbPath);
    userRepo = new UserRepo(db);
    sessionRepo = new SessionRepo(db);
    guestRepo = new GuestRepo(db);
    authService = new AuthService({ userRepo, sessionRepo, guestRepo });
    authenticate = createAuthenticateMiddleware(authService);
    guestGuard = createGuestGuardMiddleware(guestRepo);
  });

  afterEach(() => {
    if (db && typeof db.close === 'function') {
      db.close();
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Authenticate Middleware', () => {
    it('should identify unauthenticated visitor as Guest with 1800s quota', () => {
      const req = {
        headers: { 'x-guest-id': 'guest-test-1', 'x-fingerprint': 'fp-123' },
        ip: '127.0.0.1',
        socket: { remoteAddress: '127.0.0.1' },
        query: {}
      };
      let nextCalled = false;

      authenticate(req, {}, () => { nextCalled = true; });

      assert.ok(nextCalled);
      assert.ok(req.user);
      assert.equal(req.user.role, 'guest');
      assert.equal(req.user.isGuest, true);
      assert.equal(req.user.guest.remaining_sec, 1800);
      assert.equal(req.user.guest.can_listen, true);
    });

    it('should authenticate valid User token and attach user profile', () => {
      const { hash, salt } = hashPassword('Pass123');
      const user = userRepo.createUser({ username: 'member', passwordHash: hash, salt, role: 'user' });
      const login = authService.login({ username: 'member', password: 'Pass123' });

      const req = {
        headers: { authorization: `Bearer ${login.token}` },
        socket: { remoteAddress: '127.0.0.1' },
        query: {}
      };
      let nextCalled = false;

      authenticate(req, {}, () => { nextCalled = true; });

      assert.ok(nextCalled);
      assert.equal(req.user.id, user.id);
      assert.equal(req.user.username, 'member');
      assert.equal(req.user.role, 'user');
      assert.equal(req.user.isGuest, false);
    });
  });

  describe('Authorize (RBAC) Middleware', () => {
    it('should allow user with matching role and reject insufficient role with 403', () => {
      const requireAdmin = authorize('admin');
      const requireUserOrAdmin = authorize('admin', 'user');

      const adminReq = { user: { role: 'admin' } };
      const userReq = { user: { role: 'user' } };
      const guestReq = { user: { role: 'guest' } };

      let adminAllowed = false;
      requireAdmin(adminReq, {}, () => { adminAllowed = true; });
      assert.ok(adminAllowed, 'Admin should pass requireAdmin');

      let userStatus = null;
      let userBody = null;
      const resMock = {
        status: (code) => { userStatus = code; return resMock; },
        json: (data) => { userBody = data; return resMock; }
      };

      requireAdmin(userReq, resMock, () => { assert.fail('User should not pass requireAdmin'); });
      assert.equal(userStatus, 403);
      assert.equal(userBody.error, 'FORBIDDEN');

      let userAllowed = false;
      requireUserOrAdmin(userReq, {}, () => { userAllowed = true; });
      assert.ok(userAllowed, 'User should pass requireUserOrAdmin');

      requireUserOrAdmin(guestReq, resMock, () => { assert.fail('Guest should not pass requireUserOrAdmin'); });
      assert.equal(userStatus, 403);
    });
  });

  describe('Guest Guard Middleware (30-min Limit & Cooldown)', () => {
    it('should allow Admin and User unconditionally', () => {
      const adminReq = { user: { role: 'admin' } };
      const userReq = { user: { role: 'user' } };

      let nextAdmin = false;
      guestGuard(adminReq, {}, () => { nextAdmin = true; });
      assert.ok(nextAdmin);

      let nextUser = false;
      guestGuard(userReq, {}, () => { nextUser = true; });
      assert.ok(nextUser);
    });

    it('should allow Guest when quota is remaining, and reject with 403 when cooldown is active', () => {
      const guest = guestRepo.getOrCreateGuest({ guestId: 'g-active', clientIp: '1.2.3.4', fingerprintHash: 'f-1' });
      const activeReq = { user: { role: 'guest', guest } };

      let nextGuest = false;
      guestGuard(activeReq, {}, () => { nextGuest = true; });
      assert.ok(nextGuest, 'Active guest with remaining time must be allowed');

      // Consume full 1800s to trigger cooldown
      guestRepo.recordListeningTime('g-active', 1800);
      const lockedGuest = guestRepo.getOrCreateGuest({ guestId: 'g-active', clientIp: '1.2.3.4', fingerprintHash: 'f-1' });
      const lockedReq = { user: { role: 'guest', guest: lockedGuest } };

      let lockedStatus = null;
      let lockedBody = null;
      const resMock = {
        status: (code) => { lockedStatus = code; return resMock; },
        json: (data) => { lockedBody = data; return resMock; }
      };

      guestGuard(lockedReq, resMock, () => { assert.fail('Locked guest must be blocked'); });
      assert.equal(lockedStatus, 403);
      assert.equal(lockedBody.error, 'GUEST_COOLDOWN_ACTIVE');
      assert.ok(lockedBody.cooldownRemainingSec > 0);
    });
  });
});
