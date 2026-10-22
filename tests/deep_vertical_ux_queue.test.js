const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const queue = require('../src/engine/queue');

test('TuneFlow Deep Vertical UX & Queue Recovery Tests', async (t) => {
  // Clear any existing items for test isolation
  queue.items.clear();

  await t.test('retryQueueItem: rejects non-existent id', () => {
    const res = queue.retryQueueItem('non_existent_item_id');
    assert.deepEqual(res, { ok: false, reason: 'not_found' });
  });

  await t.test('retryQueueItem: rejects active states (downloading, converting) to prevent race conditions', () => {
    queue.items.set('active_dl', {
      id: 'active_dl',
      status: 'downloading',
      progress: 45,
      retries: 0
    });
    const res1 = queue.retryQueueItem('active_dl');
    assert.equal(res1.ok, false);
    assert.equal(res1.reason, 'invalid_state');
    assert.equal(res1.currentStatus, 'downloading');

    queue.items.set('active_conv', {
      id: 'active_conv',
      status: 'converting',
      progress: 90,
      retries: 0
    });
    const res2 = queue.retryQueueItem('active_conv');
    assert.equal(res2.ok, false);
    assert.equal(res2.reason, 'invalid_state');
    assert.equal(res2.currentStatus, 'converting');
  });

  await t.test('retryQueueItem: rejects completed or already queued items', () => {
    queue.items.set('done_item', {
      id: 'done_item',
      status: 'completed',
      progress: 100,
      retries: 0
    });
    const res1 = queue.retryQueueItem('done_item');
    assert.equal(res1.ok, false);
    assert.equal(res1.reason, 'invalid_state');
    assert.equal(res1.currentStatus, 'completed');

    queue.items.set('waiting_item', {
      id: 'waiting_item',
      status: 'queued',
      progress: 0,
      retries: 0
    });
    const res2 = queue.retryQueueItem('waiting_item');
    assert.equal(res2.ok, false);
    assert.equal(res2.reason, 'invalid_state');
    assert.equal(res2.currentStatus, 'queued');
  });

  await t.test('retryQueueItem: successfully recovers failed item with exhausted retries', () => {
    queue.items.set('failed_item', {
      id: 'failed_item',
      title: 'Bài Ca Kỷ Niệm',
      status: 'failed',
      progress: 80,
      error: 'HTTP 429 Too Many Requests',
      retries: 3,
      speed: '1.2MB/s',
      eta: '00:05'
    });

    const res = queue.retryQueueItem('failed_item');
    assert.equal(res.ok, true);
    assert.equal(res.item.status, 'queued');
    assert.equal(res.item.progress, 0);
    assert.equal(res.item.error, null);
    assert.equal(res.item.retries, 0); // Fresh start caught by F2-2 blind review
    assert.equal(res.item.speed, '');
    assert.equal(res.item.eta, '');
  });

  await t.test('retryQueueItem: handles item missing optional fields gracefully', () => {
    queue.items.set('minimal_failed', {
      id: 'minimal_failed',
      status: 'failed'
    });

    const res = queue.retryQueueItem('minimal_failed');
    assert.equal(res.ok, true);
    assert.equal(res.item.status, 'queued');
    assert.equal(res.item.progress, 0);
    assert.equal(res.item.error, null);
    assert.equal(res.item.retries, 0);
  });

  await t.test('retryQueueItem: successfully recovers cancelled item', () => {
    queue.items.set('cancelled_item', {
      id: 'cancelled_item',
      title: 'Đôi Mắt Người Xưa',
      status: 'cancelled',
      progress: 30,
      error: null,
      retries: 1,
      speed: '500KB/s',
      eta: '00:20'
    });

    const res = queue.retryQueueItem('cancelled_item');
    assert.equal(res.ok, true);
    assert.equal(res.item.status, 'queued');
    assert.equal(res.item.progress, 0);
    assert.equal(res.item.retries, 0);
  });

  await t.test('getElderlyStatus: returns localized labels across full status matrix', () => {
    const statuses = ['queued', 'downloading', 'converting', 'completed', 'failed', 'cancelled'];
    for (const st of statuses) {
      queue.items.set(`item_${st}`, {
        id: `item_${st}`,
        status: st,
        error: st === 'failed' ? 'Connection dropped' : null
      });

      const vi = queue.getElderlyStatus(`item_${st}`, 'vi');
      assert.equal(vi.ok, true);
      assert.equal(vi.status, st);
      assert.ok(vi.label && vi.label.length > 0, `Missing VI label for ${st}`);

      const en = queue.getElderlyStatus(`item_${st}`, 'en');
      assert.equal(en.ok, true);
      assert.equal(en.status, st);
      assert.ok(en.label && en.label.length > 0, `Missing EN label for ${st}`);
    }

    // Edge case: unmapped/future status fallback
    queue.items.set('item_unknown', { id: 'item_unknown', status: 'unknown_state' });
    const fallback = queue.getElderlyStatus('item_unknown', 'vi');
    assert.equal(fallback.ok, true);
    assert.equal(fallback.status, 'unknown_state');
    assert.equal(fallback.label, 'unknown_state');

    // Missing item
    const missingVi = queue.getElderlyStatus('non_existent', 'vi');
    assert.equal(missingVi.ok, false);
    assert.match(missingVi.label, /Không tìm thấy/);
    const missingEn = queue.getElderlyStatus('non_existent', 'en');
    assert.equal(missingEn.ok, false);
    assert.match(missingEn.label, /not found/i);
  });

  await t.test('getElderlyStatus: handles failed item with and without error field', () => {
    queue.items.set('fail_with_err', { id: 'fail_with_err', status: 'failed', error: 'FFmpeg exit code 1' });
    const resWith = queue.getElderlyStatus('fail_with_err', 'vi');
    assert.equal(resWith.ok, true);
    assert.equal(resWith.error, 'FFmpeg exit code 1');

    queue.items.set('fail_no_err', { id: 'fail_no_err', status: 'failed' });
    const resNo = queue.getElderlyStatus('fail_no_err', 'vi');
    assert.equal(resNo.ok, true);
    assert.equal(resNo.error, null);
  });

  await t.test('getElderlySummary: enforces hierarchy (failed > active > completed > empty)', () => {
    queue.items.clear();
    // 1. Empty state
    const emptyVi = queue.getElderlySummary('vi');
    assert.equal(emptyVi.total, 0);
    assert.equal(emptyVi.headline, 'Hàng đợi đang trống');
    assert.match(emptyVi.details, /Bố Mẹ bấm/);

    const emptyEn = queue.getElderlySummary('en');
    assert.equal(emptyEn.total, 0);
    assert.equal(emptyEn.headline, 'Queue is empty');
    assert.match(emptyEn.details, /No songs/);

    // 2. Completed state
    queue.items.set('c1', { id: 'c1', status: 'completed' });
    queue.items.set('c2', { id: 'c2', status: 'completed' });
    const completedVi = queue.getElderlySummary('vi');
    assert.equal(completedVi.total, 2);
    assert.equal(completedVi.completed, 2);
    assert.equal(completedVi.headline, 'Đã tải xong toàn bộ');

    // 3. Active in-flight state (takes priority over completed)
    queue.items.set('d1', { id: 'd1', status: 'downloading' });
    queue.items.set('q1', { id: 'q1', status: 'queued' });
    const activeVi = queue.getElderlySummary('vi');
    assert.equal(activeVi.total, 4);
    assert.equal(activeVi.active, 1);
    assert.equal(activeVi.queued, 1);
    assert.equal(activeVi.completed, 2);
    assert.equal(activeVi.headline, 'Đang xử lý tải nhạc');

    // 4. Failed state (takes top priority for elderly attention)
    queue.items.set('f1', { id: 'f1', status: 'failed' });
    queue.items.set('f2', { id: 'f2', status: 'failed' });
    const failedPriorityVi = queue.getElderlySummary('vi');
    assert.equal(failedPriorityVi.total, 6);
    assert.equal(failedPriorityVi.failed, 2);
    assert.equal(failedPriorityVi.headline, 'Cần chú ý');
    assert.match(failedPriorityVi.details, /Có 2 bài tải chưa thành công/);

    const failedPriorityEn = queue.getElderlySummary('en');
    assert.equal(failedPriorityEn.headline, 'Attention needed');
    assert.match(failedPriorityEn.details, /2 download\(s\) could not finish/);
  });

  await t.test('i18n: verify client dictionary completeness for elderly queue translations', () => {
    const i18nContent = fs.readFileSync(path.join(__dirname, '../public/js/i18n.js'), 'utf8');

    const expectedKeys = [
      'queue_button',
      'queue_button_title',
      'queue_retry',
      'queue_retry_title',
      'queue_status_queued',
      'queue_status_downloading',
      'queue_status_converting',
      'queue_status_completed',
      'queue_status_failed',
      'queue_status_cancelled',
      'queue_summary_empty',
      'queue_summary_done'
    ];

    for (const key of expectedKeys) {
      assert.ok(i18nContent.includes(`${key}:`), `Missing key '${key}' in public/js/i18n.js`);
    }

    // Verify Vietnamese elderly phrasing
    assert.ok(i18nContent.includes('Tải lại bài hát này cho Bố Mẹ'));
    assert.ok(i18nContent.includes('Chưa tải được (Bấm Thử Lại)'));

    // Verify English translation phrasing
    assert.ok(i18nContent.includes('Retry downloading this song'));
    assert.ok(i18nContent.includes('Failed (Tap Retry)'));
  });

  // Final cleanup
  queue.items.clear();
});
