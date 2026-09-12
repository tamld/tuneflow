/**
 * TuneFlow Remote Client Switcher & Multi-Artifact Packaging Test Suite
 * Authority: SPEC-0013 (Quadrant Q3/Q4 Remote Web Client & CI/CD Multi-Target Packaging)
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('SPEC-0013: Remote Client Switcher & CI/CD Multi-Artifact Packaging Suite', () => {
  const rootDir = path.resolve(__dirname, '..');
  const remoteClientJsPath = path.join(rootDir, 'public/js/remote-client.js');
  const indexHtmlPath = path.join(rootDir, 'public/index.html');
  const serverJsPath = path.join(rootDir, 'src/server.js');
  const appJsPath = path.join(rootDir, 'public/js/app.js');
  const playerJsPath = path.join(rootDir, 'public/js/player.js');
  const releaseYmlPath = path.join(rootDir, '.github/workflows/release.yml');
  const packageLinuxPath = path.join(rootDir, 'scripts/package_linux.sh');
  const packageMacosPath = path.join(rootDir, 'scripts/package_macos.sh');

  describe('1. Static File Existence & Syntax Verification', () => {
    it('should verify public/js/remote-client.js exists and is valid JavaScript', () => {
      assert.strictEqual(fs.existsSync(remoteClientJsPath), true, 'remote-client.js must exist');
      const content = fs.readFileSync(remoteClientJsPath, 'utf8');
      assert.doesNotThrow(() => {
        new vm.Script(content);
      }, 'remote-client.js must pass V8 JavaScript syntax validation');
    });

    it('should verify index.html includes server switcher trigger and modal markup', () => {
      const html = fs.readFileSync(indexHtmlPath, 'utf8');

      // Trigger button in header
      assert.match(html, /id="btn-server-endpoint-trigger"/, 'index.html must have btn-server-endpoint-trigger');
      
      // Configuration modal
      assert.match(html, /id="modal-server-endpoint"/, 'index.html must have modal-server-endpoint');
      assert.match(html, /id="server-endpoint-input"/, 'Modal must have server-endpoint-input');
      assert.match(html, /id="server-endpoint-status"/, 'Modal must have server-endpoint-status');
      assert.match(html, /id="btn-server-test"/, 'Modal must have btn-server-test');
      assert.match(html, /id="btn-server-save"/, 'Modal must have btn-server-save');
      assert.match(html, /id="btn-server-reset"/, 'Modal must have btn-server-reset');

      // Script include order
      const remoteIdx = html.indexOf('/js/remote-client.js');
      const authIdx = html.indexOf('/js/auth.js');
      const appIdx = html.indexOf('/js/app.js');

      assert.ok(remoteIdx > 0, 'remote-client.js must be included in index.html');
      assert.ok(remoteIdx < authIdx, 'remote-client.js must load before auth.js');
      assert.ok(remoteIdx < appIdx, 'remote-client.js must load before app.js');
    });

    it('should verify src/server.js CSP permits remote LAN and HTTPS connectivity', () => {
      const serverCode = fs.readFileSync(serverJsPath, 'utf8');
      assert.match(serverCode, /connect-src[^;]*https:/, 'CSP connect-src must allow https:');
      assert.match(serverCode, /connect-src[^;]*http:/, 'CSP connect-src must allow http:');
      assert.match(serverCode, /media-src[^;]*https:/, 'CSP media-src must allow https:');
      assert.match(serverCode, /media-src[^;]*http:/, 'CSP media-src must allow http:');
      assert.match(serverCode, /img-src[^;]*https:/, 'CSP img-src must allow https:');
    });
  });

  describe('2. Remote URL Resolution Engine & Interception Semantics', () => {
    it('should correctly simulate URL resolution with and without remote endpoint', () => {
      const code = fs.readFileSync(remoteClientJsPath, 'utf8');

      // Mock browser environment
      const localStorageMap = new Map();
      const sandbox = {
        window: {},
        document: { addEventListener: () => {} },
        performance: { now: () => 100 },
        localStorage: {
          getItem: (key) => localStorageMap.get(key) || null,
          setItem: (key, val) => localStorageMap.set(key, val),
          removeItem: (key) => localStorageMap.delete(key)
        },
        fetch: () => Promise.resolve({ ok: true })
      };
      sandbox.window = sandbox;

      vm.createContext(sandbox);
      vm.runInContext(code, sandbox);

      // Verify globals exported
      assert.strictEqual(typeof sandbox.window.TUNEFLOW_RESOLVE_URL, 'function');
      assert.strictEqual(typeof sandbox.window.TUNEFLOW_GET_SERVER_ENDPOINT, 'function');
      assert.strictEqual(typeof sandbox.window.TUNEFLOW_SET_SERVER_ENDPOINT, 'function');

      // When no endpoint is stored, returns relative path unchanged
      assert.strictEqual(sandbox.window.TUNEFLOW_RESOLVE_URL('/api/search?q=test'), '/api/search?q=test');
      assert.strictEqual(sandbox.window.TUNEFLOW_RESOLVE_URL('https://example.com/audio.mp3'), 'https://example.com/audio.mp3');

      // Set remote endpoint
      sandbox.window.TUNEFLOW_SET_SERVER_ENDPOINT('http://192.168.1.100:3000');
      assert.strictEqual(sandbox.window.TUNEFLOW_GET_SERVER_ENDPOINT(), 'http://192.168.1.100:3000');

      // When endpoint is set, rewrites root-relative API calls
      assert.strictEqual(
        sandbox.window.TUNEFLOW_RESOLVE_URL('/api/preview/xyz123'),
        'http://192.168.1.100:3000/api/preview/xyz123'
      );
      assert.strictEqual(
        sandbox.window.TUNEFLOW_RESOLVE_URL('/api/download/123/file'),
        'http://192.168.1.100:3000/api/download/123/file'
      );

      // Trailing slash normalization
      sandbox.window.TUNEFLOW_SET_SERVER_ENDPOINT('https://music.homelab.lan///');
      assert.strictEqual(sandbox.window.TUNEFLOW_GET_SERVER_ENDPOINT(), 'https://music.homelab.lan');
      assert.strictEqual(
        sandbox.window.TUNEFLOW_RESOLVE_URL('/api/health'),
        'https://music.homelab.lan/api/health'
      );
    });

    it('should verify player.js and app.js integrate TUNEFLOW_RESOLVE_URL', () => {
      const playerCode = fs.readFileSync(playerJsPath, 'utf8');
      const appCode = fs.readFileSync(appJsPath, 'utf8');

      // player.js audio preview streaming
      assert.match(playerCode, /TUNEFLOW_RESOLVE_URL/, 'player.js must reference TUNEFLOW_RESOLVE_URL');
      assert.match(playerCode, /this\.audio\.src\s*=\s*resolve\(`\/api\/preview/, 'player.js must resolve audio stream url');

      // app.js thumbnail and download
      assert.match(appCode, /TUNEFLOW_RESOLVE_URL/, 'app.js must reference TUNEFLOW_RESOLVE_URL');
      assert.match(appCode, /a\.href\s*=\s*resolve\(`\/api\/download/, 'app.js must resolve browser download file link');
    });
  });

  describe('3. CI/CD Multi-Target Packaging Specifications', () => {
    it('should verify .github/workflows/release.yml builds macOS Standalone and Thin Client', () => {
      const releaseYml = fs.readFileSync(releaseYmlPath, 'utf8');

      assert.match(releaseYml, /\.\/scripts\/package_macos\.sh/, 'release.yml must run package_macos.sh');
      assert.match(releaseYml, /\.\/scripts\/package_macos\.sh --thin-client/, 'release.yml must run package_macos.sh --thin-client');
      assert.match(releaseYml, /Run Full Test Suite \(434 Tests\)/, 'release.yml must specify 434 Tests');
    });

    it('should verify scripts/package_linux.sh builds both Desktop and Headless Server tarballs', () => {
      const linuxScript = fs.readFileSync(packageLinuxPath, 'utf8');

      assert.match(linuxScript, /TuneFlow-\$\{VERSION\}-linux-\$\{ARCH_TAG\}\.tar\.gz/, 'Must create Desktop tarball');
      assert.match(linuxScript, /TuneFlow-\$\{VERSION\}-headless-server\.tar\.gz/, 'Must create Headless Server tarball');
      assert.match(linuxScript, /installer\/server\/tuneflow\.service/, 'Must package systemd service file in headless server');
      assert.match(linuxScript, /installer\/server\/install\.sh/, 'Must package install.sh in headless server');
    });

    it('should verify scripts/package_macos.sh supports both standalone and thin-client modes', () => {
      const macosScript = fs.readFileSync(packageMacosPath, 'utf8');

      assert.match(macosScript, /--thin-client/, 'package_macos.sh must support --thin-client flag');
      assert.match(macosScript, /PKG_NAME="TuneFlow-Client"/, 'Thin client package name must be TuneFlow-Client');
      assert.match(macosScript, /PKG_NAME="TuneFlow"/, 'Standalone package name must be TuneFlow');
    });
  });
});
