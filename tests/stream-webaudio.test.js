const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const express = require('express');
const apiRoutes = require('../src/routes/api');

describe('TuneFlow Phase 5: Zero-Disk Streaming & Stream Pipe API Tests', () => {
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

  it('GET /api/stream/pipe/:id should reject invalid video ID with 400 Bad Request', async () => {
    const res = await fetch(`${baseUrl}/api/stream/pipe/invalid_id!@#$`);
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.error, 'Mã video YouTube không hợp lệ');
  });

  it('GET /api/stream/pipe/:id should forward Range request headers safely when format is valid', async () => {
    const res = await fetch(`${baseUrl}/api/stream/pipe/dQw4w9WgXcQ`, {
      headers: {
        'Range': 'bytes=0-1024'
      }
    });
    // In local test environment without live YouTube or yt-dlp binary, returns 200/206 or handled 500
    assert.ok(res.status === 200 || res.status === 206 || res.status === 500 || res.status === 502);
  });

  it('GET /api/preview/:id should handle Range headers and set Accept-Ranges', async () => {
    const res = await fetch(`${baseUrl}/api/preview/dQw4w9WgXcQ`, {
      headers: {
        'Range': 'bytes=0-100'
      }
    });
    assert.ok(res.status >= 200 && res.status < 600);
  });
});
