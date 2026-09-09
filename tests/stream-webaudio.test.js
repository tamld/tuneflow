const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const express = require('express');
const apiRoutes = require('../src/routes/api');
const { streamUrlCache } = require('../src/engine/ytdlp');

describe('TuneFlow Phase 5: Zero-Disk Streaming & Stream Pipe API Tests', () => {
  let app;
  let server;
  let baseUrl;
  let mockAudioServer;
  let mockAudioUrl;

  before(async () => {
    // 1. Setup mock audio server returning byte range responses
    mockAudioServer = http.createServer((req, res) => {
      res.writeHead(206, {
        'Content-Type': 'audio/webm',
        'Accept-Ranges': 'bytes',
        'Content-Range': 'bytes 0-1024/2048',
        'Content-Length': '1025'
      });
      res.end(Buffer.alloc(1025));
    });
    await new Promise((resolve) => {
      mockAudioServer.listen(0, '127.0.0.1', () => {
        const port = mockAudioServer.address().port;
        mockAudioUrl = `http://127.0.0.1:${port}/mock-audio.webm`;
        resolve();
      });
    });

    // 2. Pre-seed streamUrlCache to prevent network latency/flakes
    streamUrlCache.set('https://www.youtube.com/watch?v=dQw4w9WgXcQ', mockAudioUrl);

    // 3. Setup TuneFlow API server
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
    if (mockAudioServer) {
      await new Promise((resolve) => mockAudioServer.close(resolve));
    }
    streamUrlCache.clear();
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
    assert.ok(res.status === 200 || res.status === 206, `Stream pipe must return 200 or 206, received status: ${res.status}`);
    assert.ok(res.headers.get('content-type'), 'Stream pipe must return a Content-Type header');
    assert.strictEqual(res.headers.get('accept-ranges'), 'bytes', 'Stream pipe must announce byte range support');
  });

  it('GET /api/preview/:id should handle Range headers and set Accept-Ranges', async () => {
    const res = await fetch(`${baseUrl}/api/preview/dQw4w9WgXcQ`, {
      headers: {
        'Range': 'bytes=0-100'
      }
    });
    assert.ok(res.status === 200 || res.status === 206, `Preview stream must return 200 or 206, received status: ${res.status}`);
    assert.ok(res.headers.get('content-type'), 'Preview stream must return Content-Type header');
    assert.strictEqual(res.headers.get('accept-ranges'), 'bytes', 'Preview stream must support byte ranges');
  });
});
