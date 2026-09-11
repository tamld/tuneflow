const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const express = require('express');

describe('TuneFlow Ops & Diagnostics API Tests (Hermetic & Non-Flaky)', () => {
  let server;
  let baseUrl;

  before(async () => {
    process.env.MOCK_DIAGNOSTICS_VERSIONS = '1';
    process.env.MOCK_YTDLP_UPDATE = 'success';

    const apiRoutes = require('../src/routes/api');
    const app = express();
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
    delete process.env.MOCK_DIAGNOSTICS_VERSIONS;
    delete process.env.MOCK_YTDLP_UPDATE;
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
    assert.strictEqual(data.system.ytDlpVersion, '2025.02.01');
    assert.ok(data.system.memory);
    assert.ok(data.system.storage);
  });

  it('POST /api/system/update-ytdlp should succeed when update resolves', async () => {
    process.env.MOCK_YTDLP_UPDATE = 'success';
    const res = await fetch(`${baseUrl}/api/system/update-ytdlp`, {
      method: 'POST'
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.newVersion, '2025.02.01');
  });

  it('POST /api/system/update-ytdlp should return 500 when update fails', async () => {
    process.env.MOCK_YTDLP_UPDATE = 'fail';
    const res = await fetch(`${baseUrl}/api/system/update-ytdlp`, {
      method: 'POST'
    });
    assert.strictEqual(res.status, 500);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.ok(data.error.includes('Homebrew managed'));
  });
});
