/**
 * Deep Vertical E2E Integration Suite (Round 2)
 * Wires Round 1 Backend Capabilities into Live API & UI for Immediate Operator Experience.
 *
 * Verifies:
 * - POST /api/queue/retry/:id (recovery of failed & cancelled items, rejection of active & unknown items)
 * - GET /api/queue/summary?lang=vi and ?lang=en (elderly-friendly queue summaries)
 * - GET /api/system/doctor (enriched with rateLimiters stats & queueSummary, keeping existing report fields intact)
 * - DOM wiring in public/index.html & public/js/app.js
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { app } = require('../src/server');
const queue = require('../src/engine/queue');

describe('Deep Vertical E2E Integration Suite (Round 2)', () => {
  let server;
  let baseUrl;

  before(async () => {
    queue.isPaused = true;
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
    queue.items.clear();
    await new Promise((resolve) => server.close(resolve));
  });

  describe('POST /api/queue/retry/:id', () => {
    it('successfully retries a failed queue item and resets retries/progress', async () => {
      const testId = 'test_item_failed_1';
      queue.items.set(testId, {
        id: testId,
        title: 'Thành Phố Buồn - Bolero Cổ Điển',
        status: 'failed',
        progress: 45,
        retries: 3,
        error: 'Network timeout during transcoding'
      });

      const res = await fetch(`${baseUrl}/api/queue/retry/${testId}`, {
        method: 'POST'
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.ok, true);
      assert.equal(data.success, true);
      assert.ok(data.item);
      assert.equal(data.item.status, 'queued');
      assert.equal(data.item.progress, 0);
      assert.equal(data.item.retries, 0);
      assert.equal(data.item.error, null);
    });

    it('successfully retries a cancelled queue item', async () => {
      const testId = 'test_item_cancelled_1';
      queue.items.set(testId, {
        id: testId,
        title: 'Mẹ Yêu - Nhạc Trữ Tình',
        status: 'cancelled',
        progress: 10,
        retries: 1,
        error: null
      });

      const res = await fetch(`${baseUrl}/api/queue/retry/${testId}`, {
        method: 'POST'
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.ok, true);
      assert.equal(data.success, true);
      assert.equal(data.item.status, 'queued');
    });

    it('rejects retrying an item in active downloading state with HTTP 400', async () => {
      const testId = 'test_item_active_1';
      queue.items.set(testId, {
        id: testId,
        title: 'Duyên Phận - Bolero',
        status: 'downloading',
        progress: 70,
        retries: 0
      });

      const res = await fetch(`${baseUrl}/api/queue/retry/${testId}`, {
        method: 'POST'
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.ok, false);
      assert.equal(data.success, false);
      assert.equal(data.reason, 'invalid_state');
      assert.ok(data.error);
    });

    it('rejects retrying an already completed item with HTTP 400 invalid_state', async () => {
      const testId = 'test_item_completed_1';
      queue.items.set(testId, {
        id: testId,
        title: 'Chuyện Hoa Sim - Bolero',
        status: 'completed',
        progress: 100,
        completedFilePath: '/mock/path/Chuyen_Hoa_Sim.mp3'
      });

      const res = await fetch(`${baseUrl}/api/queue/retry/${testId}`, {
        method: 'POST'
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.ok, false);
      assert.equal(data.success, false);
      assert.equal(data.reason, 'invalid_state');
      assert.ok(data.error);
    });

    it('rejects retrying a non-existent item with HTTP 400 not_found', async () => {
      const res = await fetch(`${baseUrl}/api/queue/retry/non_existent_id_999`, {
        method: 'POST'
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.ok, false);
      assert.equal(data.success, false);
      assert.equal(data.reason, 'not_found');
      assert.ok(data.error);
    });
  });

  describe('GET /api/queue/summary', () => {
    it('returns elderly summary in Vietnamese by default', async () => {
      const res = await fetch(`${baseUrl}/api/queue/summary`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.ok, true);
      assert.equal(data.success, true);
      assert.equal(typeof data.total, 'number');
      assert.equal(typeof data.active, 'number');
      assert.equal(typeof data.queued, 'number');
      assert.equal(typeof data.completed, 'number');
      assert.equal(typeof data.failed, 'number');
      assert.equal(typeof data.cancelled, 'number');
      assert.equal(typeof data.headline, 'string');
      assert.equal(typeof data.details, 'string');
    });

    it('returns elderly summary in English when ?lang=en is specified', async () => {
      const res = await fetch(`${baseUrl}/api/queue/summary?lang=en`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.ok, true);
      assert.equal(data.success, true);
      assert.equal(typeof data.headline, 'string');
      assert.equal(typeof data.details, 'string');
      // Verify English language response
      assert.ok(/queue|song|download|done|attention/i.test(data.headline + ' ' + data.details));
    });

    it('falls back to Vietnamese summary when an unsupported lang is passed', async () => {
      const res = await fetch(`${baseUrl}/api/queue/summary?lang=fr`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.ok, true);
      assert.equal(data.success, true);
      // Vietnamese default text check
      assert.ok(/hàng đợi|bài hát|tải|chú ý/i.test(data.headline + ' ' + data.details));
    });
  });

  describe('GET /api/system/doctor (Enriched Diagnostics)', () => {
    it('returns complete doctor report enriched with rateLimiters stats & queueSummary', async () => {
      const res = await fetch(`${baseUrl}/api/system/doctor`);
      assert.equal(res.status, 200);
      const data = await res.json();

      // Original SPEC-0017 / Phase 20 health checks must remain intact
      assert.equal(data.ok, true);
      assert.equal(data.success, true);
      assert.ok(data.checks);
      assert.equal(data.checks.node.ok, true);
      assert.equal(data.checks.downloadsDir.ok, true);
      assert.equal(data.checks.database.ok, true);
      assert.equal(typeof data.checks.ytdlp.ok, 'boolean');
      assert.equal(typeof data.checks.ffmpeg.ok, 'boolean');

      // Enriched rate limiter stats
      assert.ok(data.rateLimiters, 'rateLimiters field should be present');
      assert.ok(data.rateLimiters.search, 'rateLimiters.search should be present');
      assert.equal(typeof data.rateLimiters.search.size, 'number');
      assert.equal(typeof data.rateLimiters.search.maxUniqueIps, 'number');
      assert.equal(typeof data.rateLimiters.search.evictedCount, 'number');

      assert.ok(data.rateLimiters.queue, 'rateLimiters.queue should be present');
      assert.equal(typeof data.rateLimiters.queue.size, 'number');
      assert.equal(typeof data.rateLimiters.queue.maxUniqueIps, 'number');
      assert.equal(typeof data.rateLimiters.queue.evictedCount, 'number');

      // Enriched queue summary
      assert.ok(data.queueSummary, 'queueSummary field should be present');
      assert.equal(typeof data.queueSummary.total, 'number');
      assert.equal(typeof data.queueSummary.headline, 'string');
      assert.equal(typeof data.queueSummary.details, 'string');
    });
  });

  describe('Frontend DOM & JS Affordance Wiring Presence', () => {
    const rootDir = path.resolve(__dirname, '..');
    const indexHtml = fs.readFileSync(path.join(rootDir, 'public', 'index.html'), 'utf8');
    const appJs = fs.readFileSync(path.join(rootDir, 'public', 'js', 'app.js'), 'utf8');

    it('verifies public/index.html includes #drawer-elderly-summary, #btn-run-system-doctor and #system-doctor-panel', () => {
      assert.ok(indexHtml.includes('id="drawer-elderly-summary"'), 'Expected #drawer-elderly-summary in index.html');
      assert.ok(indexHtml.includes('drawer-elderly-summary'), 'Expected class drawer-elderly-summary in index.html');
      assert.ok(indexHtml.includes('id="btn-run-system-doctor"'), 'Expected #btn-run-system-doctor in index.html');
      assert.ok(indexHtml.includes('Kiểm Tra Sức Khỏe Máy Chủ'), 'Expected button label in index.html');
      assert.ok(indexHtml.includes('id="system-doctor-panel"'), 'Expected #system-doctor-panel in index.html');
    });

    it('verifies public/js/app.js exposes retryQueueDownload with double-click guard and wires controls', () => {
      assert.ok(appJs.includes('window.retryQueueDownload'), 'Expected window.retryQueueDownload in app.js');
      assert.ok(appJs.includes('/api/queue/retry/'), 'Expected /api/queue/retry/ in app.js');
      assert.ok(appJs.includes('btn-queue-retry'), 'Expected .btn-queue-retry class in app.js');
      assert.ok(appJs.includes('drawer-elderly-summary'), 'Expected drawer-elderly-summary update logic in app.js');
      assert.ok(appJs.includes('/api/queue/clear'), 'Expected /api/queue/clear call in btnDrawerClearDone');
      assert.ok(appJs.includes('btn-run-system-doctor'), 'Expected #btn-run-system-doctor click handler in app.js');
      assert.ok(appJs.includes('system-doctor-panel'), 'Expected #system-doctor-panel rendering in app.js');
    });
  });
});
