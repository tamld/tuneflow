const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { app } = require('../src/server');
const queue = require('../src/engine/queue');

describe('DAST HTTP Boundary Cases', () => {
  let server;
  let baseUrl;

  before(async () => {
    queue.isPaused = true;
    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const address = server.address();
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve) => {
      server.close(resolve);
    });
  });

  it('Case 1: GET /api/health returns 200 and includes security headers', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('x-frame-options'), 'SAMEORIGIN');
  });

  it('Case 2: Path traversal probe GET /../../package.json does not leak package.json', async () => {
    const res = await fetch(`${baseUrl}/../../package.json`);
    const text = await res.text();
    let isPackageJson = false;
    try {
      const parsed = JSON.parse(text);
      if (parsed && parsed.name === 'tuneflow') {
        isPackageJson = true;
      }
    } catch {
      isPackageJson = false;
    }
    assert.equal(isPackageJson, false, 'package.json content should never be leaked');
  });

  it('Case 3: POST /api/queue/add with malicious non-YouTube URL or empty payload returns 400 Bad Request', async () => {
    const emptyPayloadRes = await fetch(`${baseUrl}/api/queue/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(emptyPayloadRes.status, 400);

    const maliciousUrlRes = await fetch(`${baseUrl}/api/queue/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://malicious-site.example.com/exploit' }),
    });
    assert.equal(maliciousUrlRes.status, 400);
  });
});
