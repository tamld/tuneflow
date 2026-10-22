const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { isValidYouTubeUrl, isSafeRemoteStreamUrl } = require('../src/utils/validator');
const { createRateLimiter } = require('../src/utils/rateLimiter');

describe('Deep Vertical Security & Edge Case Hardening Suite', () => {
  describe('Userinfo Injection Defenses (validator.js)', () => {
    it('should reject YouTube URLs embedded with userinfo credentials', () => {
      assert.strictEqual(isValidYouTubeUrl('https://attacker:secret@www.youtube.com/watch?v=dQw4w9WgXcQ'), false);
      assert.strictEqual(isValidYouTubeUrl('https://admin@youtube.com/watch?v=dQw4w9WgXcQ'), false);
      assert.strictEqual(isValidYouTubeUrl('http://token:pass@m.youtube.com/watch?v=dQw4w9WgXcQ'), false);
      // Percent-encoded userinfo cases (F2-3 audit)
      assert.strictEqual(isValidYouTubeUrl('https://user%40evil.com:secret@www.youtube.com/watch?v=dQw4w9WgXcQ'), false);
      assert.strictEqual(isValidYouTubeUrl('https://admin%3Apass@m.youtube.com/watch?v=dQw4w9WgXcQ'), false);
    });

    it('should reject remote stream URLs embedded with userinfo', () => {
      assert.strictEqual(isSafeRemoteStreamUrl('https://admin:pass@googlevideo.com/videoplayback?id=123'), false);
      assert.strictEqual(isSafeRemoteStreamUrl('https://user@rr1---sn-4g5edn6s.googlevideo.com/videoplayback'), false);
      assert.strictEqual(isSafeRemoteStreamUrl('https://user%40domain:token@googlevideo.com/videoplayback'), false);
    });
  });

  describe('Standard vs Non-Standard Port Enforcement (F2-2 Counterexample 1)', () => {
    it('should accept explicit standard ports matching their protocol', () => {
      assert.strictEqual(isValidYouTubeUrl('https://www.youtube.com:443/watch?v=dQw4w9WgXcQ'), true);
      assert.strictEqual(isValidYouTubeUrl('https://youtube.com:443/watch?v=dQw4w9WgXcQ'), true);
      assert.strictEqual(isValidYouTubeUrl('http://www.youtube.com:80/watch?v=dQw4w9WgXcQ'), true);
      assert.strictEqual(isSafeRemoteStreamUrl('https://googlevideo.com:443/videoplayback?id=123'), true);
    });

    it('should strictly reject arbitrary or mismatched non-standard ports', () => {
      assert.strictEqual(isValidYouTubeUrl('https://www.youtube.com:8080/watch?v=dQw4w9WgXcQ'), false);
      assert.strictEqual(isValidYouTubeUrl('https://www.youtube.com:8443/watch?v=dQw4w9WgXcQ'), false);
      assert.strictEqual(isValidYouTubeUrl('https://www.youtube.com:22/watch?v=dQw4w9WgXcQ'), false);
      assert.strictEqual(isValidYouTubeUrl('https://www.youtube.com:80/watch?v=dQw4w9WgXcQ'), false);
      assert.strictEqual(isValidYouTubeUrl('http://www.youtube.com:443/watch?v=dQw4w9WgXcQ'), false);
      assert.strictEqual(isSafeRemoteStreamUrl('https://googlevideo.com:8080/videoplayback?id=123'), false);
      assert.strictEqual(isSafeRemoteStreamUrl('https://googlevideo.com:8443/videoplayback?id=123'), false);
    });
  });

  describe('SSRF & IPv6 Address Boundary Validation (F2-2 Counterexample 3)', () => {
    it('should reject IPv6 loopback, link-local, and IPv4-mapped IPv6 targets', () => {
      assert.strictEqual(isSafeRemoteStreamUrl('https://[::1]/videoplayback'), false);
      assert.strictEqual(isSafeRemoteStreamUrl('https://[::ffff:127.0.0.1]/videoplayback'), false);
      assert.strictEqual(isSafeRemoteStreamUrl('https://[::ffff:10.0.0.1]/videoplayback'), false);
      assert.strictEqual(isSafeRemoteStreamUrl('https://[::ffff:192.168.1.1]/videoplayback'), false);
      assert.strictEqual(isSafeRemoteStreamUrl('https://[fe80::1]/videoplayback'), false);
      assert.strictEqual(isSafeRemoteStreamUrl('https://[fe80::1%25eth0]/videoplayback'), false);
    });

    it('should preserve mock-audio test harness route only on genuine loopback', () => {
      assert.strictEqual(isSafeRemoteStreamUrl('https://localhost/mock-audio/track.mp3'), true);
      assert.strictEqual(isSafeRemoteStreamUrl('https://127.0.0.1/mock-audio/track.mp3'), true);
      assert.strictEqual(isSafeRemoteStreamUrl('https://[::1]/mock-audio/track.mp3'), true);
      // Ensure private/untrusted hosts cannot abuse mock-audio path bypass
      assert.strictEqual(isSafeRemoteStreamUrl('https://192.168.1.100/mock-audio/track.mp3'), false);
      assert.strictEqual(isSafeRemoteStreamUrl('https://internal-service.local/mock-audio/track.mp3'), false);
    });
  });

  describe('Bounded Memory & O(1) LRU Eviction in Rate Limiter', () => {
    it('should bound cache size to maxUniqueIps, evict specific LRU IP, and track metrics', () => {
      const limiter = createRateLimiter({ windowMs: 60000, max: 5, maxUniqueIps: 3 });

      const mockRes = () => ({
        headers: {},
        statusCode: 200,
        body: null,
        setHeader(name, val) { this.headers[name] = val; },
        status(code) { this.statusCode = code; return this; },
        json(payload) { this.body = payload; return this; }
      });

      let nextCalled = 0;
      const next = () => { nextCalled++; };

      // IP 1, 2, 3 make initial requests
      limiter({ ip: '1.1.1.1' }, mockRes(), next);
      limiter({ ip: '2.2.2.2' }, mockRes(), next);
      limiter({ ip: '3.3.3.3' }, mockRes(), next);

      assert.strictEqual(nextCalled, 3);
      assert.strictEqual(limiter.has('1.1.1.1'), true);
      assert.strictEqual(limiter.has('2.2.2.2'), true);
      assert.strictEqual(limiter.has('3.3.3.3'), true);

      // Contract test on getStats() (F2-3 audit)
      const stats1 = limiter.getStats();
      assert.strictEqual(stats1.size, 3);
      assert.strictEqual(stats1.maxUniqueIps, 3);
      assert.strictEqual(stats1.evictedCount, 0);

      // IP 4 arrives (new IP) - must NOT be 429-blocked (prevents DoS amplification caught by F2-2)
      const res4 = mockRes();
      limiter({ ip: '4.4.4.4' }, res4, next);
      assert.strictEqual(nextCalled, 4);
      assert.strictEqual(res4.statusCode, 200);

      // Verify specific LRU eviction: 1.1.1.1 was the oldest, so it was evicted
      assert.strictEqual(limiter.has('1.1.1.1'), false);
      assert.strictEqual(limiter.has('2.2.2.2'), true);
      assert.strictEqual(limiter.has('3.3.3.3'), true);
      assert.strictEqual(limiter.has('4.4.4.4'), true);
      assert.strictEqual(limiter.getStats().evictedCount, 1);
      assert.strictEqual(limiter.getStats().size, 3);

      // Touch 2.2.2.2 to refresh its LRU position (making 3.3.3.3 the new oldest LRU)
      limiter({ ip: '2.2.2.2' }, mockRes(), next);
      assert.strictEqual(nextCalled, 5);

      // IP 5 arrives (new IP) - should evict 3.3.3.3 (not 2.2.2.2)
      limiter({ ip: '5.5.5.5' }, mockRes(), next);
      assert.strictEqual(nextCalled, 6);
      assert.strictEqual(limiter.has('3.3.3.3'), false);
      assert.strictEqual(limiter.has('2.2.2.2'), true);
      assert.strictEqual(limiter.has('4.4.4.4'), true);
      assert.strictEqual(limiter.has('5.5.5.5'), true);
      assert.strictEqual(limiter.getStats().evictedCount, 2);
      assert.strictEqual(limiter.getStats().size, 3);

      // Regression safety test: evicted IP 1.1.1.1 returns later -> treated as new with clean quota
      const res1Return = mockRes();
      limiter({ ip: '1.1.1.1' }, res1Return, next);
      assert.strictEqual(nextCalled, 7);
      assert.strictEqual(res1Return.statusCode, 200);
      assert.strictEqual(limiter.has('1.1.1.1'), true);

      // Reset test
      limiter.reset();
      assert.strictEqual(limiter.getStats().size, 0);
      assert.strictEqual(limiter.getStats().evictedCount, 0);
      assert.strictEqual(limiter.has('1.1.1.1'), false);
    });

    it('should enforce max threshold 429 without unbounded timestamp accumulation', () => {
      const limiter = createRateLimiter({ windowMs: 60000, max: 2, maxUniqueIps: 10 });
      const mockRes = () => ({
        headers: {},
        statusCode: 200,
        body: null,
        setHeader(name, val) { this.headers[name] = val; },
        status(code) { this.statusCode = code; return this; },
        json(payload) { this.body = payload; return this; }
      });

      let nextCalled = 0;
      const next = () => { nextCalled++; };

      const ip = '9.9.9.9';
      limiter({ ip }, mockRes(), next);
      limiter({ ip }, mockRes(), next);
      assert.strictEqual(nextCalled, 2);

      // 3rd, 4th, 5th requests exceed max and receive 429 with correct Retry-After header
      for (let i = 0; i < 3; i++) {
        const res = mockRes();
        limiter({ ip }, res, next);
        assert.strictEqual(res.statusCode, 429);
        assert.strictEqual(res.headers['Retry-After'], 60);
      }
      // next() should not have been called for 429 requests
      assert.strictEqual(nextCalled, 2);
    });

    it('should handle concurrent burst requests safely', async () => {
      const limiter = createRateLimiter({ windowMs: 60000, max: 5, maxUniqueIps: 10 });
      let passedCount = 0;
      let blockedCount = 0;

      const runRequest = () => new Promise(resolve => {
        const res = {
          headers: {},
          setHeader(k, v) { this.headers[k] = v; },
          status(code) {
            if (code === 429) blockedCount++;
            return this;
          },
          json() { resolve(); }
        };
        const next = () => {
          passedCount++;
          resolve();
        };
        limiter({ ip: '8.8.8.8' }, res, next);
      });

      // 8 concurrent requests
      await Promise.all(Array.from({ length: 8 }, runRequest));
      assert.strictEqual(passedCount, 5);
      assert.strictEqual(blockedCount, 3);
    });
  });
});
