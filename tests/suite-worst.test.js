const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const express = require('express');
const apiRoutes = require('../src/routes/api');
const queue = require('../src/engine/queue');
const { MAX_DOWNLOADS } = require('../src/config');

describe('TuneFlow Test Suite: WORST & FAILURE SCENARIOS', () => {
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
    for (const item of queue.getAll()) {
      queue.cancel(item.id);
    }
  });

  it('WORST CASE: GET /api/search with empty query returns 400 with Vietnamese prompt', async () => {
    const res = await fetch(`${baseUrl}/api/search?q=   `);
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.error, 'Vui lòng nhập từ khóa tìm kiếm');
  });

  it('WORST CASE: POST /api/queue/add with missing url returns 400 Bad Request', async () => {
    const res = await fetch(`${baseUrl}/api/queue/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Song without URL' })
    });

    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.error, 'Đường dẫn bài hát không hợp lệ');
  });

  it('WORST CASE: Concurrency limiter never exceeds MAX_DOWNLOADS active processes', () => {
    const isolatedQueue = new queue.DownloadQueue();
    isolatedQueue.isPaused = true;

    for (let i = 0; i < 6; i++) {
      isolatedQueue.add({
        url: `https://www.youtube.com/watch?v=mock_concurrency_${i}`,
        title: `Mock Concurrency Track ${i}`,
        uploader: 'Test Uploader',
        format: 'mp3'
      });
    }

    // Simulate 2 items active
    const allItems = isolatedQueue.getAll();
    allItems[0].status = 'downloading';
    allItems[1].status = 'downloading';

    isolatedQueue.isProcessing = false;
    isolatedQueue.isPaused = false;
    isolatedQueue.processNext();

    const activeCount = Array.from(isolatedQueue.items.values()).filter(
      i => i.status === 'downloading' || i.status === 'converting'
    ).length;

    assert.ok(activeCount <= MAX_DOWNLOADS, `Active count (${activeCount}) must be <= ${MAX_DOWNLOADS}`);
  });

  it('WORST CASE: Cancelling an active or queued item safely transitions to cancelled', () => {
    const isolatedQueue = new queue.DownloadQueue();
    isolatedQueue.isPaused = true;

    const item = isolatedQueue.add({
      url: 'https://www.youtube.com/watch?v=mock_cancel_track',
      title: 'Track To Cancel',
      uploader: 'Test Uploader'
    });

    const cancelled = isolatedQueue.cancel(item.id);
    assert.equal(cancelled, true);
    const updated = isolatedQueue.get(item.id);
    assert.equal(updated.status, 'cancelled');
  });

  it('WORST CASE: Cancelling a non-existent task returns false without throwing', () => {
    const isolatedQueue = new queue.DownloadQueue();
    const cancelled = isolatedQueue.cancel('non_existent_item_id_99999');
    assert.equal(cancelled, false);
  });
});
