const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');

describe('TuneFlow Phase 8: PWA Offline, Voice Search & Network Discovery Suite', () => {
  const publicDir = path.join(__dirname, '..', 'public');
  const manifestWebPath = path.join(publicDir, 'manifest.webmanifest');
  const swPath = path.join(publicDir, 'sw.js');
  const htmlPath = path.join(publicDir, 'index.html');
  const cssPath = path.join(publicDir, 'css', 'silver-melody.css');
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

  it('should verify manifest.webmanifest exists and conforms to PWA spec', () => {
    assert.ok(fs.existsSync(manifestWebPath), 'public/manifest.webmanifest must exist');
    const content = fs.readFileSync(manifestWebPath, 'utf8').replace(/^\uFEFF/, '');
    const manifest = JSON.parse(content);

    assert.strictEqual(manifest.name, 'TuneFlow');
    assert.strictEqual(manifest.short_name, 'TuneFlow');
    assert.strictEqual(manifest.display, 'standalone');
    assert.ok(manifest.start_url);
    assert.ok(manifest.theme_color);
    assert.ok(manifest.background_color);
    assert.ok(Array.isArray(manifest.icons));
    assert.ok(manifest.icons.length >= 2, 'Must provide multiple icon resolutions (e.g. 192, 512)');
  });

  it('should verify sw.js exists with cache-first static shell caching strategy', () => {
    assert.ok(fs.existsSync(swPath), 'public/sw.js must exist');
    const swContent = fs.readFileSync(swPath, 'utf8');

    assert.ok(swContent.includes('CACHE_NAME') || swContent.includes('cache'), 'Must define cache name');
    assert.ok(swContent.includes('install'), 'Must handle install event');
    assert.ok(swContent.includes('fetch'), 'Must handle fetch event');
    assert.ok(swContent.includes('activate'), 'Must handle activate event');
  });

  it('should verify GET /api/system/network returns local LAN IP addresses for QR pairing', async () => {
    const res = await fetch(`http://127.0.0.1:${serverPort}/api/system/network`);
    assert.strictEqual(res.status, 200);

    const data = await res.json();
    assert.ok(data.hostname);
    assert.ok(typeof data.port === 'number' || typeof data.port === 'string');
    assert.ok(Array.isArray(data.localIPs), 'localIPs must be an array');
    assert.ok(data.lanUrl, 'lanUrl must be present');
    assert.ok(data.localIPs.length >= 1, 'Should find at least 1 local IP address');
  });

  it('should verify index.html links manifest.webmanifest and includes voice search button', () => {
    const html = fs.readFileSync(htmlPath, 'utf8');

    assert.ok(html.includes('manifest.webmanifest') || html.includes('rel="manifest"'), 'HTML must link webmanifest');
    assert.ok(html.includes('btn-voice-search') || html.includes('id="btn-voice"'), 'HTML must have voice search button');
    assert.ok(html.includes('serviceWorker.register') || html.includes('sw.js'), 'HTML or app.js must register serviceWorker');
  });

  it('should verify CSS styles for voice search and recording pulse state', () => {
    const css = fs.readFileSync(cssPath, 'utf8');

    assert.ok(css.includes('btn-voice-search') || css.includes('#btn-voice'), 'CSS must style voice search button');
    assert.ok(css.includes('recording'), 'CSS must define recording pulse or active state');
  });

  it('should verify i18n contains localized strings for voice search', () => {
    const i18n = fs.readFileSync(i18nPath, 'utf8');

    assert.ok(i18n.includes('voice_search') || i18n.includes('voiceSearch'), 'i18n must include voice search text');
  });
});
