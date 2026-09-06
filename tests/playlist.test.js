const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { app } = require('../src/server');

describe('TuneFlow Playlist & Batch Ingestion Tests', () => {
  let server;
  let baseUrl;

  before(async () => {
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
    const queue = require('../src/engine/queue');
    for (const item of queue.getAll()) {
      queue.cancel(item.id);
    }
    queue.clearCompleted();
    if (server) {
      if (server.closeAllConnections) server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('POST /api/playlist/parse with missing url should return 400 Bad Request with Vietnamese message', async () => {
    const res = await fetch(`${baseUrl}/api/playlist/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.ok(data.error.includes('đường dẫn danh sách phát') || data.error.includes('Vui lòng cung cấp'));
  });

  it('POST /api/queue/batch-add with empty array should return 400 Bad Request', async () => {
    const res = await fetch(`${baseUrl}/api/queue/batch-add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [] })
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.success, false);
  });

  it('POST /api/queue/batch-add with multiple items should queue all tracks', async () => {
    const batchItems = [
      { id: 'batch_track_1', title: 'Nhạc Thiền 1', url: 'https://www.youtube.com/watch?v=batch_1' },
      { id: 'batch_track_2', title: 'Nhạc Thiền 2', url: 'https://www.youtube.com/watch?v=batch_2' },
      { id: 'batch_track_3', title: 'Nhạc Thiền 3', url: 'https://www.youtube.com/watch?v=batch_3' }
    ];

    const res = await fetch(`${baseUrl}/api/queue/batch-add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: batchItems, format: 'mp3' })
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.queuedCount, 3);
    assert.equal(data.items.length, 3);
  });

  it('GET /api/curation/presets should return predefined categories for Ba and Me', async () => {
    const res = await fetch(`${baseUrl}/api/curation/presets`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.presets);
    assert.ok(data.presets.mom);
    assert.ok(data.presets.dad);
    assert.equal(data.presets.mom.title, 'Mẹ Hay Nghe');
    assert.equal(data.presets.dad.title, 'Ba Hay Nghe');
  });
});
