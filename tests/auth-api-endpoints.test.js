const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const express = require('express');

const { initDatabase } = require('../src/db/database');
const { UserRepo } = require('../src/db/repositories/user_repo');
const { SessionRepo } = require('../src/db/repositories/session_repo');
const { GuestRepo } = require('../src/db/repositories/guest_repo');
const { AuthService } = require('../src/auth/auth_service');
const { createAuthenticateMiddleware } = require('../src/middleware/authenticate');
const { authorize } = require('../src/middleware/authorize');
const { createGuestGuardMiddleware } = require('../src/middleware/guest_guard');
const { createAuthRouter } = require('../src/routes/auth_routes');
const { createAdminRouter } = require('../src/routes/admin_routes');

describe('Task 4: Auth & Admin API Endpoints Tests', () => {
  let tempDir;
  let dbPath;
  let db;
  let userRepo;
  let sessionRepo;
  let guestRepo;
  let authService;
  let app;
  let server;
  let baseUrl;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tuneflow-api-test-'));
    dbPath = path.join(tempDir, 'test.db');
    db = initDatabase(dbPath);
    userRepo = new UserRepo(db);
    sessionRepo = new SessionRepo(db);
    guestRepo = new GuestRepo(db);
    authService = new AuthService({ userRepo, sessionRepo, guestRepo });
    authService.ensureDefaultAdmin('AdminP@ss123');

    // Create Express app
    app = express();
    app.use(express.json());

    const authenticate = createAuthenticateMiddleware(authService);
    const guestGuard = createGuestGuardMiddleware(guestRepo);

    app.use(authenticate);

    // Mount Auth & Admin routes
    app.use('/api/auth', createAuthRouter({ authService }));
    app.use('/api/admin', createAdminRouter({ userRepo, guestRepo }));

    // Protected mock endpoints
    app.get('/api/protected/admin-only', authorize('admin'), (req, res) => {
      res.json({ ok: true, role: req.user.role });
    });

    app.post('/api/protected/queue-add', authorize('admin', 'user'), (req, res) => {
      res.json({ ok: true, queued: true });
    });

    app.get('/api/protected/stream-preview', guestGuard, (req, res) => {
      res.json({ ok: true, streaming: true });
    });

    // Start ephemeral server
    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  afterEach(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (db && typeof db.close === 'function') {
      db.close();
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Auth Routes (/api/auth)', () => {
    it('should login admin with valid password and reject invalid', async () => {
      // 1. Invalid login
      const badRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'WrongPassword' })
      });
      assert.equal(badRes.status, 401);
      const badData = await badRes.json();
      assert.equal(badData.error, 'INVALID_CREDENTIALS');

      // 2. Valid login
      const goodRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'AdminP@ss123' })
      });
      assert.equal(goodRes.status, 200);
      const goodData = await goodRes.json();
      assert.ok(goodData.token);
      assert.equal(goodData.user.username, 'admin');
      assert.equal(goodData.user.role, 'admin');

      // 3. /api/auth/me with token
      const meRes = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${goodData.token}` }
      });
      assert.equal(meRes.status, 200);
      const meData = await meRes.json();
      assert.equal(meData.authenticated, true);
      assert.equal(meData.user.username, 'admin');

      // 4. Logout
      const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${goodData.token}` }
      });
      assert.equal(logoutRes.status, 200);

      // 5. /api/auth/me after logout should return unauthenticated guest
      const afterMe = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${goodData.token}` }
      });
      const afterData = await afterMe.json();
      assert.equal(afterData.authenticated, false);
      assert.equal(afterData.role, 'guest');
    });

    it('should manage guest heartbeat and quota accumulation', async () => {
      const guestHeaders = { 'x-guest-id': 'guest-api-1', 'x-fingerprint': 'fp-api-1' };

      // Initial status
      const meRes = await fetch(`${baseUrl}/api/auth/me`, { headers: guestHeaders });
      const meData = await meRes.json();
      assert.equal(meData.authenticated, false);
      assert.equal(meData.role, 'guest');
      assert.equal(meData.guest.remaining_sec, 1800);

      // Send 30s heartbeat
      const hbRes = await fetch(`${baseUrl}/api/auth/guest-heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...guestHeaders },
        body: JSON.stringify({ durationSec: 30 })
      });
      assert.equal(hbRes.status, 200);
      const hbData = await hbRes.json();
      assert.equal(hbData.guest.listen_duration_sec, 30);
      assert.equal(hbData.guest.remaining_sec, 1770);
      assert.equal(hbData.guest.can_listen, true);
    });
  });

  describe('RBAC & Protected Endpoint Enforcement', () => {
    it('should protect admin endpoints and queue adding from guests', async () => {
      const guestHeaders = { 'x-guest-id': 'guest-api-2', 'x-fingerprint': 'fp-api-2' };

      // Guest trying admin endpoint
      const adminRes = await fetch(`${baseUrl}/api/protected/admin-only`, { headers: guestHeaders });
      assert.equal(adminRes.status, 403);

      // Guest trying queue add
      const queueRes = await fetch(`${baseUrl}/api/protected/queue-add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...guestHeaders }
      });
      assert.equal(queueRes.status, 403);
    });

    it('should cut off guest stream when 30-min listening limit is reached', async () => {
      const guestHeaders = { 'x-guest-id': 'guest-api-3', 'x-fingerprint': 'fp-api-3' };

      // First stream request should succeed
      const okStream = await fetch(`${baseUrl}/api/protected/stream-preview`, { headers: guestHeaders });
      assert.equal(okStream.status, 200);

      // Exhaust 1800s via heartbeat
      await fetch(`${baseUrl}/api/auth/guest-heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...guestHeaders },
        body: JSON.stringify({ durationSec: 1800 })
      });

      // Next stream attempt must be rejected with 403 GUEST_COOLDOWN_ACTIVE
      const blockedStream = await fetch(`${baseUrl}/api/protected/stream-preview`, { headers: guestHeaders });
      assert.equal(blockedStream.status, 403);
      const blockedData = await blockedStream.json();
      assert.equal(blockedData.error, 'GUEST_COOLDOWN_ACTIVE');
      assert.ok(blockedData.cooldownRemainingSec > 0);
    });
  });

  describe('Admin Routes (/api/admin)', () => {
    it('should allow admin to manage users and reset guest cooldown', async () => {
      // Login as admin
      const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'AdminP@ss123' })
      });
      const { token } = await loginRes.json();
      const authHeader = { Authorization: `Bearer ${token}` };

      // 1. Create family user
      const createRes = await fetch(`${baseUrl}/api/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ username: 'me-yeu', password: 'Password123!', role: 'user' })
      });
      assert.equal(createRes.status, 201);
      const createdUser = await createRes.json();
      assert.equal(createdUser.user.username, 'me-yeu');

      // 2. List users
      const listRes = await fetch(`${baseUrl}/api/admin/users`, { headers: authHeader });
      const userList = await listRes.json();
      assert.equal(userList.length, 2);

      // 3. Reset guest cooldown
      guestRepo.getOrCreateGuest({ guestId: 'g-stuck', clientIp: '1.2.3.4', fingerprintHash: 'f' });
      guestRepo.recordListeningTime('g-stuck', 1800);

      const resetRes = await fetch(`${baseUrl}/api/admin/guests/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ guestId: 'g-stuck' })
      });
      assert.equal(resetRes.status, 200);
      const resetData = await resetRes.json();
      assert.equal(resetData.ok, true);
      assert.equal(resetData.guest.can_listen, true);
    });
  });
});
