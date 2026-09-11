const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const http = require('http');

describe('Issue #121 & #122: Dynamic Localization, Fast Playlist Extraction & Thumbnail Resilience Suite', () => {
  const publicDir = path.join(__dirname, '..', 'public');
  const srcDir = path.join(__dirname, '..', 'src');

  const htmlContent = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
  const cssContent = fs.readFileSync(path.join(publicDir, 'css', 'silver-melody.css'), 'utf8');
  const appJsContent = fs.readFileSync(path.join(publicDir, 'js', 'app.js'), 'utf8');
  const i18nContent = fs.readFileSync(path.join(publicDir, 'js', 'i18n.js'), 'utf8');
  const serverJsContent = fs.readFileSync(path.join(srcDir, 'server.js'), 'utf8');
  const ytdlpContent = fs.readFileSync(path.join(srcDir, 'engine', 'ytdlp.js'), 'utf8');

  describe('Issue #121: Dynamic Localization (i18n) & English Coverage', () => {
    it('should verify i18n.js contains tokens for content/sort filter labels, chips, and playlist card text', () => {
      const requiredTokens = [
        'filter_content_label',
        'filter_sort_label',
        'filter_all_type',
        'filter_song_type',
        'filter_playlist_type',
        'sort_relevance',
        'sort_views',
        'sort_date',
        'search_searching',
        'search_results_found',
        'artist_default',
        'btn_open_playlist',
        'playlist_panel_title',
        'playlist_panel_meta'
      ];

      for (const token of requiredTokens) {
        assert.ok(i18nContent.includes(token), `i18n.js must contain token: ${token}`);
      }
    });

    it('should verify setLanguage in i18n.js translates filter chips and search labels dynamically', () => {
      assert.match(i18nContent, /data-search-type/, 'setLanguage must update data-search-type chips');
      assert.match(i18nContent, /data-search-sort/, 'setLanguage must update data-search-sort chips');
    });

    it('should verify app.js exposes reRenderActiveCards to update cards on language toggle', () => {
      assert.match(appJsContent, /window\.reRenderActiveCards\s*=\s*/, 'app.js must expose window.reRenderActiveCards');
    });
  });

  describe('Issue #122: Thumbnail Referrer Policy, CSP & SVG Fallback', () => {
    it('should verify all img tags in app.js specify referrerpolicy="no-referrer" to prevent hotlink blocks', () => {
      const imgMatches = appJsContent.match(/<img[^>]+>/g) || [];
      assert.ok(imgMatches.length > 0, 'Must find img tags in app.js');
      for (const imgTag of imgMatches) {
        assert.match(imgTag, /referrerpolicy=["']no-referrer["']/, `Image tag must include referrerpolicy="no-referrer": ${imgTag.slice(0, 60)}`);
      }
    });

    it('should verify server.js CSP header whitelists ggpht.com and googleusercontent.com image CDNs', () => {
      assert.match(serverJsContent, /https:\/\/\*\.ggpht\.com/, 'CSP must allow https://*.ggpht.com');
      assert.match(serverJsContent, /https:\/\/\*\.googleusercontent\.com/, 'CSP must allow https://*.googleusercontent.com');
    });

    it('should verify SVG onerror fallback provides a music icon and not just a blank grey box', () => {
      assert.match(appJsContent, /🎵|🎶|music/, 'SVG onerror fallback must include a music indicator');
    });
  });

  describe('Issue #122: Fast Zero-Subprocess Innertube Playlist Extraction & Interactive UX', () => {
    it('should verify ytdlp.js defines or integrates Innertube playlist browsing', () => {
      assert.match(ytdlpContent, /parsePlaylistInnertube|youtubei\/v1\/browse/, 'ytdlp.js must support fast Innertube playlist parsing');
    });

    it('should verify app.js provides button loading feedback when clicking open playlist', () => {
      assert.match(appJsContent, /disabled\s*=\s*true/, 'Playlist button must be disabled during load');
      assert.match(appJsContent, /scrollIntoView/, 'Playlist panel should smoothly scroll into view');
    });
  });
});
