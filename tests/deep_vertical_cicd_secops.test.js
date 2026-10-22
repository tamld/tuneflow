const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');

const { runSastScan } = require('../scripts/ci-sast-gate');
const { runDastProbe } = require('../scripts/ci-dast-gate');
const { app } = require('../src/server');

describe('F1-CICD-SecOps: Automated SAST, DAST & Verification Gates Suite', () => {
  const rootDir = path.resolve(__dirname, '..');
  let tempScanDir;
  let server;
  let baseUrl;

  before(async () => {
    // Ephemeral server for live DAST probes
    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    // Create temporary workspace for SAST negative fixture assertions
    tempScanDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sast-fixture-'));
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (tempScanDir && fs.existsSync(tempScanDir)) {
      fs.rmSync(tempScanDir, { recursive: true, force: true });
    }
  });

  describe('Dimension 1: SAST Static Security Gate (scripts/ci-sast-gate.js)', () => {
    it('TC-SAST-01: should pass with zero violations on the production codebase', () => {
      const result = runSastScan(rootDir);
      assert.strictEqual(result.ok, true, 'Real repository must pass SAST gate with zero violations');
      assert.strictEqual(result.violations.length, 0, 'No security violations allowed in src/ or public/js/');
      assert.ok(result.scannedFiles >= 40, `Expected at least 40 scanned files, got ${result.scannedFiles}`);
    });

    it('TC-SAST-02: should accurately catch synthetic SAST-01 violations (eval & new Function)', () => {
      const fixtureRoot = path.join(tempScanDir, 'fixture-sast-01');
      const srcDir = path.join(fixtureRoot, 'src');
      fs.mkdirSync(srcDir, { recursive: true });

      fs.writeFileSync(
        path.join(srcDir, 'eval_sink.js'),
        'const userInput = "1+1";\nconst result = eval(userInput);\n'
      );
      fs.writeFileSync(
        path.join(srcDir, 'func_sink.js'),
        'const dynamicCode = "return a + b";\nconst fn = new Function("a", "b", dynamicCode);\n'
      );

      const result = runSastScan(fixtureRoot);
      assert.strictEqual(result.ok, false, 'Fixture with eval/new Function must fail');
      const evalViolations = result.violations.filter((v) => v.rule === 'SAST-01');
      assert.strictEqual(evalViolations.length, 2, 'Must detect both eval() and new Function() sinks');
      assert.ok(evalViolations.some((v) => v.snippet.includes('eval(')));
      assert.ok(evalViolations.some((v) => v.snippet.includes('new Function(')));
    });

    it('TC-SAST-03: should accurately catch synthetic SAST-02 violations (SQL template interpolation in src/db)', () => {
      const fixtureRoot = path.join(tempScanDir, 'fixture-sast-02');
      const dbDir = path.join(fixtureRoot, 'src', 'db');
      fs.mkdirSync(dbDir, { recursive: true });

      fs.writeFileSync(
        path.join(dbDir, 'vulnerable_repo.js'),
        'class VulnRepo {\n  getUser(id) {\n    return this.db.prepare(`SELECT * FROM users WHERE id = ${id}`).get();\n  }\n}\n'
      );

      const result = runSastScan(fixtureRoot);
      assert.strictEqual(result.ok, false, 'Fixture with SQL interpolation must fail');
      const sqlViolations = result.violations.filter((v) => v.rule === 'SAST-02');
      assert.strictEqual(sqlViolations.length, 1, 'Must detect SQL interpolation violation');
      assert.strictEqual(sqlViolations[0].line, 3);
      assert.ok(sqlViolations[0].message.includes('SQL template string interpolation'));
    });

    it('TC-SAST-04: should accurately catch synthetic SAST-03 violations (hardcoded private keys & tokens)', () => {
      const fixtureRoot = path.join(tempScanDir, 'fixture-sast-03');
      const srcDir = path.join(fixtureRoot, 'src');
      fs.mkdirSync(srcDir, { recursive: true });

      fs.writeFileSync(
        path.join(srcDir, 'private_key.js'),
        '// Some header\nconst privKey = "-----BEGIN RSA PRIVATE KEY-----\\nMIIEowIBAAKCAQEA0...";\n'
      );
      fs.writeFileSync(
        path.join(srcDir, 'leaked_token.js'),
        'const ghToken = "ghp_123456789012345678901234567890123456";\nconst stripeSecret = "sk-live-abcdef12345678901234";\n'
      );

      const result = runSastScan(fixtureRoot);
      assert.strictEqual(result.ok, false, 'Fixture with leaked secrets must fail');
      const secretViolations = result.violations.filter((v) => v.rule === 'SAST-03');
      assert.strictEqual(secretViolations.length, 3, 'Must detect private key and both leaked secret tokens');
    });

    it('TC-SAST-05: should accurately catch synthetic SAST-04 violations (exec with interpolation in routes/middleware)', () => {
      const fixtureRoot = path.join(tempScanDir, 'fixture-sast-04');
      const routesDir = path.join(fixtureRoot, 'src', 'routes');
      fs.mkdirSync(routesDir, { recursive: true });

      fs.writeFileSync(
        path.join(routesDir, 'admin_exec.js'),
        'const { exec } = require("child_process");\nfunction runCommand(cmd) {\n  exec(`ffmpeg -i ${cmd}`, (err) => {});\n}\n'
      );

      const result = runSastScan(fixtureRoot);
      assert.strictEqual(result.ok, false, 'Fixture with exec interpolation in routes must fail');
      const execViolations = result.violations.filter((v) => v.rule === 'SAST-04');
      assert.strictEqual(execViolations.length, 1, 'Must detect unsafe child_process.exec in routes');
    });

    it('TC-SAST-06: should not flag legitimate template strings outside db and routes', () => {
      const fixtureRoot = path.join(tempScanDir, 'fixture-legit-template');
      const srcDir = path.join(fixtureRoot, 'src', 'utils');
      fs.mkdirSync(srcDir, { recursive: true });

      fs.writeFileSync(
        path.join(srcDir, 'safe_format.js'),
        'function formatUrl(id) {\n  return `https://example.com/item/${id}`;\n}\nmodule.exports = { formatUrl };\n'
      );

      const result = runSastScan(fixtureRoot);
      assert.strictEqual(result.ok, true, 'Legitimate string formatting must not trigger SAST false positive');
      assert.strictEqual(result.violations.length, 0);
    });
  });

  describe('Dimension 2: DAST Dynamic Security Gate (scripts/ci-dast-gate.js)', () => {
    it('TC-DAST-01: should pass all 10 live security probes against ephemeral server', async () => {
      const result = await runDastProbe(baseUrl);
      assert.strictEqual(result.ok, true, 'All DAST probes must pass cleanly');
      assert.strictEqual(result.passed, 10, 'Must verify all 10 security probes');
      assert.strictEqual(result.failed, 0, 'Zero probe failures allowed');
    });

    it('TC-DAST-02: should verify DAST-01 SSRF & Cloud Metadata Defense', async () => {
      const resMeta = await fetch(`${baseUrl}/api/thumbnail?url=http://169.254.169.254/latest/meta-data`);
      assert.ok([400, 403].includes(resMeta.status), `SSRF metadata probe must return 400/403, got ${resMeta.status}`);

      const resLoopback = await fetch(`${baseUrl}/api/thumbnail?url=http://[::1]:3000/api/health`);
      assert.ok([400, 403].includes(resLoopback.status), `SSRF IPv6 loopback probe must return 400/403, got ${resLoopback.status}`);
    });

    it('TC-DAST-03: should verify DAST-02 Userinfo & Non-Standard Port Defense', async () => {
      const resUserinfo = await fetch(`${baseUrl}/api/info?url=${encodeURIComponent('https://admin:secret@www.youtube.com/watch?v=dQw4w9WgXcQ')}`);
      assert.strictEqual(resUserinfo.status, 400, 'Userinfo URL must be rejected with 400');

      const resPort = await fetch(`${baseUrl}/api/info?url=${encodeURIComponent('https://www.youtube.com:8080/watch?v=dQw4w9WgXcQ')}`);
      assert.strictEqual(resPort.status, 400, 'Non-standard port must be rejected with 400');
    });

    it('TC-DAST-04: should verify DAST-03 Path Traversal Defense', async () => {
      const resStream = await fetch(`${baseUrl}/api/library/local/stream/..%2F..%2Fpackage.json`);
      assert.ok([400, 403, 404].includes(resStream.status), `Local stream traversal must be blocked (got ${resStream.status})`);
      assert.notStrictEqual(resStream.status, 200, 'Path traversal must never return HTTP 200');

      const resDownload = await fetch(`${baseUrl}/api/download/..%2Fpackage.json/file`);
      assert.ok([400, 403, 404].includes(resDownload.status), `Download traversal must be blocked (got ${resDownload.status})`);
      assert.notStrictEqual(resDownload.status, 200, 'Path traversal must never return HTTP 200');
    });

    it('TC-DAST-05: should verify DAST-04 RBAC Privilege Escalation Defense', async () => {
      const unauthHeaders = {
        'x-forwarded-for': '203.0.113.195',
        'x-guest-id': 'unauth-probe'
      };

      const resStatus = await fetch(`${baseUrl}/api/system/status`, { headers: unauthHeaders });
      assert.ok([401, 403].includes(resStatus.status), `Unauthenticated /api/system/status must return 401/403 (got ${resStatus.status})`);

      const resUpdate = await fetch(`${baseUrl}/api/system/update-ytdlp`, { method: 'POST', headers: unauthHeaders });
      assert.ok([401, 403].includes(resUpdate.status), `Unauthenticated /api/system/update-ytdlp must return 401/403 (got ${resUpdate.status})`);
    });

    it('TC-DAST-06: should verify DAST-05 Health & Doctor Readiness Probe', async () => {
      const resHealth = await fetch(`${baseUrl}/api/health`);
      assert.strictEqual(resHealth.status, 200, 'Health check must return HTTP 200');
      const healthData = await resHealth.json();
      assert.strictEqual(healthData.ok, true, 'Health check response must include ok: true');

      const resDoctor = await fetch(`${baseUrl}/api/system/doctor`);
      assert.strictEqual(resDoctor.status, 200, 'System doctor must return HTTP 200');
      const doctorData = await resDoctor.json();
      assert.strictEqual(doctorData.ok, true, 'Doctor response must include ok: true');
    });

    it('TC-DAST-07: should deny non-admin authenticated users on privileged endpoints', async () => {
      const headers = {
        'x-forwarded-for': '198.51.100.1',
        'x-guest-id': 'regular-user'
      };
      const res = await fetch(`${baseUrl}/api/system/update-ytdlp`, { method: 'POST', headers });
      assert.ok([401, 403].includes(res.status), 'Non-admin callers must be denied privileged execution');
    });

    it('TC-DAST-08: should enumerate and verify all 10 security probes in probe report', async () => {
      const result = await runDastProbe(baseUrl);
      assert.strictEqual(result.probes.length, 10, 'Must contain exactly 10 distinct probes');
      const expectedIds = ['DAST-01a', 'DAST-01b', 'DAST-02a', 'DAST-02b', 'DAST-03a', 'DAST-03b', 'DAST-04a', 'DAST-04b', 'DAST-05a', 'DAST-05b'];
      for (const id of expectedIds) {
        assert.ok(result.probes.some((p) => p.id === id), `Report must contain probe ${id}`);
      }
    });
  });

  describe('Dimension 3: CI/CD Workflow & Verifier Classes Alignment', () => {
    const ciWorkflowPath = path.join(rootDir, '.github', 'workflows', 'ci.yml');
    const verifierClassesPath = path.join(rootDir, '.g8s', 'verifier-classes.yml');

    it('TC-CI-01: should integrate SAST and DAST gates in .github/workflows/ci.yml while preserving existing steps', () => {
      assert.ok(fs.existsSync(ciWorkflowPath), 'ci.yml must exist');
      const ciContent = fs.readFileSync(ciWorkflowPath, 'utf8');

      assert.ok(ciContent.includes('node scripts/ci-sast-gate.js'), 'ci.yml must invoke ci-sast-gate.js');
      assert.ok(ciContent.includes('node scripts/ci-dast-gate.js'), 'ci.yml must invoke ci-dast-gate.js');
      assert.ok(ciContent.includes('curl --fail http://localhost:3000/api/system/doctor'), 'ci.yml smoke test must verify /api/system/doctor');
      assert.ok(ciContent.includes('pnpm run lint'), 'Existing lint step must be preserved');
      assert.ok(ciContent.includes('pnpm audit --audit-level=high'), 'Existing security audit must be preserved');
      assert.ok(ciContent.includes('pnpm test'), 'Existing test step must be preserved');
    });

    it('TC-CI-02: should register SAST and DAST gates under gates class in .g8s/verifier-classes.yml', () => {
      assert.ok(fs.existsSync(verifierClassesPath), 'verifier-classes.yml must exist');
      const verifierContent = fs.readFileSync(verifierClassesPath, 'utf8');

      assert.ok(verifierContent.includes('node scripts/ci-sast-gate.js'), 'verifier-classes.yml must include node scripts/ci-sast-gate.js');
      assert.ok(verifierContent.includes('node scripts/ci-dast-gate.js'), 'verifier-classes.yml must include node scripts/ci-dast-gate.js');
    });

    it('TC-CI-03: should enforce fail-closed CI execution (no continue-on-error for security gates)', () => {
      const ciContent = fs.readFileSync(ciWorkflowPath, 'utf8');
      assert.ok(!ciContent.includes('continue-on-error: true'), 'Security gates must never ignore failures in CI');
    });
  });
});
