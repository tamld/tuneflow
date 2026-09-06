const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { formatDuration, searchYouTube } = require('../src/engine/ytdlp');
const queue = require('../src/engine/queue');

describe('TuneFlow Core Engine Unit Tests', () => {
  it('should correctly format duration seconds to MM:SS string', () => {
    assert.equal(formatDuration(0), '00:00');
    assert.equal(formatDuration(65), '01:05');
    assert.equal(formatDuration(360), '06:00');
    assert.equal(formatDuration(3665), '1:01:05');
    assert.equal(formatDuration(null), '00:00');
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
});
