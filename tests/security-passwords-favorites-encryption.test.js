const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const express = require('express');

const { initDatabase } = require('../src/db/database');
const { UserRepo } = require('../src/db/repositories/user_repo');
const { SessionRepo } = require('../src/db/repositories/session_repo');
const { GuestRepo } = require('../src/db/repositories/guest_repo');
const { FavoriteRepo } = require('../src/db/repositories/favorite_repo');
const { AuthService } = require('../src/auth/auth_service');
const { encryptField, decryptField } = require('../src/auth/crypto_utils');
const { createAuthenticateMiddleware } = require('../src/middleware/authenticate');
const { createAuthRouter } = require('../src/routes/auth_routes');
const { createAdminRouter } = require('../src/routes/admin_routes');
const { createUserRouter } = require('../src/routes/user_routes');

describe('Issue #81: Security & Account Enhancements Suite', () => {
  const testDbDir = path.join(__dirname, '..', 'data', 'test_security_81');
  const testDbPath = path.join(testDbDir, 'test_security.db');

  let db;
  let userRepo;
  let sessionRepo;
  let guestRepo;
  let favoriteRepo;
  let authService;
  let server;
  let serverPort;

  let adminUser;
  let adminSession;
  let userA;
  let sessionA1;
  let sessionA2;
  let userB;
  let sessionB;

  before(async () => {
    if (fs.existsSync(testDbDir)) {
      fs.rmSync(testDbDir, { recursive: true, force: true });
    }

    db = initDatabase(testDbPath);
    userRepo = new UserRepo(db);
    sessionRepo = new SessionRepo(db);
    guestRepo = new GuestRepo(db, 1800, 3600);
    favoriteRepo = new FavoriteRepo(db);
    authService = new AuthService({ userRepo, sessionRepo, guestRepo });

    const app = express();
    app.use(express.json());
    app.use(createAuthenticateMiddleware(authService));
    app.use('/api/auth', createAuthRouter({ authService }));
    app.use('/api/admin', createAdminRouter({ userRepo, guestRepo, sessionRepo }));
    app.use('/api/user', createUserRouter({ favoriteRepo }));

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
    db.exec('DELETE FROM user_favorites');
    db.exec('DELETE FROM sessions');
    db.exec('DELETE FROM users');
    db.exec('DELETE FROM guest_quotas');

    adminUser = authService.ensureDefaultAdmin('admin_pass_root');
    const loginAdmin = authService.login({ username: 'admin', password: 'admin_pass_root', clientIp: '10.0.0.1' });
    adminSession = loginAdmin;

    // Create User A
    const { hash: hashA, salt: saltA } = require('../src/auth/crypto_utils').hashPassword('pass_user_a');
    userA = userRepo.createUser({ username: 'bome_a', passwordHash: hashA, salt: saltA, role: 'user' });
    sessionA1 = authService.login({ username: 'bome_a', password: 'pass_user_a', clientIp: '192.168.10.11', userAgent: 'Phone A' });
    sessionA2 = authService.login({ username: 'bome_a', password: 'pass_user_a', clientIp: '192.168.10.12', userAgent: 'TV A' });

    // Create User B
    const { hash: hashB, salt: saltB } = require('../src/auth/crypto_utils').hashPassword('pass_user_b');
    userB = userRepo.createUser({ username: 'congai_b', passwordHash: hashB, salt: saltB, role: 'user' });
    sessionB = authService.login({ username: 'congai_b', password: 'pass_user_b', clientIp: '192.168.20.21', userAgent: 'Laptop B' });
  });

  describe('1. Password Self-Service (POST /api/auth/change-password)', () => {
    it('should reject unauthenticated request with 401', async () => {
      const res = await fetch(`http://127.0.0.1:${serverPort}/api/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-guest-id': 'guest_anon' },
        body: JSON.stringify({ oldPassword: 'foo', newPassword: 'bar' })
      });
      assert.strictEqual(res.status, 401);
    });

    it('should reject invalid old password with 400', async () => {
      const res = await fetch(`http://127.0.0.1:${serverPort}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionA1.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ oldPassword: 'wrong_password', newPassword: 'new_pass_1234' })
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.error, 'INVALID_OLD_PASSWORD');
    });

    it('should change password successfully, authenticate with new password, and revoke other sessions', async () => {
      const res = await fetch(`http://127.0.0.1:${serverPort}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionA1.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ oldPassword: 'pass_user_a', newPassword: 'brand_new_pass_999' })
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.ok(data.ok);

      // Caller's current session remains alive
      assert.ok(sessionRepo.getSession(sessionA1.token));

      // User A's second session was revoked
      assert.strictEqual(sessionRepo.getSession(sessionA2.token), null);

      // Login with old password must fail
      assert.throws(() => {
        authService.login({ username: 'bome_a', password: 'pass_user_a' });
      });

      // Login with new password must succeed
      const newLogin = authService.login({ username: 'bome_a', password: 'brand_new_pass_999' });
      assert.ok(newLogin.token);
      assert.strictEqual(newLogin.user.username, 'bome_a');
    });
  });

  describe('2. Admin Reset Password (POST /api/admin/users/:id/reset-password)', () => {
    it('should reject non-admin users with 403 Forbidden', async () => {
      const res = await fetch(`http://127.0.0.1:${serverPort}/api/admin/users/${userA.id}/reset-password`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionA1.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newPassword: 'reset_pass_root' })
      });
      assert.strictEqual(res.status, 403);
    });

    it('should reset user password and terminate all active sessions for that user', async () => {
      const res = await fetch(`http://127.0.0.1:${serverPort}/api/admin/users/${userA.id}/reset-password`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminSession.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newPassword: 'admin_forced_reset_888' })
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.ok(data.ok);

      // All User A sessions must be terminated
      assert.strictEqual(sessionRepo.getSession(sessionA1.token), null);
      assert.strictEqual(sessionRepo.getSession(sessionA2.token), null);

      // User B session is untouched
      assert.ok(sessionRepo.getSession(sessionB.token));

      // User A can log in with reset password
      const reLogin = authService.login({ username: 'bome_a', password: 'admin_forced_reset_888' });
      assert.ok(reLogin.token);
    });
  });

  describe('3. Server-side Favorites Persistence & Sync (/api/user/favorites)', () => {
    it('should reject unauthenticated guest request with 401', async () => {
      const res = await fetch(`http://127.0.0.1:${serverPort}/api/user/favorites`, {
        headers: { 'x-guest-id': 'guest_anon' }
      });
      assert.strictEqual(res.status, 401);
    });

    it('should add, list, and remove favorite tracks for a user', async () => {
      const track1 = {
        id: 'vid_bolero_01',
        title: 'Sầu Tím Thiệp Hồng',
        uploader: 'Quang Lê & Lệ Quyên',
        duration: 320,
        duration_string: '05:20',
        thumbnail: 'https://img.youtube.com/vi/vid_bolero_01/hqdefault.jpg'
      };

      // Add favorite
      const addRes = await fetch(`http://127.0.0.1:${serverPort}/api/user/favorites`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionA1.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(track1)
      });
      assert.strictEqual(addRes.status, 200);

      // List favorites
      const listRes = await fetch(`http://127.0.0.1:${serverPort}/api/user/favorites`, {
        headers: { Authorization: `Bearer ${sessionA1.token}` }
      });
      assert.strictEqual(listRes.status, 200);
      const listData = await listRes.json();
      assert.strictEqual(listData.count, 1);
      assert.strictEqual(listData.favorites[0].id, 'vid_bolero_01');
      assert.strictEqual(listData.favorites[0].title, 'Sầu Tím Thiệp Hồng');

      // User B must NOT see User A's favorites
      const listResB = await fetch(`http://127.0.0.1:${serverPort}/api/user/favorites`, {
        headers: { Authorization: `Bearer ${sessionB.token}` }
      });
      const listDataB = await listResB.json();
      assert.strictEqual(listDataB.count, 0);

      // Remove favorite
      const delRes = await fetch(`http://127.0.0.1:${serverPort}/api/user/favorites/vid_bolero_01`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${sessionA1.token}` }
      });
      assert.strictEqual(delRes.status, 200);

      // Verify removed
      const checkRes = await fetch(`http://127.0.0.1:${serverPort}/api/user/favorites`, {
        headers: { Authorization: `Bearer ${sessionA1.token}` }
      });
      const checkData = await checkRes.json();
      assert.strictEqual(checkData.count, 0);
    });

    it('should bidirectional batch sync local favorites with server', async () => {
      const localFavorites = [
        { id: 'vid_sync_01', title: 'Con Đường Xưa Em Đi', uploader: 'Như Quỳnh' },
        { id: 'vid_sync_02', title: 'Duyên Phận', uploader: 'Dương Hồng Loan' }
      ];

      const syncRes = await fetch(`http://127.0.0.1:${serverPort}/api/user/favorites/sync`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionA1.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ favorites: localFavorites })
      });
      assert.strictEqual(syncRes.status, 200);
      const syncData = await syncRes.json();
      assert.strictEqual(syncData.count, 2);
      assert.ok(syncData.favorites.some(f => f.id === 'vid_sync_01'));
      assert.ok(syncData.favorites.some(f => f.id === 'vid_sync_02'));
    });
  });

  describe('4. Sensitive Data Encryption at Rest (AES-256-GCM)', () => {
    it('should verify encryptField generates authenticated AES-GCM ciphertext and decrypts accurately', () => {
      const sensitiveIp = '192.168.45.31';
      const encrypted = encryptField(sensitiveIp);
      assert.ok(encrypted.startsWith('enc:v1:'));
      assert.notStrictEqual(encrypted, sensitiveIp);

      const decrypted = decryptField(encrypted);
      assert.strictEqual(decrypted, sensitiveIp);
    });

    it('should assert zero plaintext client IPs inside the raw SQLite database file', () => {
      // Register new guest and session with unique secret IPs
      const SECRET_IP_SESSION = '172.31.254.99';
      const SECRET_IP_GUEST = '10.240.111.77';

      sessionRepo.createSession({
        token: 'token_secret_ip',
        userId: userA.id,
        role: 'user',
        expiresAt: Date.now() + 60000,
        clientIp: SECRET_IP_SESSION,
        userAgent: 'Secret Device'
      });

      guestRepo.getOrCreateGuest({
        guestId: 'guest_secret_ip',
        clientIp: SECRET_IP_GUEST,
        fingerprintHash: 'fp_secret'
      });

      // Query raw database file contents
      db.exec('PRAGMA wal_checkpoint(FULL);');
      const rawDbBuffer = fs.readFileSync(testDbPath);
      const rawDbString = rawDbBuffer.toString('binary');

      // Assert that neither secret IP exists as a plaintext string in the raw database bytes
      assert.strictEqual(
        rawDbString.includes(SECRET_IP_SESSION),
        false,
        `Raw DB bytes must NOT contain plaintext session IP ${SECRET_IP_SESSION}`
      );
      assert.strictEqual(
        rawDbString.includes(SECRET_IP_GUEST),
        false,
        `Raw DB bytes must NOT contain plaintext guest IP ${SECRET_IP_GUEST}`
      );

      // Verify transparent decryption when reading from repository
      const readSession = sessionRepo.getSession('token_secret_ip');
      assert.strictEqual(readSession.client_ip, SECRET_IP_SESSION);

      const readGuest = guestRepo.getOrCreateGuest({ guestId: 'guest_secret_ip' });
      assert.strictEqual(readGuest.client_ip, SECRET_IP_GUEST);
    });
  });
});
