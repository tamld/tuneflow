const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { app } = require('../src/server');
const queue = require('../src/engine/queue');
const { streamUrlCache } = require('../src/engine/ytdlp');

describe('TuneFlow API Integration Tests', () => {
  let server;
  let baseUrl;

  before(async () => {
    queue.isPaused = true;
    streamUrlCache.set('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://mock.googlevideo.com/videoplayback');
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
    streamUrlCache.clear();
    await new Promise((resolve) => server.close(resolve));
  });

  it('GET /api/health should return healthy status and zero crashes', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'healthy');
    assert.ok(data.uptime >= 0);
  });

  it('GET /api/search with empty query should return 400 Bad Request with Vietnamese prompt', async () => {
    const res = await fetch(`${baseUrl}/api/search?q=`);
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.ok(data.error.includes('nhập từ khóa'));
  });

  it('POST /api/queue/add should validate url and return queued/downloading item', async () => {
    const res = await fetch(`${baseUrl}/api/queue/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://www.youtube.com/watch?v=mock_video_id',
        title: 'Dòng nước xuân - Tân Cổ Giao Duyên',
        uploader: 'Thanh Kim Huệ'
      })
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.item.title, 'Dòng nước xuân - Tân Cổ Giao Duyên');
    assert.ok(['queued', 'downloading', 'failed'].includes(data.item.status));
  });

  it('GET /api/queue/list should return array with queued items', async () => {
    const res = await fetch(`${baseUrl}/api/queue/list`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.items));
    assert.ok(data.items.length > 0);
  });

  it('POST /api/preview/prewarm should reject invalid video ID with 400', async () => {
    const res = await fetch(`${baseUrl}/api/preview/prewarm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'bad@id!' })
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.ok(data.error.includes('không hợp lệ'));
  });

  it('POST /api/preview/prewarm should accept valid video ID and return 200 with prewarming status', async () => {
    const res = await fetch(`${baseUrl}/api/preview/prewarm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'dQw4w9WgXcQ' })
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.prewarming, 'dQw4w9WgXcQ');
  });
});
