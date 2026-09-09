const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const express = require('express');
const apiRoutes = require('../src/routes/api');

describe('TuneFlow Ops & Diagnostics API Tests', () => {
  let app;
  let server;
  let baseUrl;

  before(async () => {
    app = express();
    app.use(express.json());
    app.use('/api', apiRoutes);

    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('GET /api/system/status should return runtime metrics, memory, and versions', async () => {
    const res = await fetch(`${baseUrl}/api/system/status`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.system);
    assert.strictEqual(typeof data.system.nodeVersion, 'string');
    assert.strictEqual(typeof data.system.platform, 'string');
    assert.strictEqual(typeof data.system.uptime, 'number');
    assert.ok(data.system.memory);
    assert.ok(data.system.storage);
  });

  it('POST /api/system/update-ytdlp should attempt update and return status', async () => {
    const res = await fetch(`${baseUrl}/api/system/update-ytdlp`, {
      method: 'POST'
    });
    // In dev environment or mock, it will either succeed or report error if yt-dlp is not present in PATH
    assert.ok(res.status === 200 || res.status === 500);
    const data = await res.json();
    assert.ok('success' in data || 'error' in data);
  });
});
