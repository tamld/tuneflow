const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const express = require('express');

describe('Issue #80: Playlist Discovery, Type Filters & Advanced Sorting Suite', () => {
  const publicDir = path.join(__dirname, '..', 'public');
  const htmlPath = path.join(publicDir, 'index.html');
  const appJsPath = path.join(publicDir, 'js', 'app.js');
  const i18nPath = path.join(publicDir, 'js', 'i18n.js');

  let server;
  let serverPort;

  before(async () => {
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
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  describe('Frontend UI & HTML Filter Controls', () => {
    it('should verify index.html includes Type Filter buttons (All, Video, Playlist)', () => {
      assert.ok(fs.existsSync(htmlPath), 'index.html must exist');
      const html = fs.readFileSync(htmlPath, 'utf8');

      assert.ok(html.includes('data-search-type="all"'), 'Must include All type filter');
      assert.ok(html.includes('data-search-type="video"'), 'Must include Video type filter');
      assert.ok(html.includes('data-search-type="playlist"'), 'Must include Playlist type filter');
    });

    it('should verify index.html includes Sort buttons (Relevance, Views, Date)', () => {
      const html = fs.readFileSync(htmlPath, 'utf8');

      assert.ok(html.includes('data-search-sort="relevance"'), 'Must include Relevance sort button');
      assert.ok(html.includes('data-search-sort="views"'), 'Must include Views sort button');
      assert.ok(html.includes('data-search-sort="date"'), 'Must include Date/Latest sort button');
    });

    it('should verify i18n contains localized strings for search filters and sorting', () => {
      const i18n = fs.readFileSync(i18nPath, 'utf8');

      assert.ok(i18n.includes('sort_relevance') || i18n.includes('filter_playlist'), 'i18n must include playlist or sort keys');
    });

    it('should verify app.js handles search type/sort state and playlist card actions', () => {
      const appJs = fs.readFileSync(appJsPath, 'utf8');

      assert.ok(appJs.includes('currentSearchType') || appJs.includes('data-search-type'), 'app.js must track search type');
      assert.ok(appJs.includes('currentSearchSort') || appJs.includes('data-search-sort'), 'app.js must track search sort');
      assert.ok(appJs.includes('isPlaylist') || appJs.includes('playlistId'), 'app.js must render playlist-specific action');
    });
  });

  describe('Backend API & Engine Options (/api/search)', () => {
    it('GET /api/search should accept type=playlist parameter gracefully', async () => {
      const res = await fetch(`http://127.0.0.1:${serverPort}/api/search?q=bolero&type=playlist&limit=3`);
      assert.strictEqual(res.status, 200);

      const data = await res.json();
      assert.ok(data.ok);
      assert.ok(Array.isArray(data.results));
      assert.strictEqual(data.type, 'playlist');
    });

    it('GET /api/search should accept sort=views parameter gracefully', async () => {
      const res = await fetch(`http://127.0.0.1:${serverPort}/api/search?q=quang+le&sort=views&limit=3`);
      assert.strictEqual(res.status, 200);

      const data = await res.json();
      assert.ok(data.ok);
      assert.ok(Array.isArray(data.results));
      assert.strictEqual(data.sort, 'views');
    });

    it('GET /api/search should accept sort=date parameter gracefully', async () => {
      const res = await fetch(`http://127.0.0.1:${serverPort}/api/search?q=quang+le&sort=date&limit=3`);
      assert.strictEqual(res.status, 200);

      const data = await res.json();
      assert.ok(data.ok);
      assert.ok(Array.isArray(data.results));
      assert.strictEqual(data.sort, 'date');
    });

    it('GET /api/search should sanitize invalid type and sort parameters to defaults', async () => {
      const res = await fetch(`http://127.0.0.1:${serverPort}/api/search?q=bolero&type=hacker&sort=malicious&limit=2`);
      assert.strictEqual(res.status, 200);

      const data = await res.json();
      assert.ok(data.ok);
      assert.strictEqual(data.type, 'all');
      assert.strictEqual(data.sort, 'relevance');
    });
  });
});
