const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const express = require('express');

const { initDatabase } = require('../src/db/database');
const { UserRepo } = require('../src/db/repositories/user_repo');
const { SessionRepo } = require('../src/db/repositories/session_repo');
const { GuestRepo } = require('../src/db/repositories/guest_repo');
const { AuthService } = require('../src/auth/auth_service');
const { createAuthenticateMiddleware } = require('../src/middleware/authenticate');
const { createAdminRouter } = require('../src/routes/admin_routes');

describe('Issue #84: Admin Active Session Management & Kick-Out Suite', () => {
  const testDbDir = path.join(__dirname, '..', 'data', 'test_sessions');
  const testDbPath = path.join(testDbDir, 'test_sessions.db');

  let db;
  let userRepo;
  let sessionRepo;
  let guestRepo;
  let authService;
  let server;
  let serverPort;

  let adminUser;
  let adminSession;
  let regularUser1;
  let regularSession1;
  let regularUser2;
  let regularSession2;

  before(async () => {
    if (fs.existsSync(testDbDir)) {
      fs.rmSync(testDbDir, { recursive: true, force: true });
    }

    db = initDatabase(testDbPath);
    userRepo = new UserRepo(db);
    sessionRepo = new SessionRepo(db);
    guestRepo = new GuestRepo(db, 1800, 3600);
    authService = new AuthService({ userRepo, sessionRepo, guestRepo });

    const app = express();
    app.use(express.json());
    app.use(createAuthenticateMiddleware(authService));
    app.use('/api/admin', createAdminRouter({ userRepo, guestRepo, sessionRepo }));

    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        serverPort = server.address().port;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (fs.existsSync(testDbDir)) {
      try {
        fs.rmSync(testDbDir, { recursive: true, force: true });
      } catch (_e) {}
    }
  });

  beforeEach(() => {
    // Clean and reseed users and sessions
    db.exec('DELETE FROM sessions');
    db.exec('DELETE FROM users');
    db.exec('DELETE FROM guest_quotas');

    adminUser = authService.ensureDefaultAdmin('admin_pass_123');
    regularUser1 = userRepo.createUser({ username: 'family_dad', passwordHash: 'hash1', salt: 'salt1', role: 'user' });
    regularUser2 = userRepo.createUser({ username: 'family_mom', passwordHash: 'hash2', salt: 'salt2', role: 'user' });

    adminSession = sessionRepo.createSession({
      token: 'admin_token_xyz',
      userId: adminUser.id,
      role: 'admin',
      expiresAt: Date.now() + 86400000,
      clientIp: '192.168.1.10',
      userAgent: 'Chrome on Mac'
    });

    regularSession1 = sessionRepo.createSession({
      token: 'user1_token_abc',
      userId: regularUser1.id,
      role: 'user',
      expiresAt: Date.now() + 86400000,
      clientIp: '192.168.1.20',
      userAgent: 'Safari on iPhone'
    });

    regularSession2 = sessionRepo.createSession({
      token: 'user2_token_def',
      userId: regularUser2.id,
      role: 'user',
      expiresAt: Date.now() + 86400000,
      clientIp: '192.168.1.30',
      userAgent: 'TuneFlow Android TV'
    });

    guestRepo.getOrCreateGuest({
      guestId: 'guest_101',
      clientIp: '192.168.1.50',
      fingerprintHash: 'fp_guest_1'
    });
  });

  describe('1. Active Session Discovery (GET /api/admin/sessions)', () => {
    it('should list all active sessions with user details, IP, device, and metrics', async () => {
      const res = await fetch(`http://127.0.0.1:${serverPort}/api/admin/sessions`, {
        headers: { Authorization: `Bearer ${adminSession.token}` }
      });
      assert.strictEqual(res.status, 200);

      const data = await res.json();
      assert.ok(data.ok);
      assert.strictEqual(data.sessions.length, 3);
      assert.strictEqual(data.metrics.totalActive, 3);
      assert.strictEqual(data.metrics.activeGuests, 1);
      assert.strictEqual(data.metrics.roles.admin, 1);
      assert.strictEqual(data.metrics.roles.user, 2);

      const adminEntry = data.sessions.find(s => s.username === 'admin');
      assert.ok(adminEntry);
      assert.strictEqual(adminEntry.isCurrent, true);
      assert.strictEqual(adminEntry.clientIp, '192.168.1.10');
      assert.strictEqual(adminEntry.userAgent, 'Chrome on Mac');

      const userEntry = data.sessions.find(s => s.username === 'family_dad');
      assert.ok(userEntry);
      assert.strictEqual(userEntry.isCurrent, false);
      assert.strictEqual(userEntry.role, 'user');
    });

    it('should reject unauthorized access from regular user (403 Forbidden)', async () => {
      const res = await fetch(`http://127.0.0.1:${serverPort}/api/admin/sessions`, {
        headers: { Authorization: `Bearer ${regularSession1.token}` }
      });
      assert.strictEqual(res.status, 403);
    });

    it('should reject unauthenticated request without token (403 or 401)', async () => {
      const res = await fetch(`http://127.0.0.1:${serverPort}/api/admin/sessions`, {
        headers: { 'x-guest-id': 'guest_101' }
      });
      assert.strictEqual(res.status, 403);
    });
  });

  describe('2. Single Session Revocation (POST /api/admin/sessions/revoke)', () => {
    it('should revoke an individual target session by token', async () => {
      const res = await fetch(`http://127.0.0.1:${serverPort}/api/admin/sessions/revoke`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminSession.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: regularSession1.token })
      });
      assert.strictEqual(res.status, 200);

      const data = await res.json();
      assert.ok(data.ok);
      assert.strictEqual(data.revoked, true);

      // Verify session is terminated
      const checkSession = sessionRepo.getSession(regularSession1.token);
      assert.strictEqual(checkSession, null);

      // Other sessions remain alive
      assert.ok(sessionRepo.getSession(adminSession.token));
      assert.ok(sessionRepo.getSession(regularSession2.token));
    });

    it('should return 400 when token is missing', async () => {
      const res = await fetch(`http://127.0.0.1:${serverPort}/api/admin/sessions/revoke`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminSession.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      assert.strictEqual(res.status, 400);
    });
  });

  describe('3. Targeted Group Kick-Out (POST /api/admin/sessions/revoke-group)', () => {
    it('should kick out all guest sessions (group: guests)', async () => {
      const res = await fetch(`http://127.0.0.1:${serverPort}/api/admin/sessions/revoke-group`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminSession.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ group: 'guests' })
      });
      assert.strictEqual(res.status, 200);

      const data = await res.json();
      assert.ok(data.ok);
      assert.strictEqual(data.group, 'guests');
      assert.strictEqual(data.count, 1);

      // Verify guest quotas table is cleared
      assert.strictEqual(guestRepo.listGuests().length, 0);

      // User and Admin sessions remain intact
      assert.strictEqual(sessionRepo.countActiveSessions(), 3);
    });

    it('should kick out all regular user sessions (group: users)', async () => {
      const res = await fetch(`http://127.0.0.1:${serverPort}/api/admin/sessions/revoke-group`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminSession.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ group: 'users' })
      });
      assert.strictEqual(res.status, 200);

      const data = await res.json();
      assert.ok(data.ok);
      assert.strictEqual(data.group, 'users');
      assert.strictEqual(data.count, 2);

      // Verify both regular sessions are removed
      assert.strictEqual(sessionRepo.getSession(regularSession1.token), null);
      assert.strictEqual(sessionRepo.getSession(regularSession2.token), null);

      // Admin session is preserved
      assert.ok(sessionRepo.getSession(adminSession.token));
    });

    it('should kick out all other sessions sparing caller (group: all_except_me)', async () => {
      const res = await fetch(`http://127.0.0.1:${serverPort}/api/admin/sessions/revoke-group`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminSession.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ group: 'all_except_me' })
      });
      assert.strictEqual(res.status, 200);

      const data = await res.json();
      assert.ok(data.ok);

      // Admin session remains alive
      assert.ok(sessionRepo.getSession(adminSession.token));

      // Regular sessions & guests purged
      assert.strictEqual(sessionRepo.getSession(regularSession1.token), null);
      assert.strictEqual(sessionRepo.getSession(regularSession2.token), null);
      assert.strictEqual(guestRepo.listGuests().length, 0);
    });

    it('should reject invalid group identifier with 400', async () => {
      const res = await fetch(`http://127.0.0.1:${serverPort}/api/admin/sessions/revoke-group`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminSession.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ group: 'hackers' })
      });
      assert.strictEqual(res.status, 400);
    });
  });

  describe('4. Nuclear Kick-Out All (POST /api/admin/sessions/revoke-all)', () => {
    it('should wipe all sessions except current admin when excludeCurrentSession is true', async () => {
      const res = await fetch(`http://127.0.0.1:${serverPort}/api/admin/sessions/revoke-all`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminSession.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ excludeCurrentSession: true })
      });
      assert.strictEqual(res.status, 200);

      const data = await res.json();
      assert.ok(data.ok);
      assert.strictEqual(data.excludedCurrent, true);

      // Only admin session remains
      assert.ok(sessionRepo.getSession(adminSession.token));
      assert.strictEqual(sessionRepo.countActiveSessions(), 1);
    });

    it('should perform total nuclear purge when excludeCurrentSession is false', async () => {
      const res = await fetch(`http://127.0.0.1:${serverPort}/api/admin/sessions/revoke-all`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminSession.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ excludeCurrentSession: false })
      });
      assert.strictEqual(res.status, 200);

      const data = await res.json();
      assert.ok(data.ok);

      // All sessions and guests destroyed
      assert.strictEqual(sessionRepo.countActiveSessions(), 0);
      assert.strictEqual(guestRepo.listGuests().length, 0);
    });
  });
});
