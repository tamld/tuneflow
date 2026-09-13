const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { formatDuration, parseDurationString, supportsJsRuntimes, searchYouTube, getPreviewStreamUrl, streamUrlCache } = require('../src/engine/ytdlp');
const queue = require('../src/engine/queue');

describe('TuneFlow Core Engine Unit Tests', () => {
  before(() => {
    queue.isPaused = true;
  });

  after(() => {
    queue.isPaused = false;
    queue.clearCompleted();
  });
  it('should correctly format duration seconds to MM:SS string', () => {
    assert.equal(formatDuration(0), '00:00');
    assert.equal(formatDuration(65), '01:05');
    assert.equal(formatDuration(360), '06:00');
    assert.equal(formatDuration(3665), '1:01:05');
    assert.equal(formatDuration(null), '00:00');
  });

  it('should correctly parse duration string to total seconds', () => {
    assert.equal(parseDurationString('00:00'), 0);
    assert.equal(parseDurationString('01:05'), 65);
    assert.equal(parseDurationString('05:19'), 319);
    assert.equal(parseDurationString('1:01:05'), 3665);
    assert.equal(parseDurationString(null), 0);
    assert.equal(parseDurationString(''), 0);
  });

  it('should probe supportsJsRuntimes and return boolean without throwing', () => {
    const supported = supportsJsRuntimes();
    assert.equal(typeof supported, 'boolean');
  });

  it('should perform searchYouTube and return normalized track list', async () => {
    const results = await searchYouTube('Dan ca que huong', { limit: 2 });
    assert.ok(Array.isArray(results));
    assert.ok(results.length > 0);
    const first = results[0];
    assert.ok(first.id);
    assert.ok(first.title);
    assert.ok(first.uploader);
    assert.ok(first.duration_string);
    assert.ok(first.thumbnail);
    assert.ok(first.url);
  });

  it('should cache preview stream URL lookups in streamUrlCache', () => {
    const testUrl = 'https://www.youtube.com/watch?v=mock_cached_url';
    const fakeStream = 'https://googlevideo.com/mock_stream_123';
    streamUrlCache.set(testUrl, fakeStream);
    assert.equal(streamUrlCache.get(testUrl), fakeStream);
  });

  it('should initialize download queue with zero active items', () => {
    const all = queue.getAll();
    assert.ok(Array.isArray(all));
  });

  it('should correctly add item to queue and transition status to queued', () => {
    const item = queue.add({
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      title: 'Never Gonna Give You Up',
      uploader: 'Rick Astley'
    });

    assert.ok(item.id);
    assert.equal(item.title, 'Never Gonna Give You Up');
    assert.equal(item.uploader, 'Rick Astley');
    assert.equal(item.format, 'mp3');
  });

  it('should allow cancelling a queued item safely', () => {
    const item = queue.add({
      url: 'https://www.youtube.com/watch?v=test_id',
      title: 'Bài hát thử nghiệm'
    });

    const cancelled = queue.cancel(item.id);
    assert.equal(cancelled, true);

    const fetched = queue.get(item.id);
    assert.equal(fetched.status, 'cancelled');
  });

  it('should query getYtDlpVersion and getFFmpegVersion without throwing', async () => {
    const { getYtDlpVersion, getFFmpegVersion } = require('../src/engine/ytdlp');
    const ytdlpVer = await getYtDlpVersion();
    const ffmpegVer = await getFFmpegVersion();
    assert.equal(typeof ytdlpVer, 'string');
    assert.equal(typeof ffmpegVer, 'string');
  });

  it('should collect getSystemDiagnostics accurately', async () => {
    const { getSystemDiagnostics } = require('../src/engine/ytdlp');
    const diag = await getSystemDiagnostics();
    assert.ok(diag);
    assert.equal(typeof diag.nodeVersion, 'string');
    assert.equal(typeof diag.platform, 'string');
    assert.equal(typeof diag.arch, 'string');
    assert.ok(diag.storage);
    assert.equal(typeof diag.storage.usedMb, 'number');
    assert.equal(typeof diag.storage.quotaMb, 'number');
  });

  it('should execute updateYtDlpBinary with mock success and fail branches', async () => {
    const { updateYtDlpBinary } = require('../src/engine/ytdlp');

    process.env.MOCK_YTDLP_UPDATE = 'success';
    try {
      const resSuccess = await updateYtDlpBinary();
      assert.equal(resSuccess.success, true);
      assert.equal(resSuccess.newVersion, '2025.02.01');
    } finally {
      delete process.env.MOCK_YTDLP_UPDATE;
    }

    process.env.MOCK_YTDLP_UPDATE = 'fail';
    try {
      const resFail = await updateYtDlpBinary();
      assert.equal(resFail.success, false);
      assert.ok(resFail.error.includes('Không thể tự động cập nhật yt-dlp'));
    } finally {
      delete process.env.MOCK_YTDLP_UPDATE;
    }
  });
});
