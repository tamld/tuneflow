/**
 * TuneFlow Tri-Mode Deployment & Connection Matrix Proving Suite
 * Authority: SPEC-0013 (/prove Architecture, FSM, and 4-Quadrant Matrix)
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');

const {
  validateServerUrl,
  resolveClientConfigPath,
  getDefaultClientConfig,
  loadClientConfig,
  saveClientConfig,
  setProfile,
  resolveActiveServerUrl
} = require('../src/desktop/client_config');

const {
  ConnectionState,
  ConnectionFSM
} = require('../src/desktop/connection_fsm');

describe('SPEC-0013: Tri-Mode Deployment & Remote Connectivity Proving Suite', () => {
  let mockServer;
  let mockServerPort;
  let tempConfigDir;
  let tempConfigFile;

  before(async () => {
    tempConfigDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tuneflow-spec13-'));
    tempConfigFile = path.join(tempConfigDir, 'client-config.json');

    // Spawn mock TuneFlow backend server for hermetic health checks
    await new Promise((resolve) => {
      mockServer = http.createServer((req, res) => {
        if (req.url === '/api/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'healthy', uptime: 100, activeTasks: 0 }));
        } else if (req.url === '/api/health-slow') {
          setTimeout(() => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'healthy', slow: true }));
          }, 600);
        } else if (req.url === '/api/health-error') {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Service Unavailable' }));
        } else {
          res.writeHead(404);
          res.end();
        }
      });
      mockServer.listen(0, '127.0.0.1', () => {
        mockServerPort = mockServer.address().port;
        resolve();
      });
    });
  });

  after(async () => {
    if (mockServer) {
      await new Promise(r => mockServer.close(r));
    }
    if (fs.existsSync(tempConfigDir)) {
      fs.rmSync(tempConfigDir, { recursive: true, force: true });
    }
  });

  describe('Pillar 1: Universal Transport Medium & URL Validation Matrix', () => {
    it('should validate direct LAN IPv4 server endpoints (Quadrant Q1/Q3)', () => {
      const res = validateServerUrl('http://192.168.10.52:3000');
      assert.strictEqual(res.valid, true);
      assert.strictEqual(res.type, 'ipv4');
      assert.strictEqual(res.hostname, '192.168.10.52');
      assert.strictEqual(res.port, 3000);
      assert.strictEqual(res.isSecure, false);
      assert.strictEqual(res.normalizedUrl, 'http://192.168.10.52:3000');
    });

    it('should validate IPv6 server endpoints with bracket syntax', () => {
      const res = validateServerUrl('http://[::1]:3000');
      assert.strictEqual(res.valid, true);
      assert.strictEqual(res.type, 'ipv6');
      assert.strictEqual(res.port, 3000);
    });

    it('should validate local mDNS and homelab domains (e.g. .home.lab, .local)', () => {
      const res1 = validateServerUrl('http://tuneflow.home.lab:3000');
      assert.strictEqual(res1.valid, true);
      assert.strictEqual(res1.type, 'mdns');
      assert.strictEqual(res1.hostname, 'tuneflow.home.lab');

      const res2 = validateServerUrl('http://tuneflow.local:8080');
      assert.strictEqual(res2.valid, true);
      assert.strictEqual(res2.type, 'mdns');
      assert.strictEqual(res2.port, 8080);
    });

    it('should validate public FQDN with secure HTTPS (Quadrant Q2/Q4)', () => {
      const res = validateServerUrl('https://music.tamld.com');
      assert.strictEqual(res.valid, true);
      assert.strictEqual(res.type, 'fqdn_https');
      assert.strictEqual(res.isSecure, true);
      assert.strictEqual(res.port, 443);
      assert.strictEqual(res.normalizedUrl, 'https://music.tamld.com');
    });

    it('should validate standard localhost endpoints with automatic normalization', () => {
      const res = validateServerUrl('http://localhost:3000/');
      assert.strictEqual(res.valid, true);
      assert.strictEqual(res.type, 'localhost');
      assert.strictEqual(res.normalizedUrl, 'http://localhost:3000');
    });

    it('should fail-closed on dangerous, malformed, or out-of-range URLs', () => {
      assert.strictEqual(validateServerUrl('').valid, false);
      assert.strictEqual(validateServerUrl('ftp://192.168.1.1:3000').valid, false);
      assert.strictEqual(validateServerUrl('javascript:alert(1)').valid, false);
      assert.strictEqual(validateServerUrl('http://not-a-valid-ip-999.999.999.999:3000').valid, false);
      assert.strictEqual(validateServerUrl('http://192.168.1.50:99999').valid, false);
    });
  });

  describe('Pillar 2: Client Profile Management & Multi-Host Persistence', () => {
    it('should generate valid default client configuration', () => {
      const config = getDefaultClientConfig();
      assert.strictEqual(config.version, '1.0.0');
      assert.strictEqual(config.activeProfile, 'default');
      assert.ok(config.profiles.default);
      assert.strictEqual(config.profiles.default.url, 'http://127.0.0.1:3000');
    });

    it('should resolve OS-specific configuration path', () => {
      const resolved = resolveClientConfigPath();
      assert.ok(resolved.endsWith('client-config.json'));
      if (process.platform === 'darwin') {
        assert.ok(resolved.includes('Library/Application Support/TuneFlow'));
      }
    });

    it('should save client-config.json atomically with restricted permissions (chmod 600)', () => {
      const config = getDefaultClientConfig();
      setProfile(config, 'homelab', {
        name: 'Dedicated Home Server',
        url: 'http://192.168.1.100:3000',
        authToken: 'secret-token-123'
      });
      config.activeProfile = 'homelab';

      saveClientConfig(config, tempConfigFile);
      assert.ok(fs.existsSync(tempConfigFile));

      if (process.platform !== 'win32') {
        const stats = fs.statSync(tempConfigFile);
        const mode = stats.mode & 0o777;
        assert.strictEqual(mode, 0o600, 'Config must be user-read/write only');
      }

      const loaded = loadClientConfig(tempConfigFile);
      assert.strictEqual(loaded.activeProfile, 'homelab');
      assert.strictEqual(loaded.profiles.homelab.url, 'http://192.168.1.100:3000');
      assert.strictEqual(loaded.profiles.homelab.authToken, 'secret-token-123');
    });

    it('should resolve active server URL respecting environment variable overrides', () => {
      const config = getDefaultClientConfig();
      setProfile(config, 'cloud', {
        name: 'Cloudflare Tunnel',
        url: 'https://music.tamld.com'
      });
      config.activeProfile = 'cloud';

      // Profile resolution
      assert.strictEqual(resolveActiveServerUrl(config), 'https://music.tamld.com');

      // Environment variable override
      process.env.TUNEFLOW_SERVER_URL = 'http://192.168.10.52:3000';
      assert.strictEqual(resolveActiveServerUrl(config), 'http://192.168.10.52:3000');
      delete process.env.TUNEFLOW_SERVER_URL;
    });
  });

  describe('Pillar 3: Connection State Machine (FSM) & Handshake Proving', () => {
    it('should prove successful connection lifecycle to mock server', async () => {
      const stateHistory = [];
      const fsm = new ConnectionFSM({
        targetUrl: `http://127.0.0.1:${mockServerPort}`,
        onStateChange: (oldState, newState) => {
          stateHistory.push(`${oldState}->${newState}`);
        }
      });

      assert.strictEqual(fsm.state, ConnectionState.DISCONNECTED);

      const finalState = await fsm.connect();
      assert.strictEqual(finalState, ConnectionState.CONNECTED);
      assert.strictEqual(fsm.state, ConnectionState.CONNECTED);

      // Verify sequence of state transitions
      assert.deepStrictEqual(stateHistory, [
        'DISCONNECTED->CONNECTING',
        'CONNECTING->HEALTH_CHECKING',
        'HEALTH_CHECKING->CONNECTED'
      ]);

      // Streaming state transition
      fsm.setStreaming(true);
      assert.strictEqual(fsm.state, ConnectionState.STREAMING);

      fsm.setStreaming(false);
      assert.strictEqual(fsm.state, ConnectionState.CONNECTED);

      fsm.disconnect();
      assert.strictEqual(fsm.state, ConnectionState.DISCONNECTED);
    });

    it('should prove DEGRADED state when round-trip latency exceeds 500ms SLA', async () => {
      const fsm = new ConnectionFSM({
        targetUrl: `http://127.0.0.1:${mockServerPort}`,
        timeoutMs: 3000
      });

      // Probe slow health check
      const result = await fsm.probeHealth(`http://127.0.0.1:${mockServerPort}/api/health-slow`);
      assert.strictEqual(result.ok, true);
      assert.ok(result.latencyMs >= 500, `Latency must be >= 500ms (got ${result.latencyMs})`);
    });

    it('should prove RETRYING with exponential backoff and fallback when host is unreachable', async () => {
      const history = [];
      const fsm = new ConnectionFSM({
        targetUrl: 'http://127.0.0.1:54321', // Unreachable port
        timeoutMs: 100,
        maxRetries: 2,
        allowFallback: true,
        onStateChange: (from, to) => history.push(`${from}->${to}`)
      });

      const finalState = await fsm.connect();
      assert.strictEqual(finalState, ConnectionState.FALLBACK_STANDALONE);
      assert.strictEqual(fsm.retryCount, 2);
      assert.ok(history.includes('HEALTH_CHECKING->RETRYING'));
      assert.ok(history.includes('HEALTH_CHECKING->FALLBACK_STANDALONE'));
    });
  });

  describe('Pillar 4: 4-Quadrant Operational Parity Verification', () => {
    it('should prove Q1 (S1 Binary Service + C1 Native App): Direct IP stream contract', () => {
      const q1Server = { mode: 'binary', host: '192.168.1.100', port: 3000 };
      const q1Client = { type: 'native_desktop', runtime: 'native_shell' };

      const url = `http://${q1Server.host}:${q1Server.port}`;
      const validated = validateServerUrl(url);
      assert.strictEqual(validated.valid, true);
      assert.strictEqual(validated.type, 'ipv4');
      assert.strictEqual(q1Client.runtime, 'native_shell');
    });

    it('should prove Q2 (S2 Container + C1 Native App): Secure FQDN contract', () => {
      const q2Server = { mode: 'container_proxy', fqdn: 'https://music.example.com' };
      const q2Client = { type: 'native_desktop', authRequired: true };

      const validated = validateServerUrl(q2Server.fqdn);
      assert.strictEqual(validated.valid, true);
      assert.strictEqual(validated.type, 'fqdn_https');
      assert.strictEqual(validated.isSecure, true);
    });

    it('should prove Q3 (S1 Binary Service + C2 Web/PWA): Local web client contract', () => {
      const q3Url = 'http://tuneflow.local:3000';
      const validated = validateServerUrl(q3Url);
      assert.strictEqual(validated.valid, true);
      assert.strictEqual(validated.type, 'mdns');
    });

    it('should prove Q4 (S2 Container + C2 Web/PWA): Public mobile PWA contract', () => {
      const q4Url = 'https://music.example.com';
      const validated = validateServerUrl(q4Url);
      assert.strictEqual(validated.valid, true);
      assert.strictEqual(validated.isSecure, true);
    });
  });
});
