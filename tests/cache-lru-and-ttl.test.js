const { describe, it } = require('node:test');
const assert = require('node:assert');
const { SimpleCache, extractStreamUrlTtl } = require('../src/engine/ytdlp');

describe('System Design: True LRU Cache & Dynamic Upstream TTL Suite', () => {
  it('should evict the least recently used entry when capacity is exceeded (True LRU)', () => {
    assert.ok(typeof SimpleCache === 'function', 'SimpleCache must be exported');
    const cache = new SimpleCache(60000, 3); // max 3 items

    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.set('key3', 'value3');

    // Access key1 so it becomes the Most Recently Used
    const val1 = cache.get('key1');
    assert.strictEqual(val1, 'value1');

    // Add key4 -> should evict key2 (the least recently used), NOT key1
    cache.set('key4', 'value4');

    assert.strictEqual(cache.get('key1'), 'value1', 'key1 should still exist because it was recently read');
    assert.strictEqual(cache.get('key2'), null, 'key2 should have been evicted as LRU');
    assert.strictEqual(cache.get('key3'), 'value3', 'key3 should still exist');
    assert.strictEqual(cache.get('key4'), 'value4', 'key4 should exist');
  });

  it('should refresh LRU order on consecutive accesses', () => {
    const cache = new SimpleCache(60000, 3);

    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);

    // Access 'a' then 'b'
    cache.get('a');
    cache.get('b');

    // 'c' is now the LRU
    cache.set('d', 4);

    assert.strictEqual(cache.get('c'), null, 'c should be evicted as it was LRU');
    assert.strictEqual(cache.get('a'), 1);
    assert.strictEqual(cache.get('b'), 2);
    assert.strictEqual(cache.get('d'), 4);
  });

  it('should evict expired items and return null', (t, done) => {
    const cache = new SimpleCache(50, 10); // 50ms TTL
    cache.set('fast', 'data');

    assert.strictEqual(cache.get('fast'), 'data');

    setTimeout(() => {
      assert.strictEqual(cache.get('fast'), null, 'Expired item should return null');
      done();
    }, 70);
  });

  it('should parse expire parameter from YouTube CDN URL and calculate dynamic TTL', () => {
    assert.ok(typeof extractStreamUrlTtl === 'function', 'extractStreamUrlTtl must be exported');

    const futureEpochSec = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    const cdnUrl = `https://rr1---sn-4g5ednzy.googlevideo.com/videoplayback?expire=${futureEpochSec}&ei=123&ip=1.2.3.4`;

    const defaultTtlMs = 15 * 60 * 1000;
    const ttl = extractStreamUrlTtl(cdnUrl, defaultTtlMs);

    // Expected ~ 3600 - 60s safety buffer = ~3540s = ~3540000ms
    assert.ok(ttl > 3000 * 1000, `TTL should be > 3000s, got ${ttl}ms`);
    assert.ok(ttl <= 3600 * 1000, `TTL should be <= 3600s, got ${ttl}ms`);
  });

  it('should fallback to default TTL when URL lacks expire or is expired', () => {
    const defaultTtlMs = 15 * 60 * 1000;

    // No expire param
    const noExpireUrl = 'https://example.com/audio.mp3?token=abc';
    assert.strictEqual(extractStreamUrlTtl(noExpireUrl, defaultTtlMs), defaultTtlMs);

    // Expired timestamp (in the past)
    const pastEpochSec = Math.floor(Date.now() / 1000) - 100;
    const pastUrl = `https://googlevideo.com/videoplayback?expire=${pastEpochSec}`;
    assert.strictEqual(extractStreamUrlTtl(pastUrl, defaultTtlMs), defaultTtlMs);

    // Non-string input
    assert.strictEqual(extractStreamUrlTtl(null, defaultTtlMs), defaultTtlMs);
    assert.strictEqual(extractStreamUrlTtl('', defaultTtlMs), defaultTtlMs);
  });
});
