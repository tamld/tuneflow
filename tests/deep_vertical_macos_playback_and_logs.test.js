const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const express = require('express');

const { OperationalLogger } = require('../src/utils/logger');
const { initDatabase } = require('../src/db/database');
const { UserRepo } = require('../src/db/repositories/user_repo');
const { SessionRepo } = require('../src/db/repositories/session_repo');
const { GuestRepo } = require('../src/db/repositories/guest_repo');
const { AuthService } = require('../src/auth/auth_service');
const { createAuthenticateMiddleware } = require('../src/middleware/authenticate');
const { authorize } = require('../src/middleware/authorize');
const apiRoutes = require('../src/routes/api');

describe('Deep Vertical Round 4: macOS Playback, Desktop Local Auth & Operational Logs', () => {
  let tempDir;
  let server;
  let baseUrl;

  before(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tuneflow-r4-test-'));
    const app = express();
    app.use(express.json());
    app.use('/api', apiRoutes);
    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        baseUrl = `http://127.0.0.1:${server.address().port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (tempDir) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('OperationalLogger should persist JSONL entries, redact secrets, and filter by level', () => {
    const logger = new OperationalLogger(tempDir);
    logger.info('preview', 'Started preview stream', { videoId: 'ex4pssi_Jlo', token: 'secret-jwt-123' });
    logger.error('preview', 'AVFoundation decode error', { code: -12190, password: 'my-password' });

    const all = logger.getEntries({ limit: 10, level: 'ALL' });
    assert.ok(all.length >= 2);
    assert.equal(all[0].level, 'ERROR');
    assert.equal(all[0].meta.password, '[REDACTED]');
    assert.equal(all[1].meta.token, '[REDACTED]');

    const warnErr = logger.getEntries({ limit: 10, level: 'WARN_ERROR' });
    assert.equal(warnErr.length, 1);
    assert.equal(warnErr[0].level, 'ERROR');

    const logContent = fs.readFileSync(logger.mainLogFile, 'utf8');
    assert.ok(logContent.includes('ex4pssi_Jlo'));
    assert.ok(!logContent.includes('secret-jwt-123'));
  });

  it('GET /api/system/logs and POST /api/system/logs/client should record and return operational telemetry', async () => {
    const postRes = await fetch(`${baseUrl}/api/system/logs/client`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level: 'WARN',
        category: 'player-ui',
        message: 'Test player buffering event',
        meta: { trackId: 'test_123' }
      })
    });
    assert.equal(postRes.status, 200);
    const postData = await postRes.json();
    assert.equal(postData.ok, true);

    const getRes = await fetch(`${baseUrl}/api/system/logs?limit=20&level=ALL`);
    assert.equal(getRes.status, 200);
    const getData = await getRes.json();
    assert.equal(getData.ok, true);
    assert.ok(getData.mainLogFile.endsWith('tuneflow.log'));
    assert.ok(Array.isArray(getData.entries));
    assert.ok(getData.entries.some(e => e.message.includes('Test player buffering event')));
  });

  it('TUNEFLOW_DESKTOP_LOCAL=1 should authenticate loopback desktop operator as admin even when auth.js sends x-guest-id headers', async () => {
    const db = initDatabase(path.join(tempDir, 'desktop-auth.db'));
    const userRepo = new UserRepo(db);
    const sessionRepo = new SessionRepo(db);
    const guestRepo = new GuestRepo(db);
    const authService = new AuthService({ userRepo, sessionRepo, guestRepo });
    authService.ensureDefaultAdmin('admin');

    const app = express();
    app.use(express.json());
    app.use(createAuthenticateMiddleware(authService));
    app.post('/api/queue/add-test', authorize('admin', 'user'), (req, res) => {
      res.json({ ok: true, role: req.user.role, username: req.user.username });
    });

    const srv = http.createServer(app);
    await new Promise(r => srv.listen(0, '127.0.0.1', r));
    const url = `http://127.0.0.1:${srv.address().port}/api/queue/add-test`;

    const prevDesktopEnv = process.env.TUNEFLOW_DESKTOP_LOCAL;
    try {
      process.env.TUNEFLOW_DESKTOP_LOCAL = '1';
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-guest-id': 'guest_desktop_webview',
          'x-fingerprint': 'fp_macos_wkwebview'
        },
        body: JSON.stringify({})
      });
      assert.equal(res.status, 200, 'Standalone desktop operator on 127.0.0.1 must not receive 403 Forbidden');
      const data = await res.json();
      assert.equal(data.ok, true);
      assert.equal(data.role, 'admin');
    } finally {
      if (prevDesktopEnv === undefined) {
        delete process.env.TUNEFLOW_DESKTOP_LOCAL;
      } else {
        process.env.TUNEFLOW_DESKTOP_LOCAL = prevDesktopEnv;
      }
      await new Promise(r => srv.close(r));
      if (db && typeof db.close === 'function') db.close();
    }
  });
});
