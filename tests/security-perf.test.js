const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { app } = require('../src/server');
const { isValidYouTubeUrl, isValidVideoId } = require('../src/utils/validator');
const { createRateLimiter } = require('../src/utils/rateLimiter');
const { searchCache, playlistCache } = require('../src/engine/ytdlp');
const queue = require('../src/engine/queue');
const { DOWNLOADS_DIR } = require('../src/config');

describe('TuneFlow Security, Performance & Quota Verification Tests', () => {
  let server;
  let baseUrl;

  before(async () => {
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
    // Cancel any active queue items and close all keep-alive connections
    for (const item of queue.getAll()) {
      queue.cancel(item.id);
    }
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  });

  // 1. SSRF & Input Validation Tests
  describe('SSRF Protection & URL Validation', () => {
    it('should validate official YouTube domains and reject arbitrary or private IP URLs', () => {
      assert.equal(isValidYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), true);
      assert.equal(isValidYouTubeUrl('https://youtu.be/dQw4w9WgXcQ'), true);
      assert.equal(isValidYouTubeUrl('https://m.youtube.com/watch?v=dQw4w9WgXcQ'), true);
      assert.equal(isValidYouTubeUrl('https://music.youtube.com/watch?v=dQw4w9WgXcQ'), true);

      // SSRF Attack Vectors
      assert.equal(isValidYouTubeUrl('http://192.168.1.1/admin'), false);
      assert.equal(isValidYouTubeUrl('http://169.254.169.254/latest/meta-data'), false);
      assert.equal(isValidYouTubeUrl('http://localhost:3000/api/health'), false);
      assert.equal(isValidYouTubeUrl('file:///etc/passwd'), false);
      assert.equal(isValidYouTubeUrl('https://evil-phishing-site.com'), false);
      assert.equal(isValidYouTubeUrl(''), false);
      assert.equal(isValidYouTubeUrl(null), false);
    });

    it('should validate 11-character YouTube video IDs and reject malformed ones', () => {
      assert.equal(isValidVideoId('dQw4w9WgXcQ'), true);
      assert.equal(isValidVideoId('AijtDEOX7Ps'), true);
      assert.equal(isValidVideoId('_abc-123_45'), true);

      // Invalid IDs
      assert.equal(isValidVideoId('short'), false);
      assert.equal(isValidVideoId('toolongvideoidentifier'), false);
      assert.equal(isValidVideoId('invalid;id!'), false);
      assert.equal(isValidVideoId(''), false);
      assert.equal(isValidVideoId(null), false);
    });

    it('POST /api/queue/add should reject SSRF target with 400 Bad Request', async () => {
      const res = await fetch(`${baseUrl}/api/queue/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: 'http://192.168.1.1/secret.mp3',
          title: 'SSRF Exploit Probe'
        })
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.ok(data.error.includes('không thuộc YouTube'));
    });

    it('POST /api/playlist/parse should reject non-YouTube playlist URL with 400 Bad Request', async () => {
      const res = await fetch(`${baseUrl}/api/playlist/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: 'http://169.254.169.254/playlist'
        })
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.ok(data.error.includes('không thuộc YouTube'));
    });

    it('GET /api/preview/:id should reject invalid video ID format with 400', async () => {
      const res = await fetch(`${baseUrl}/api/preview/invalid_id!`);
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.ok(data.error.includes('không hợp lệ'));
    });
  });

  // 2. Performance & In-Memory Caching Tests
  describe('In-Memory Caching & Throttling', () => {
    it('should store and retrieve cached search results without spawning child processes', () => {
      const testKey = 'test_search_query:10::false';
      const mockResults = [{ id: 'mock1', title: 'Cached Song' }];
      
      searchCache.set(testKey, mockResults);
      const retrieved = searchCache.get(testKey);
      
      assert.deepEqual(retrieved, mockResults);
    });

    it('should store and retrieve cached playlist metadata', () => {
      const testUrl = 'https://www.youtube.com/playlist?list=PLmock123';
      const mockPlaylist = { title: 'Cached Playlist', count: 1, entries: [] };

      playlistCache.set(`${testUrl}:50`, mockPlaylist);
      const retrieved = playlistCache.get(`${testUrl}:50`);

      assert.deepEqual(retrieved, mockPlaylist);
    });
  });

  // 3. Storage Quota Enforcement (FIFO)
  describe('Storage Quota Enforcement (MAX_STORAGE_MB)', () => {
    const testFile1 = path.join(DOWNLOADS_DIR, 'test_quota_old.mp3');
    const testFile2 = path.join(DOWNLOADS_DIR, 'test_quota_new.mp3');

    before(() => {
      // Create two dummy files with different timestamps
      fs.writeFileSync(testFile1, Buffer.alloc(1024 * 50)); // 50KB
      // Set older mtime on testFile1
      const past = new Date(Date.now() - 100000);
      fs.utimesSync(testFile1, past, past);

      fs.writeFileSync(testFile2, Buffer.alloc(1024 * 50)); // 50KB
    });

    after(() => {
      try { fs.unlinkSync(testFile1); } catch (e) {}
      try { fs.unlinkSync(testFile2); } catch (e) {}
    });

    it('enforceStorageQuota should prune oldest file when simulated quota is exceeded', () => {
      // Simulate an ultra-low quota of 0.08 MB (80KB), which is smaller than 50KB + 50KB = 100KB
      const pruned = queue.enforceStorageQuota(0.08);
      assert.ok(pruned >= 1, 'Should have pruned at least 1 file to fit within quota');
      assert.equal(fs.existsSync(testFile1), false, 'Oldest file should have been deleted');
    });
  });

  // 4. Path Traversal Protection
  describe('Path Traversal Security on /api/download/:id/file', () => {
    it('should reject requests attempting path traversal outside DOWNLOADS_DIR', async () => {
      // Add a mock item with a malicious completedFilePath attempting path traversal
      const maliciousItem = {
        id: 'malicious_test_item',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        title: 'Traveral Test',
        sanitizedTitle: 'Traversal_Test',
        status: 'completed',
        completedFilePath: path.resolve(__dirname, '../package.json'), // Pointing to package.json outside DOWNLOADS_DIR
        checksum: 'dummy'
      };

      queue.items.set(maliciousItem.id, maliciousItem);

      const res = await fetch(`${baseUrl}/api/download/${maliciousItem.id}/file`);
      assert.equal(res.status, 403);
      const text = await res.text();
      assert.ok(text.includes('không hợp lệ'));

      queue.items.delete(maliciousItem.id);
    });
  });

  // 5. Rate Limiter Middleware
  describe('In-Memory Sliding Window Rate Limiter', () => {
    it('createRateLimiter should throttle when request count exceeds threshold', () => {
      const limiter = createRateLimiter({
        windowMs: 10000,
        max: 2,
        message: 'Throttled'
      });

      let nextCalled = 0;
      const req = { ip: '192.0.2.1', socket: {} };
      const res = {
        statusCode: 200,
        headers: {},
        setHeader(k, v) { this.headers[k] = v; },
        status(code) { this.statusCode = code; return this; },
        json(payload) { this.payload = payload; return this; }
      };

      limiter(req, res, () => { nextCalled++; });
      limiter(req, res, () => { nextCalled++; });
      assert.equal(nextCalled, 2);

      // Third request should exceed max=2 and be blocked
      limiter(req, res, () => { nextCalled++; });
      assert.equal(nextCalled, 2);
      assert.equal(res.statusCode, 429);
      assert.equal(res.payload.success, false);
    });
  });

  // 6. Phase 5 Zero-Disk Stream Pipe
  describe('Phase 5 Zero-Disk Stream Pipe (/api/stream/pipe/:id)', () => {
    it('should reject malformed video ID with 400 Bad Request', async () => {
      const res = await fetch(`${baseUrl}/api/stream/pipe/bad_id_123456789`);
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.ok(data.error.includes('không hợp lệ'));
    });
  });
});
