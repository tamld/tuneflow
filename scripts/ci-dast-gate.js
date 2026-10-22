#!/usr/bin/env node
/**
 * TuneFlow Automated DAST Security Gate
 * Ephemeral-port live dynamic application security testing suite.
 * Probes running instance for SSRF, parameter injection, traversal, RBAC, and doctor readiness.
 */

const http = require('http');

/**
 * Execute DAST security probe suite against target baseUrl.
 * @param {string} baseUrl - e.g. http://127.0.0.1:3000
 * @returns {Promise<{ ok: boolean, passed: number, failed: number, probes: Array<{ id: string, name: string, path: string, status: number, passed: boolean, message: string }> }>}
 */
async function runDastProbe(baseUrl) {
  const probes = [];

  // DAST-01: SSRF & Cloud Metadata Defense
  // GET /api/thumbnail?url=http://169.254.169.254/latest/meta-data -> 400 or 403
  // GET /api/thumbnail?url=http://[::1]:3000/api/health -> 400 or 403
  {
    const path1 = '/api/thumbnail?url=http://169.254.169.254/latest/meta-data';
    const res1 = await fetch(`${baseUrl}${path1}`);
    const passed1 = res1.status === 400 || res1.status === 403;
    probes.push({
      id: 'DAST-01a',
      name: 'SSRF Cloud Metadata Probe (169.254.169.254)',
      path: path1,
      status: res1.status,
      passed: passed1,
      message: passed1 ? 'Blocked SSRF to AWS/cloud metadata IP' : `Expected 400/403, got ${res1.status}`
    });

    const path2 = '/api/thumbnail?url=http://[::1]:3000/api/health';
    const res2 = await fetch(`${baseUrl}${path2}`);
    const passed2 = res2.status === 400 || res2.status === 403;
    probes.push({
      id: 'DAST-01b',
      name: 'SSRF IPv6 Loopback Probe ([::1])',
      path: path2,
      status: res2.status,
      passed: passed2,
      message: passed2 ? 'Blocked SSRF to IPv6 loopback address' : `Expected 400/403, got ${res2.status}`
    });
  }

  // DAST-02: Userinfo & Non-Standard Port Defense
  // GET /api/info?url=https://admin:secret@www.youtube.com/watch?v=dQw4w9WgXcQ -> 400
  // GET /api/info?url=https://www.youtube.com:8080/watch?v=dQw4w9WgXcQ -> 400
  {
    const path1 = '/api/info?url=' + encodeURIComponent('https://admin:secret@www.youtube.com/watch?v=dQw4w9WgXcQ');
    const res1 = await fetch(`${baseUrl}${path1}`);
    const passed1 = res1.status === 400;
    probes.push({
      id: 'DAST-02a',
      name: 'Userinfo Injection Defense (admin:secret@)',
      path: path1,
      status: res1.status,
      passed: passed1,
      message: passed1 ? 'Rejected URL with embedded userinfo credentials' : `Expected 400, got ${res1.status}`
    });

    const path2 = '/api/info?url=' + encodeURIComponent('https://www.youtube.com:8080/watch?v=dQw4w9WgXcQ');
    const res2 = await fetch(`${baseUrl}${path2}`);
    const passed2 = res2.status === 400;
    probes.push({
      id: 'DAST-02b',
      name: 'Non-Standard Port Defense (:8080)',
      path: path2,
      status: res2.status,
      passed: passed2,
      message: passed2 ? 'Rejected URL with non-standard port' : `Expected 400, got ${res2.status}`
    });
  }

  // DAST-03: Path Traversal Defense
  // GET /api/library/local/stream/..%2F..%2Fpackage.json -> 400, 403, or 404 (never 200)
  // GET /api/download/..%2Fpackage.json/file -> 400, 403, or 404 (never 200)
  {
    const path1 = '/api/library/local/stream/..%2F..%2Fpackage.json';
    const res1 = await fetch(`${baseUrl}${path1}`);
    const passed1 = (res1.status === 400 || res1.status === 403 || res1.status === 404) && res1.status !== 200;
    probes.push({
      id: 'DAST-03a',
      name: 'Local Library Path Traversal Defense',
      path: path1,
      status: res1.status,
      passed: passed1,
      message: passed1 ? 'Prevented directory traversal out of downloads' : `Unsafe status returned: ${res1.status}`
    });

    const path2 = '/api/download/..%2Fpackage.json/file';
    const res2 = await fetch(`${baseUrl}${path2}`);
    const passed2 = (res2.status === 400 || res2.status === 403 || res2.status === 404) && res2.status !== 200;
    probes.push({
      id: 'DAST-03b',
      name: 'Download File Path Traversal Defense',
      path: path2,
      status: res2.status,
      passed: passed2,
      message: passed2 ? 'Prevented path traversal in download pipeline' : `Unsafe status returned: ${res2.status}`
    });
  }

  // DAST-04: RBAC Privilege Escalation Defense
  // Unauthenticated GET /api/system/status -> 401 or 403
  // Unauthenticated POST /api/system/update-ytdlp -> 401 or 403
  {
    const unauthHeaders = {
      'x-forwarded-for': '203.0.113.195',
      'x-guest-id': 'unauth-probe'
    };

    const path1 = '/api/system/status';
    const res1 = await fetch(`${baseUrl}${path1}`, { headers: unauthHeaders });
    const passed1 = res1.status === 401 || res1.status === 403;
    probes.push({
      id: 'DAST-04a',
      name: 'RBAC Admin Diagnostics Shield',
      path: path1,
      status: res1.status,
      passed: passed1,
      message: passed1 ? 'Denied unauthenticated access to admin system status' : `Expected 401/403, got ${res1.status}`
    });

    const path2 = '/api/system/update-ytdlp';
    const res2 = await fetch(`${baseUrl}${path2}`, { method: 'POST', headers: unauthHeaders });
    const passed2 = res2.status === 401 || res2.status === 403;
    probes.push({
      id: 'DAST-04b',
      name: 'RBAC Binary Hot-Update Shield',
      path: path2,
      status: res2.status,
      passed: passed2,
      message: passed2 ? 'Denied unauthenticated hot-update trigger' : `Expected 401/403, got ${res2.status}`
    });
  }

  // DAST-05: Health & Doctor Readiness Probe
  // GET /api/health and GET /api/system/doctor -> must return HTTP 200 with ok: true
  {
    const path1 = '/api/health';
    const res1 = await fetch(`${baseUrl}${path1}`);
    let data1 = {};
    try { data1 = await res1.json(); } catch (_e) {}
    const passed1 = res1.status === 200 && data1.ok === true;
    probes.push({
      id: 'DAST-05a',
      name: 'Container Healthcheck Probe',
      path: path1,
      status: res1.status,
      passed: passed1,
      message: passed1 ? 'Returned HTTP 200 with ok: true' : `Failed health probe: status=${res1.status}, ok=${data1.ok}`
    });

    const path2 = '/api/system/doctor';
    const res2 = await fetch(`${baseUrl}${path2}`);
    let data2 = {};
    try { data2 = await res2.json(); } catch (_e) {}
    const passed2 = res2.status === 200 && data2.ok === true;
    probes.push({
      id: 'DAST-05b',
      name: 'System Doctor Readiness Probe',
      path: path2,
      status: res2.status,
      passed: passed2,
      message: passed2 ? 'System doctor returned HTTP 200 with ok: true' : `Failed doctor probe: status=${res2.status}, ok=${data2.ok}`
    });
  }

  const passedCount = probes.filter(p => p.passed).length;
  const failedCount = probes.length - passedCount;

  return {
    ok: failedCount === 0,
    passed: passedCount,
    failed: failedCount,
    probes
  };
}

if (require.main === module) {
  const { app } = require('../src/server');

  console.log('🌐 Booting ephemeral server for DAST Dynamic Security Gate...');
  const server = http.createServer(app);

  server.listen(0, '127.0.0.1', async () => {
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;
    console.log(`🚀 Live ephemeral instance active on ${baseUrl}`);

    try {
      const result = await runDastProbe(baseUrl);
      console.log(JSON.stringify(result, null, 2));

      server.close(() => {
        if (!result.ok) {
          console.error(`❌ DAST Gate FAILED: ${result.failed} probe(s) failed.`);
          process.exit(1);
        }
        console.log(`✅ DAST Gate PASSED: ${result.passed}/${result.probes.length} probes verified.`);
        process.exit(0);
      });
    } catch (err) {
      console.error('💥 DAST Gate execution error:', err);
      server.close(() => process.exit(1));
    }
  });

  // Safety fallback unref timer to guarantee zero-hang exit
  const forceExit = setTimeout(() => {
    console.warn('⚠️ Force exiting DAST process after safety timeout');
    process.exit(1);
  }, 10000);
  forceExit.unref();
}

module.exports = { runDastProbe };
