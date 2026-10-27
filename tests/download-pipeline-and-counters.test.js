const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { DOWNLOADS_DIR, TEMP_DIR } = require('../src/config');
const queue = require('../src/engine/queue');
const { DownloadQueue } = queue;

/**
 * Generates a valid 1-second 8000Hz mono 16-bit PCM WAV buffer so real ffmpeg can transcode it to 320kbps MP3.
 */
function createMinimalWavBuffer(durationSec = 1) {
  const sampleRate = 8000;
  const numSamples = sampleRate * durationSec;
  const dataSize = numSamples * 2;
  const buf = Buffer.alloc(44 + dataSize);

  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); // PCM chunk size
  buf.writeUInt16LE(1, 20);  // AudioFormat = 1 (PCM)
  buf.writeUInt16LE(1, 22);  // NumChannels = 1
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28); // ByteRate
  buf.writeUInt16LE(2, 32);  // BlockAlign
  buf.writeUInt16LE(16, 34); // BitsPerSample
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    const sample = Math.round(Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 8000);
    buf.writeInt16LE(sample, 44 + i * 2);
  }
  return buf;
}

describe('Windows Download Counter & >83% MP3 Pipeline Regression Suite (US-13, US-14, US-15 / AC-06..AC-09)', () => {
  let tmpDir;
  let fakeYtdlpPath;
  let fakeYtdlpFailPath;
  let prevYtdlpBin;
  let prevMockFfmpeg;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tuneflow-dl-pipeline-'));
    prevYtdlpBin = process.env.TUNEFLOW_YTDLP_BIN;
    prevMockFfmpeg = process.env.MOCK_FFMPEG;

    // Create a cross-platform fake yt-dlp executable that:
    // 1. Rejects -x / --extract-audio (simulating Windows missing ffprobe.exe failure at 83%-85% if -x were ever used!)
    // 2. Emits a multi-line stdout chunk containing 45%, 98.2% (83%), and 100% (85%) in a single buffer write
    // 3. Writes a real playable WAV file to the target -o path
    const workerJs = path.join(tmpDir, 'fake-ytdlp-worker.js');
    const wavBase64 = createMinimalWavBuffer(1).toString('base64');
    fs.writeFileSync(
      workerJs,
      `
const fs = require('fs');
const args = process.argv.slice(2);
if (args.includes('--version')) {
  process.stdout.write('2026.03.01\\n');
  process.exit(0);
}
if (args.includes('-x') || args.includes('--extract-audio')) {
  process.stdout.write('[download]  98.2% of 4.50MiB at 2.10MiB/s ETA 00:00\\n');
  process.stderr.write('ERROR: Postprocessing: ffprobe and ffmpeg not found. Please install or provide the path using --ffmpeg-location\\n');
  process.exit(1);
}
const outIdx = args.indexOf('-o');
if (outIdx === -1 || !args[outIdx + 1]) {
  process.stderr.write('Missing -o output template\\n');
  process.exit(2);
}
const outTemplate = args[outIdx + 1];
const actualPath = outTemplate.replace('%(ext)s', 'wav');
process.stdout.write('[download]  25.0% of 4.50MiB at 1.50MiB/s ETA 00:02\\n');
// Emit multi-line chunk where 98.2% (83%) and 100% (85%) arrive in the same buffer
process.stdout.write('[download]  98.2% of 4.50MiB at 2.40MiB/s ETA 00:00\\n[download] 100% of 4.50MiB in 00:02\\n');
fs.writeFileSync(actualPath, Buffer.from('${wavBase64}', 'base64'));
process.exit(0);
`,
      'utf8'
    );

    const failWorkerJs = path.join(tmpDir, 'fake-ytdlp-fail.js');
    fs.writeFileSync(
      failWorkerJs,
      `
process.stdout.write('[download]  98.0% of 4.50MiB at 1.20MiB/s ETA 00:00\\n');
process.stderr.write('ERROR: Simulated network reset at 98%\\n');
process.exit(1);
`,
      'utf8'
    );

    if (process.platform === 'win32') {
      // Point TUNEFLOW_YTDLP_BIN straight at the .js workers instead of a .cmd shim: spawning a
      // .cmd requires shell: true, which Node 20+ rejects on win32 with spawn EINVAL. queue.js
      // detects a .js binary and launches it via process.execPath, so no shell is involved.
      fakeYtdlpPath = workerJs;
      fakeYtdlpFailPath = failWorkerJs;
    } else {
      fakeYtdlpPath = path.join(tmpDir, 'fake-ytdlp.sh');
      fs.writeFileSync(fakeYtdlpPath, `#!/bin/sh\nexec "${process.execPath}" "${workerJs}" "$@"\n`, { mode: 0o755 });
      fakeYtdlpFailPath = path.join(tmpDir, 'fake-ytdlp-fail.sh');
      fs.writeFileSync(fakeYtdlpFailPath, `#!/bin/sh\nexec "${process.execPath}" "${failWorkerJs}" "$@"\n`, { mode: 0o755 });
    }
  });

  after(() => {
    if (prevYtdlpBin === undefined) delete process.env.TUNEFLOW_YTDLP_BIN;
    else process.env.TUNEFLOW_YTDLP_BIN = prevYtdlpBin;

    if (prevMockFfmpeg === undefined) delete process.env.MOCK_FFMPEG;
    else process.env.MOCK_FFMPEG = prevMockFfmpeg;

    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('AC-07: executeItem() completes full 0% -> 85% -> 90..99% -> 100% MP3 pipeline without -x / ffprobe and never stalls at >83%', async () => {
    process.env.TUNEFLOW_YTDLP_BIN = fakeYtdlpPath;
    // Allow real ffmpeg when installed, or fallback to MOCK_FFMPEG='success' if running in minimal container without ffmpeg
    const { execFileSync } = require('child_process');
    let hasRealFfmpeg = false;
    try {
      const { resolveSidecarBinary } = require('../src/security/binary_guard');
      execFileSync(resolveSidecarBinary('ffmpeg'), ['-version'], { stdio: 'ignore', timeout: 5000 });
      hasRealFfmpeg = true;
    } catch (_e) {
      hasRealFfmpeg = false;
    }
    if (hasRealFfmpeg) {
      delete process.env.MOCK_FFMPEG;
    } else {
      process.env.MOCK_FFMPEG = 'success';
    }

    const q = new DownloadQueue({ skipRestore: true });
    q.isPaused = true; // We invoke executeItem directly while observing every broadcast state
    const observedStates = [];
    const origBroadcast = q.broadcast.bind(q);
    q.broadcast = function (immediate) {
      const first = Array.from(q.items.values())[0];
      if (first) {
        observedStates.push({
          status: first.status,
          progress: first.progress,
          speed: first.speed
        });
      }
      return origBroadcast(immediate);
    };

    const item = q.add({
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      title: 'Test Bolero Windows MP3 Pipeline',
      uploader: 'TuneFlow Test Artist',
      duration: 1,
      format: 'mp3'
    });

    await q.executeItem(item);

    assert.equal(item.status, 'completed', `Expected item to reach 'completed', got '${item.status}' (error: ${item.error || item.lastError || 'none'})`);
    assert.equal(item.progress, 100, 'Final progress must be 100%');
    assert.ok(item.completedFilePath && fs.existsSync(item.completedFilePath), 'Completed MP3 file must exist on disk');
    assert.ok(item.checksum && item.checksum.length === 64, 'SHA-256 checksum must be computed');

    // Verify no leftover temp file for this item.id
    const leftoverTemp = fs.readdirSync(TEMP_DIR).filter(f => f.startsWith(item.id));
    assert.equal(leftoverTemp.length, 0, 'Temporary raw audio file must be cleaned up after MP3 conversion');

    // Verify progress trajectory hit 85% (not stuck at 83%), entered converting (>=90%), and reached completed (100%)
    const downloadingMax = Math.max(...observedStates.filter(s => s.status === 'downloading').map(s => s.progress));
    assert.equal(downloadingMax, 85, 'Download stage must reach full 85% even when 98.2% and 100% arrive in the same stdout chunk');
    assert.ok(observedStates.some(s => s.status === 'converting' && s.progress >= 90), 'Must broadcast converting stage at >=90%');
    assert.ok(observedStates.some(s => s.status === 'completed' && s.progress === 100), 'Must broadcast completed stage at 100%');

    // Cleanup generated MP3
    try { fs.unlinkSync(item.completedFilePath); } catch (_e) {}
  });

  it('AC-07 (Worst-Case): executeItem() captures yt-dlp stderr and surfaces retry/failure state clearly when download fails', async () => {
    process.env.TUNEFLOW_YTDLP_BIN = fakeYtdlpFailPath;

    const q = new DownloadQueue({ skipRestore: true });
    q.isPaused = true;

    const item = q.add({
      url: 'https://www.youtube.com/watch?v=9bZkp7q19f0',
      title: 'Simulated Network Failure Song',
      uploader: 'Artist',
      duration: 120,
      format: 'mp3'
    });

    // Attempt 1 -> retries = 1, status = 'queued', lastError captured from stderr
    await q.executeItem(item);
    assert.equal(item.status, 'queued');
    assert.equal(item.retries, 1);
    assert.match(item.lastError, /Simulated network reset at 98%/, 'Must capture yt-dlp stderr into item.lastError');

    // Attempt 2 -> retries = 2
    await q.executeItem(item);
    assert.equal(item.status, 'queued');
    assert.equal(item.retries, 2);

    // Attempt 3 -> retries = 3
    await q.executeItem(item);
    assert.equal(item.status, 'queued');
    assert.equal(item.retries, 3);

    // Attempt 4 (exhausted MAX_RETRIES = 3) -> status = 'failed' with stderr message
    await q.executeItem(item);
    assert.equal(item.status, 'failed');
    assert.match(item.error, /Simulated network reset at 98%/, 'Final failed item.error must include yt-dlp stderr details');
  });

  it('AC-06 & AC-09: Static & packaging contracts enforce live DOM counter preservation and default ffmpeg bundling', () => {
    const i18nJs = fs.readFileSync(path.join(__dirname, '../public/js/i18n.js'), 'utf8');
    const appJs = fs.readFileSync(path.join(__dirname, '../public/js/app.js'), 'utf8');
    const bundleJs = fs.readFileSync(path.join(__dirname, '../scripts/bundle-sidecars.js'), 'utf8');
    const syncPs1 = fs.readFileSync(path.join(__dirname, '../scripts/sync_local_install.ps1'), 'utf8');
    const launcherCs = fs.readFileSync(path.join(__dirname, '../installer/windows/TuneFlowLauncher.cs'), 'utf8');

    assert.ok(
      i18nJs.includes('updateLabelPreservingCounterSpan'),
      'i18n.js must preserve live counter span nodes (#queue-badge-count, #drawer-count, #fav-count) instead of overwriting innerHTML'
    );
    assert.ok(
      appJs.includes('updateQueueCounters') && appJs.includes('bumpOptimisticQueueCounters'),
      'app.js must dynamically resolve and update live queue counter elements'
    );
    assert.ok(
      bundleJs.includes("!args.includes('--no-ffmpeg')"),
      'bundle-sidecars.js must include ffmpeg by default unless --no-ffmpeg is passed'
    );
    assert.match(
      syncPs1,
      /bundle-sidecars\.js.*--include-ffmpeg/,
      'sync_local_install.ps1 must invoke bundle-sidecars.js with --include-ffmpeg'
    );
    assert.ok(
      launcherCs.includes('TUNEFLOW_DESKTOP_LOCAL'),
      'TuneFlowLauncher.cs must set TUNEFLOW_DESKTOP_LOCAL=1 for the spawned backend process'
    );
  });
});
