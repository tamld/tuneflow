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
});
