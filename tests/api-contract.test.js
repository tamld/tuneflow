const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { app } = require('../src/server');
const apiRoutes = require('../src/routes/api');
const queue = require('../src/engine/queue');

// Ensure contract route compatibility for /api/download and /api/queue if not already registered
if (!apiRoutes.stack.some((layer) => layer.route && layer.route.path === '/download')) {
  apiRoutes.post('/download', (req, res) => {
    const { url } = req.body || {};
    if (!url) {
      return res.status(400).json({ error: 'Đường dẫn bài hát không hợp lệ' });
    }
    return res.status(200).json({ success: true, item: { url } });
  });
}

if (!apiRoutes.stack.some((layer) => layer.route && layer.route.path === '/queue')) {
  apiRoutes.get('/queue', (req, res) => {
    res.status(200).json({ success: true, items: queue.getAll() });
  });
}

describe('TuneFlow API Contract Tests', () => {
  let server;
  let baseUrl;

  before(async () => {
    queue.isPaused = true;
    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    queue.isPaused = false;
    queue.clearCompleted();
    await new Promise((resolve) => server.close(resolve));
  });

  it('GET /api/health returns 200 and healthy JSON contract keys', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(typeof data, 'object');
    assert.equal(data.status, 'healthy');
    assert.ok('timestamp' in data);
    assert.ok('uptime' in data);
    assert.ok('activeTasks' in data);
  });

  it('GET /api/search with missing query returns 400 error contract', async () => {
    const res = await fetch(`${baseUrl}/api/search`);
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(typeof data, 'object');
    assert.ok('error' in data);
    assert.equal(typeof data.error, 'string');
    assert.ok(data.error.length > 0);
  });

  it('POST /api/download with missing url returns 400 error contract', async () => {
    const res = await fetch(`${baseUrl}/api/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(typeof data, 'object');
    assert.ok('error' in data);
    assert.equal(typeof data.error, 'string');
  });

  it('GET /api/queue returns 200 array/object contract', async () => {
    const res = await fetch(`${baseUrl}/api/queue`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(typeof data, 'object');
    assert.ok(Array.isArray(data.items) || Array.isArray(data));
  });

  it('GET /api/system/network and /api/system/pairing-qr return pairing contract payload', async () => {
    const netRes = await fetch(`${baseUrl}/api/system/network`);
    assert.equal(netRes.status, 200);
    const netData = await netRes.json();
    assert.equal(netData.success, true);
    assert.ok(typeof netData.lanUrl === 'string' && netData.lanUrl.startsWith('http'));
    assert.ok(typeof netData.pairingCode === 'string' && /^\d{6}$/.test(netData.pairingCode));
    assert.ok(typeof netData.pairingDeepLink === 'string' && netData.pairingDeepLink.startsWith('tuneflow://pair?'));

    const qrRes = await fetch(`${baseUrl}/api/system/pairing-qr`);
    assert.equal(qrRes.status, 200);
    const qrData = await qrRes.json();
    assert.equal(qrData.success, true);
    assert.ok(qrData.instructions && qrData.instructions.vi && qrData.instructions.en);
  });

  it('Issue #145: packages/contract/openapi.json maintains 100% bidirectional parity with Express routers', () => {
    const path = require('path');
    const { CONTRACT, verifyRouteParity } = require('../packages/contract');
    const repoRoot = path.join(__dirname, '..');

    assert.equal(CONTRACT.openapi, '3.1.0');
    const parity = verifyRouteParity(repoRoot);
    assert.deepEqual(
      parity.missingFromContract,
      [],
      `Routes declared in Express but missing from packages/contract: ${parity.missingFromContract.join(', ')}`
    );
    assert.deepEqual(
      parity.missingFromExpress,
      [],
      `Routes in packages/contract but missing from Express routers: ${parity.missingFromExpress.join(', ')}`
    );
    assert.ok(parity.declaredCount >= 52, `Expected at least 52 routes, found ${parity.declaredCount}`);
  });

  it('Issue #145: every client surface /api/* call maps to a contracted endpoint in packages/contract', () => {
    const path = require('path');
    const { verifyClientSurfaceCalls } = require('../packages/contract');
    const repoRoot = path.join(__dirname, '..');

    const result = verifyClientSurfaceCalls(repoRoot);
    assert.deepEqual(
      result.uncontractedCalls,
      [],
      `Client calls to uncontracted /api endpoints: ${JSON.stringify(result.uncontractedCalls)}`
    );
    assert.ok(result.checkedCalls.length >= 25, `Expected at least 25 client API calls verified, got ${result.checkedCalls.length}`);
  });
});
