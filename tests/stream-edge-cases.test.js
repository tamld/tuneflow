const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const http = require('http');
const express = require('express');
const apiRoutes = require('../src/routes/api');
const queue = require('../src/engine/queue');

describe('TuneFlow Stream Pipe & Download Edge Cases Suite', () => {
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
        baseUrl = `http://127.0.0.1:${server.address().port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('GET /api/download/:id/file should return 404 when item does not exist', async () => {
    const res = await fetch(`${baseUrl}/api/download/non_existent_item_id/file`);
    assert.strictEqual(res.status, 404);
    const text = await res.text();
    assert.ok(text.includes('chưa hoàn thành hoặc không tìm thấy'));
  });

  it('GET /api/download/:id/file should reject items not in completed state', async () => {
    const item = {
      id: 'test_incomplete_task',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      title: 'Bài hát đang tải dở',
      sanitizedTitle: 'Bai_hat_dang_tai_do',
      status: 'downloading',
      completedFilePath: null
    };
    queue.items.set(item.id, item);

    try {
      const res = await fetch(`${baseUrl}/api/download/${item.id}/file`);
      assert.strictEqual(res.status, 404);
    } finally {
      queue.items.delete(item.id);
    }
  });

  it('GET /api/download/:id/file should reject path traversal outside downloads directory with 403', async () => {
    const item = {
      id: 'test_traversal_attack',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      title: 'Tấn Công Path Traversal',
      sanitizedTitle: 'Tan_Cong_Path_Traversal',
      status: 'completed',
      completedFilePath: path.resolve(__dirname, '../package.json')
    };
    queue.items.set(item.id, item);

    try {
      const res = await fetch(`${baseUrl}/api/download/${item.id}/file`);
      assert.strictEqual(res.status, 403);
      const text = await res.text();
      assert.ok(text.includes('không hợp lệ'));
    } finally {
      queue.items.delete(item.id);
    }
  });

  it('GET /api/stream/pipe/:id should reject invalid video IDs with 400', async () => {
    const badIds = ['id_with_space', 'toolongvideoid12345', 'short', '<script>', 'invalid!@#'];
    for (const badId of badIds) {
      const res = await fetch(`${baseUrl}/api/stream/pipe/${encodeURIComponent(badId)}`);
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.error, 'Mã video YouTube không hợp lệ');
    }
  });

  it('GET /api/preview/:id should reject special character IDs with 400', async () => {
    const res = await fetch(`${baseUrl}/api/preview/invalid$id!`);
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.error, 'Mã video YouTube không hợp lệ');
  });
});
