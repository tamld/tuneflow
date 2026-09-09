const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const queue = require('../src/engine/queue');
const { DOWNLOADS_DIR } = require('../src/config');

describe('TuneFlow Queue Concurrency, FSM Transitions & Quota Engine Tests', () => {
  before(() => {
    queue.isPaused = true;
  });

  after(() => {
    queue.isPaused = false;
    queue.clearCompleted();
  });
  it('should initialize and maintain task lifecycle states in DownloadQueue', () => {
    const item = queue.add({
      id: 'fsm_task_test_1',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      title: 'FSM Test Track 1',
      uploader: 'Tester'
    });

    assert.ok(item);
    assert.strictEqual(item.id, 'fsm_task_test_1');
    assert.ok(['queued', 'downloading', 'completed'].includes(item.status));
    assert.strictEqual(typeof item.progress, 'number');
  });

  it('should transition status to cancelled when cancelled explicitly', () => {
    const item = queue.add({
      id: 'fsm_task_cancel_1',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      title: 'FSM Test Cancel Track'
    });

    const cancelled = queue.cancel('fsm_task_cancel_1');
    assert.strictEqual(cancelled, true);

    const retrieved = queue.get('fsm_task_cancel_1');
    assert.strictEqual(retrieved.status, 'cancelled');
  });

  it('should return false gracefully when cancelling non-existent task', () => {
    const cancelled = queue.cancel('random_non_existent_task_id_9999');
    assert.strictEqual(cancelled, false);
  });

  it('should remove completed tasks and keep queued tasks on clearCompleted()', () => {
    const itemCompleted = queue.add({
      id: 'task_to_clear_done',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      title: 'Task Done'
    });
    itemCompleted.status = 'completed';

    const itemQueued = queue.add({
      id: 'task_to_keep_queued',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      title: 'Task Queued'
    });
    itemQueued.status = 'queued';

    queue.clearCompleted();

    assert.strictEqual(queue.get('task_to_clear_done'), undefined);
    assert.ok(queue.get('task_to_keep_queued'));
  });

  it('should manage SSE client subscription and safe removal on client close', () => {
    const initialClients = queue.sseClients.size;
    let written = false;
    let closed = false;

    const mockRes = {
      setHeader: () => {},
      flushHeaders: () => {},
      writeHead: () => {},
      write: (data) => {
        if (data.includes('data:')) written = true;
      },
      on: (event, handler) => {
        if (event === 'close') {
          mockRes.closeHandler = handler;
        }
      }
    };

    queue.subscribeSSE(mockRes);
    assert.strictEqual(queue.sseClients.size, initialClients + 1);
    assert.strictEqual(written, true);

    // Simulate client disconnect
    mockRes.closeHandler();
    assert.strictEqual(queue.sseClients.size, initialClients);
  });

  it('should enforce storage quota by deleting oldest files when limit is exceeded', () => {
    // Create dummy files with different timestamps
    const dummyFile1 = path.join(DOWNLOADS_DIR, 'quota_dummy_old.mp3');
    const dummyFile2 = path.join(DOWNLOADS_DIR, 'quota_dummy_new.mp3');

    fs.writeFileSync(dummyFile1, Buffer.alloc(1024 * 1024 * 2)); // 2MB
    fs.writeFileSync(dummyFile2, Buffer.alloc(1024 * 1024 * 2)); // 2MB

    // Set old file mtime back by 2 hours
    const pastTime = (Date.now() - 2 * 3600 * 1000) / 1000;
    fs.utimesSync(dummyFile1, pastTime, pastTime);

    // Enforce quota with low 3MB limit
    queue.enforceStorageQuota(3);

    // Old file should be pruned, new file preserved
    assert.strictEqual(fs.existsSync(dummyFile1), false);
    assert.strictEqual(fs.existsSync(dummyFile2), true);

    // Cleanup dummy file 2
    try { fs.unlinkSync(dummyFile2); } catch (_e) {}
  });
});
