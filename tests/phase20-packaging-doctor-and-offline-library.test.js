/**
 * Phase 20 Verification Suite: Self-Contained Packaging, System Doctor,
 * Offline Downloaded Library UX, and Documentation / Release Sync (SPEC-0017)
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const { execFileSync } = require('child_process');
const { app } = require('../src/server');
const { DOWNLOADS_DIR } = require('../src/config');

const ROOT = path.resolve(__dirname, '..');

describe('SPEC-0017: Phase 20 Packaging, System Doctor & Offline Library UX', () => {
  let server;
  let baseUrl;
  let sampleMp3Path;

  before(async () => {
    if (!fs.existsSync(DOWNLOADS_DIR)) {
      fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
    }
    sampleMp3Path = path.join(DOWNLOADS_DIR, 'Dan_Ca_Que_Huong_Test_Phase20.mp3');
    const dummyMp3 = Buffer.from('4944330300000000000a544954320000000200000041fffb906400000000', 'hex');
    fs.writeFileSync(sampleMp3Path, dummyMp3);

    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        const { port } = server.address();
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (sampleMp3Path && fs.existsSync(sampleMp3Path)) {
      try {
        fs.unlinkSync(sampleMp3Path);
      } catch {
        // ignore cleanup error
      }
    }
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('REQ-PKG-02: GET /api/system/doctor returns structured health and sidecar diagnostics without admin auth', async () => {
    const res = await fetch(`${baseUrl}/api/system/doctor`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(body.success, true);
    assert.ok(body.checks);
    assert.equal(body.checks.node.ok, true);
    assert.equal(body.checks.downloadsDir.ok, true);
    assert.equal(body.checks.database.ok, true);
    assert.equal(typeof body.checks.ytdlp.ok, 'boolean');
    assert.equal(typeof body.checks.ffmpeg.ok, 'boolean');
  });

  it('REQ-PKG-02: CLI `node bin/tuneflow.js --doctor` exits 0 and outputs valid JSON diagnostic report', () => {
    const cliPath = path.join(ROOT, 'bin', 'tuneflow.js');
    const output = execFileSync(process.execPath, [cliPath, '--doctor'], {
      encoding: 'utf8',
      timeout: 15000
    });
    const parsed = JSON.parse(output.trim());
    assert.equal(parsed.ok, true);
    assert.ok(parsed.checks);
    assert.equal(parsed.checks.node.version, process.version);
    assert.equal(parsed.checks.downloadsDir.writable, true);
  });

  it('REQ-PKG-03: GET /api/library/local lists downloaded MP3 files and streams audio safely', async () => {
    const listRes = await fetch(`${baseUrl}/api/library/local`);
    assert.equal(listRes.status, 200);
    const listBody = await listRes.json();
    assert.equal(listBody.ok, true);
    assert.ok(Array.isArray(listBody.results));

    const found = listBody.results.find(item => item.filename === 'Dan_Ca_Que_Huong_Test_Phase20.mp3');
    assert.ok(found, 'Expected Dan_Ca_Que_Huong_Test_Phase20.mp3 in /api/library/local results');
    assert.equal(found.isLocalDownloaded, true);
    assert.ok(found.localStreamUrl.includes('/api/library/local/stream/Dan_Ca_Que_Huong_Test_Phase20.mp3'));

    // Stream the local file
    const streamRes = await fetch(`${baseUrl}${found.localStreamUrl}`);
    assert.equal(streamRes.status, 200);
    assert.match(streamRes.headers.get('content-type') || '', /audio/);

    // Path traversal must be rejected
    const traversalRes = await fetch(`${baseUrl}/api/library/local/stream/..%2Fpackage.json`);
    assert.ok([400, 404].includes(traversalRes.status));
  });

  it('REQ-PKG-01: scripts/bundle-sidecars.js excludes cloudflared.exe and writes SHA256SUMS.json', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tuneflow-sidecar-test-'));
    try {
      fs.writeFileSync(path.join(tmpDir, 'cloudflared.exe'), 'unused-tunnel-binary');
      fs.writeFileSync(path.join(tmpDir, 'tuneflow.js'), '// runner');

      const bundlerPath = path.join(ROOT, 'scripts', 'bundle-sidecars.js');
      assert.equal(fs.existsSync(bundlerPath), true);

      execFileSync(process.execPath, [bundlerPath, '--target', tmpDir], {
        encoding: 'utf8',
        timeout: 15000
      });

      assert.equal(fs.existsSync(path.join(tmpDir, 'cloudflared.exe')), false);
      const manifestPath = path.join(tmpDir, 'SHA256SUMS.json');
      assert.equal(fs.existsSync(manifestPath), true);
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      assert.ok(manifest.binaries);
      assert.equal(manifest.binaries['cloudflared.exe'], undefined);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('REQ-PKG-03 & REQ-PKG-04: Frontend DOM & JS include #btn-persona-downloaded, #btn-toggle-search-filters, localStreamUrl & tuneflow_last_track', () => {
    const indexHtml = fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8');
    const appJs = fs.readFileSync(path.join(ROOT, 'public', 'js', 'app.js'), 'utf8');
    const playerJs = fs.readFileSync(path.join(ROOT, 'public', 'js', 'player.js'), 'utf8');

    assert.ok(indexHtml.includes('id="btn-persona-downloaded"'));
    assert.ok(indexHtml.includes('id="downloaded-count"'));
    assert.ok(indexHtml.includes('id="btn-toggle-search-filters"'));

    assert.ok(appJs.includes('/api/library/local'));
    assert.ok(appJs.includes('showDownloadedView'));
    assert.ok(appJs.includes('tuneflow-desktop'));

    assert.ok(playerJs.includes('localStreamUrl'));
    assert.ok(playerJs.includes('tuneflow_last_track'));
  });

  it('REQ-PKG-05 & REQ-PKG-06: Installer setup.iss, TuneFlowLauncher.cs, package.json & release.yml are synchronized', () => {
    const setupIss = fs.readFileSync(path.join(ROOT, 'installer', 'windows', 'setup.iss'), 'utf8');
    const launcherCs = fs.readFileSync(path.join(ROOT, 'installer', 'windows', 'TuneFlowLauncher.cs'), 'utf8');
    const pkgJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    const releaseYml = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'release.yml'), 'utf8');

    assert.ok(setupIss.includes('AppMutex=com.tamld.tuneflow.singleinstance'));
    assert.ok(setupIss.includes('CloseApplications=yes'));
    assert.ok(launcherCs.includes('/api/system/doctor'));
    assert.ok(pkgJson.scripts.doctor);
    assert.ok(pkgJson.scripts['desktop:sync']);
    assert.equal(releaseYml.includes('packages/core'), false);
  });
});
