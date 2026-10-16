/**
 * Standardized Process Lifecycle, Anti-Orphan Tree Termination & Performance Suite
 * Authority: SPEC-0018 (Process Supervision, PID Hygiene & Singleflight Performance)
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { processManager, ProcessManager } = require('../src/engine/process_manager');
const { getPreviewStreamUrl, streamUrlCache, inFlightStreams } = require('../src/engine/ytdlp');
const queue = require('../src/engine/queue');
const { app } = require('../src/server');

describe('Process Lifecycle, Anti-Orphan Supervision & Performance Optimizations', () => {
  let server;
  let baseUrl;

  before(async () => {
    queue.isPaused = true;
    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const { port } = server.address();
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    processManager.killAll('test_suite_cleanup');
    queue.isPaused = false;
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('registers spawned child processes and automatically unregisters them upon normal exit', async () => {
    const pm = new ProcessManager();
    const child = spawn(process.execPath, ['-e', 'setTimeout(() => process.exit(0), 40)'], {
      windowsHide: true,
      stdio: 'ignore'
    });

    pm.register(child, { label: 'test:short-lived' });
    assert.equal(pm.getActiveCount(), 1);
    assert.equal(pm.getActiveCount('test:'), 1);

    await new Promise((resolve) => child.once('close', resolve));
    assert.equal(pm.getActiveCount(), 0);
    assert.equal(pm.totalSpawned, 1);
    assert.equal(pm.totalTerminated, 1);
  });

  it('terminates entire parent + grandchild process tree without leaving orphan PIDs', async () => {
    const pm = new ProcessManager();

    // Parent node process spawns a grandchild node process and prints grandchild PID to stdout
    const parentScript = `
      const { spawn } = require('child_process');
      const grandChild = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
        windowsHide: true,
        stdio: 'ignore'
      });
      console.log('GRANDCHILD_PID=' + grandChild.pid);
      setInterval(() => {}, 1000);
    `;

    const parent = spawn(process.execPath, ['-e', parentScript], {
      windowsHide: true,
      detached: process.platform !== 'win32',
      stdio: ['ignore', 'pipe', 'ignore']
    });

    pm.register(parent, { label: 'test:tree-parent' });

    const grandChildPid = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timed out waiting for grandchild PID')), 5000);
      let out = '';
      parent.stdout.on('data', (chunk) => {
        out += chunk.toString('utf8');
        const match = out.match(/GRANDCHILD_PID=(\d+)/);
        if (match) {
          clearTimeout(timeout);
          resolve(parseInt(match[1], 10));
        }
      });
    });

    assert.ok(grandChildPid > 0, 'Grandchild PID must be valid');
    assert.equal(pm.isPidAlive(parent.pid), true, 'Parent PID should be alive before killProcessTree');
    assert.equal(pm.isPidAlive(grandChildPid), true, 'Grandchild PID should be alive before killProcessTree');

    // Kill the parent process tree
    pm.killProcessTree(parent, 'SIGKILL', 'test_tree_kill');

    // Wait briefly for OS process table cleanup
    for (let i = 0; i < 20; i++) {
      if (!pm.isPidAlive(parent.pid) && !pm.isPidAlive(grandChildPid)) break;
      await new Promise((r) => setTimeout(r, 100));
    }

    assert.equal(pm.isPidAlive(parent.pid), false, 'Parent PID must be terminated');
    assert.equal(pm.isPidAlive(grandChildPid), false, 'Grandchild PID must not remain as an orphan');
    assert.equal(pm.getActiveCount(), 0);
  });

  it('enforces AbortSignal and timeout watchdog termination on registered subprocesses', async () => {
    const pm = new ProcessManager();
    const abortController = new AbortController();

    const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
      windowsHide: true,
      detached: process.platform !== 'win32',
      stdio: 'ignore'
    });
    const childPid = child.pid;

    pm.register(child, {
      label: 'test:abortable',
      signal: abortController.signal
    });

    assert.equal(pm.isPidAlive(childPid), true);
    abortController.abort();

    for (let i = 0; i < 20; i++) {
      if (!pm.isPidAlive(childPid)) break;
      await new Promise((r) => setTimeout(r, 100));
    }

    assert.equal(pm.isPidAlive(childPid), false, 'Aborted subprocess must be killed immediately');
    assert.equal(pm.getActiveCount(), 0);
  });

  it('kills active transcode/download subprocesses by queue itemId on queue.cancel()', async () => {
    const item = queue.add({
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      title: 'Test Cancel During Converting'
    });
    item.status = 'converting';

    const dummyFfmpeg = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
      windowsHide: true,
      detached: process.platform !== 'win32',
      stdio: 'ignore'
    });
    const dummyPid = dummyFfmpeg.pid;

    processManager.register(dummyFfmpeg, {
      label: 'ffmpeg:transcode',
      itemId: item.id
    });
    queue.activeProcesses.set(item.id, dummyFfmpeg);

    assert.equal(processManager.isPidAlive(dummyPid), true);

    const cancelled = queue.cancel(item.id);
    assert.equal(cancelled, true);
    assert.equal(queue.get(item.id).status, 'cancelled');

    for (let i = 0; i < 20; i++) {
      if (!processManager.isPidAlive(dummyPid)) break;
      await new Promise((r) => setTimeout(r, 100));
    }

    assert.equal(processManager.isPidAlive(dummyPid), false, 'Queue cancel must kill active ffmpeg/yt-dlp process');
  });

  it('coalesces concurrent getPreviewStreamUrl requests (Singleflight) into a single subprocess call', async () => {
    const testVideoUrl = 'https://www.youtube.com/watch?v=singleflight_test_99';
    streamUrlCache.cache.delete(testVideoUrl);
    inFlightStreams.delete(testVideoUrl);

    let spawnCount = 0;
    const mockRunYtDlp = async () => {
      spawnCount++;
      await new Promise((r) => setTimeout(r, 60));
      return 'https://rr1---sn-mock.googlevideo.com/videoplayback?itag=140&mime=audio%2Fmp4&expire=1999999999';
    };

    // Fire 4 concurrent requests (simulating hover prewarm + immediate click + duplicate event)
    const [r1, r2, r3, r4] = await Promise.all([
      getPreviewStreamUrl(testVideoUrl, { runYtDlpOverride: mockRunYtDlp }),
      getPreviewStreamUrl(testVideoUrl, { runYtDlpOverride: mockRunYtDlp }),
      getPreviewStreamUrl(testVideoUrl, { runYtDlpOverride: mockRunYtDlp }),
      getPreviewStreamUrl(testVideoUrl, { runYtDlpOverride: mockRunYtDlp })
    ]);

    assert.equal(spawnCount, 1, 'Singleflight must coalesce 4 concurrent requests into exactly 1 yt-dlp invocation');
    assert.equal(r1, r2);
    assert.equal(r2, r3);
    assert.equal(r3, r4);
    assert.ok(r1.includes('itag=140'));
  });

  it('manages PID lockfile, cleans stale crashed PIDs, and exposes process telemetry in /api/system/doctor', async () => {
    const tmpPidFile = path.join(os.tmpdir(), `tuneflow-test-${Date.now()}.pid`);
    fs.writeFileSync(tmpPidFile, JSON.stringify({ pid: 99999999, startedAt: '2026-01-01T00:00:00Z' }), 'utf8');

    const writeResult = processManager.writePidFile(tmpPidFile);
    assert.equal(writeResult.pid, process.pid);
    assert.equal(writeResult.stalePidCleaned, 99999999);
    assert.equal(fs.existsSync(tmpPidFile), true);

    const removed = processManager.removePidFile(tmpPidFile);
    assert.equal(removed, true);
    assert.equal(fs.existsSync(tmpPidFile), false);

    // Verify /api/system/doctor includes checks.processes telemetry
    process.env.MOCK_DIAGNOSTICS_VERSIONS = '1';
    try {
      const doctorRes = await fetch(`${baseUrl}/api/system/doctor`);
      assert.equal(doctorRes.status, 200);
      const body = await doctorRes.json();
      assert.ok(body.checks.processes);
      assert.equal(body.checks.processes.parentPid, process.pid);
      assert.equal(typeof body.checks.processes.activeCount, 'number');
    } finally {
      delete process.env.MOCK_DIAGNOSTICS_VERSIONS;
    }
  });

  it('serves self-hosted .woff2 fonts with immutable 1-year Cache-Control header', async () => {
    const res = await fetch(`${baseUrl}/fonts/be-vietnam-pro-1.woff2`);
    assert.equal(res.status, 200);
    const cacheControl = res.headers.get('cache-control') || '';
    assert.match(cacheControl, /immutable/);
    assert.match(cacheControl, /max-age=31536000/);
  });
});

