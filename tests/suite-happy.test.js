const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const express = require('express');
const apiRoutes = require('../src/routes/api');
const { formatDuration } = require('../src/engine/ytdlp');

describe('TuneFlow Test Suite: HAPPY PATH SCENARIOS', () => {
  let server;
  let baseUrl;

  before(async () => {
    const app = express();
    app.use(express.json());
    app.use('/api', apiRoutes);

    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        baseUrl = `http://127.0.0.1:${server.address().port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      if (server.closeAllConnections) server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
    const queue = require('../src/engine/queue');
    for (const item of queue.getAll()) {
      queue.cancel(item.id);
    }
  });

  it('Format Duration correctly transforms seconds into MM:SS and HH:MM:SS', () => {
    assert.equal(formatDuration(0), '00:00');
    assert.equal(formatDuration(45), '00:45');
    assert.equal(formatDuration(125), '02:05');
    assert.equal(formatDuration(3665), '1:01:05');
  });

  it('GET /api/health returns 200 OK and zero active tasks initially', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'healthy');
    assert.ok(typeof data.uptime === 'number');
  });

  it('POST /api/queue/add queues a valid new track', async () => {
    const payload = {
      url: 'https://www.youtube.com/watch?v=mock_happy_track_01',
      title: 'Nhạc Vàng Tuyển Chọn Đêm Mưa',
      uploader: 'Khánh Ly',
      duration: 320,
      format: 'mp3'
    };

    const res = await fetch(`${baseUrl}/api/queue/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.item.id);
    assert.equal(data.item.sanitizedTitle, 'Nhạc Vàng Tuyển Chọn Đêm Mưa');
  });

  it('GET /api/queue/list returns active queue items', async () => {
    const res = await fetch(`${baseUrl}/api/queue/list`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.items));
    assert.ok(data.items.length >= 1);
  });
});
