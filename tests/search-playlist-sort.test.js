const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const express = require('express');
const { searchCache, streamUrlCache } = require('../src/engine/ytdlp');

describe('Issue #80: Playlist Discovery, Type Filters & Advanced Sorting Suite (Hermetic)', () => {
  const publicDir = path.join(__dirname, '..', 'public');
  const htmlPath = path.join(publicDir, 'index.html');
  const i18nPath = path.join(publicDir, 'js', 'i18n.js');

  let server;
  let serverPort;

  before(async () => {
    // Pre-seed searchCache to guarantee hermetic execution without live network calls
    searchCache.set('bolero:3::playlist:relevance', [
      { id: 'pl_bolero_1', title: 'Tuyển Tập Bolero Hải Ngoại', isPlaylist: true, url: 'https://www.youtube.com/playlist?list=pl_bolero_1' }
    ]);
    searchCache.set('quang le:3::all:views', [
      { id: 'vid_ql_views', title: 'Đập Vỡ Cây Đàn - Quang Lê', views: '50M', url: 'https://www.youtube.com/watch?v=vid_ql_views' }
    ]);
    searchCache.set('quang le:3::all:date', [
      { id: 'vid_ql_date', title: 'Bài Ca Tết Cho Em - Quang Lê Mới', date: '2026', url: 'https://www.youtube.com/watch?v=vid_ql_date' }
    ]);
    searchCache.set('bolero:2::all:relevance', [
      { id: 'vid_fallback_1', title: 'Sầu Tím Thiệp Hồng', url: 'https://www.youtube.com/watch?v=vid_fallback_1' }
    ]);

    // Pre-seed streamUrlCache so background speculative pre-warm doesn't spawn external yt-dlp
    streamUrlCache.set('https://www.youtube.com/watch?v=vid_ql_views', 'https://googlevideo.com/playback/mock');
    streamUrlCache.set('https://www.youtube.com/watch?v=vid_ql_date', 'https://googlevideo.com/playback/mock');
    streamUrlCache.set('https://www.youtube.com/watch?v=vid_fallback_1', 'https://googlevideo.com/playback/mock');

    const apiRoutes = require('../src/routes/api');
    const app = express();
    app.use(express.json());
    app.use('/api', apiRoutes);

    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        serverPort = server.address().port;
        resolve();
      });
    });
  });

  after(async () => {
    searchCache.clear();
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  describe('Frontend UI & HTML Filter Controls', () => {
    it('should verify index.html declares valid search filter controls with accessibility attributes', () => {
      assert.ok(fs.existsSync(htmlPath), 'index.html must exist');
      const html = fs.readFileSync(htmlPath, 'utf8');

      // Verify filter type buttons with role and data attributes
      assert.ok(html.includes('data-search-type="all"'), 'Must include All type filter');
      assert.ok(html.includes('data-search-type="video"'), 'Must include Video type filter');
      assert.ok(html.includes('data-search-type="playlist"'), 'Must include Playlist type filter');

      // Verify sorting buttons
      assert.ok(html.includes('data-search-sort="relevance"'), 'Must include Relevance sort button');
      assert.ok(html.includes('data-search-sort="views"'), 'Must include Views sort button');
      assert.ok(html.includes('data-search-sort="date"'), 'Must include Date/Latest sort button');
    });

    it('should verify i18n contains localized strings for search filters and sorting in both languages', () => {
      const i18nContent = fs.readFileSync(i18nPath, 'utf8');
      assert.ok(i18nContent.includes('filter_content_label'), 'Must have filter_content_label key');
      assert.ok(i18nContent.includes('sort_relevance'), 'Must have sort_relevance key');
      assert.ok(i18nContent.includes('sort_views'), 'Must have sort_views key');
      assert.ok(i18nContent.includes('sort_date'), 'Must have sort_date key');
    });
  });

  describe('Backend API & Engine Options (/api/search)', () => {
    it('GET /api/search should accept type=playlist parameter gracefully with hermetic cache', async () => {
      const res = await fetch(`http://127.0.0.1:${serverPort}/api/search?q=bolero&type=playlist&limit=3`);
      assert.strictEqual(res.status, 200);

      const data = await res.json();
      assert.ok(data.ok);
      assert.ok(Array.isArray(data.results));
      assert.strictEqual(data.type, 'playlist');
      assert.strictEqual(data.results[0].isPlaylist, true);
    });

    it('GET /api/search should accept sort=views parameter gracefully', async () => {
      const res = await fetch(`http://127.0.0.1:${serverPort}/api/search?q=quang+le&sort=views&limit=3`);
      assert.strictEqual(res.status, 200);

      const data = await res.json();
      assert.ok(data.ok);
      assert.ok(Array.isArray(data.results));
      assert.strictEqual(data.sort, 'views');
      assert.strictEqual(data.results[0].id, 'vid_ql_views');
    });

    it('GET /api/search should accept sort=date parameter gracefully', async () => {
      const res = await fetch(`http://127.0.0.1:${serverPort}/api/search?q=quang+le&sort=date&limit=3`);
      assert.strictEqual(res.status, 200);

      const data = await res.json();
      assert.ok(data.ok);
      assert.ok(Array.isArray(data.results));
      assert.strictEqual(data.sort, 'date');
      assert.strictEqual(data.results[0].id, 'vid_ql_date');
    });

    it('GET /api/search should sanitize invalid type and sort parameters to defaults', async () => {
      const res = await fetch(`http://127.0.0.1:${serverPort}/api/search?q=bolero&type=malicious&sort=unrecognized&limit=2`);
      assert.strictEqual(res.status, 200);

      const data = await res.json();
      assert.ok(data.ok);
      assert.strictEqual(data.type, 'all');
      assert.strictEqual(data.sort, 'relevance');
      assert.strictEqual(data.results[0].id, 'vid_fallback_1');
    });

    it('GET /api/search should reject empty query with HTTP 400', async () => {
      const res = await fetch(`http://127.0.0.1:${serverPort}/api/search?q=   `);
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.ok(data.error);
    });
  });
});
