/**
 * TuneFlow Client Connection Finite State Machine (FSM)
 * Authority: SPEC-0013 (Tri-Mode Deployment & Connection State Proving)
 */

const http = require('http');
const https = require('https');

const ConnectionState = Object.freeze({
  DISCONNECTED: 'DISCONNECTED',
  CONNECTING: 'CONNECTING',
  HEALTH_CHECKING: 'HEALTH_CHECKING',
  CONNECTED: 'CONNECTED',
  DEGRADED: 'DEGRADED',
  STREAMING: 'STREAMING',
  RETRYING: 'RETRYING',
  FALLBACK_STANDALONE: 'FALLBACK_STANDALONE'
});

class ConnectionFSM {
  constructor(options = {}) {
    this.state = ConnectionState.DISCONNECTED;
    this.targetUrl = options.targetUrl || 'http://127.0.0.1:3000';
    this.timeoutMs = options.timeoutMs || 5000;
    this.maxRetries = options.maxRetries || 3;
    this.retryCount = 0;
    this.lastLatencyMs = 0;
    this.lastError = null;
    this.onStateChange = options.onStateChange || (() => {});
    this.allowFallback = options.allowFallback || false;
  }

  transition(newState, payload = {}) {
    const oldState = this.state;
    this.state = newState;
    this.onStateChange(oldState, newState, payload);
    return this.state;
  }

  /**
   * Probe /api/health on target server
   * @param {string} [overrideUrl]
   * @returns {Promise<{ ok: boolean, latencyMs: number, data?: object, error?: string }>}
   */
  async probeHealth(overrideUrl) {
    let urlStr = overrideUrl || this.targetUrl;
    if (!urlStr.includes('/api/health')) {
      urlStr = urlStr.replace(/\/$/, '') + '/api/health';
    }
    const parsed = new URL(urlStr);
    const client = parsed.protocol === 'https:' ? https : http;

    return new Promise((resolve) => {
      const start = Date.now();
      const req = client.get(urlStr, {
        timeout: this.timeoutMs,
        headers: { 'Accept': 'application/json' }
      }, (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          const latencyMs = Date.now() - start;
          if (res.statusCode === 200) {
            try {
              const data = JSON.parse(raw);
              resolve({ ok: true, latencyMs, data });
            } catch (_e) {
              resolve({ ok: true, latencyMs, data: { status: 'healthy' } });
            }
          } else {
            resolve({ ok: false, latencyMs, error: `HTTP ${res.statusCode}` });
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ ok: false, latencyMs: Date.now() - start, error: 'Connection timeout' });
      });

      req.on('error', (err) => {
        resolve({ ok: false, latencyMs: Date.now() - start, error: err.message });
      });
    });
  }

  /**
   * Execute connection handshake cycle
   * @returns {Promise<string>} Final state
   */
  async connect() {
    this.transition(ConnectionState.CONNECTING, { targetUrl: this.targetUrl });
    this.transition(ConnectionState.HEALTH_CHECKING, { targetUrl: this.targetUrl });

    const result = await this.probeHealth();
    this.lastLatencyMs = result.latencyMs;

    if (result.ok) {
      this.retryCount = 0;
      this.lastError = null;
      // High latency check (> 500ms constitutes degraded experience)
      const nextState = result.latencyMs > 500 ? ConnectionState.DEGRADED : ConnectionState.CONNECTED;
      return this.transition(nextState, { latencyMs: result.latencyMs, serverData: result.data });
    }

    this.lastError = result.error;
    if (this.retryCount < this.maxRetries) {
      this.retryCount += 1;
      this.transition(ConnectionState.RETRYING, {
        attempt: this.retryCount,
        maxRetries: this.maxRetries,
        error: result.error
      });
      // Exponential backoff
      const backoffMs = Math.min(1000 * Math.pow(2, this.retryCount - 1), 5000);
      await new Promise(r => setTimeout(r, backoffMs));
      return this.connect();
    }

    if (this.allowFallback) {
      return this.transition(ConnectionState.FALLBACK_STANDALONE, {
        originalUrl: this.targetUrl,
        error: result.error
      });
    }

    return this.transition(ConnectionState.DISCONNECTED, { error: result.error });
  }

  setStreaming(isStreaming) {
    if (isStreaming && (this.state === ConnectionState.CONNECTED || this.state === ConnectionState.DEGRADED)) {
      return this.transition(ConnectionState.STREAMING);
    }
    if (!isStreaming && this.state === ConnectionState.STREAMING) {
      const nextState = this.lastLatencyMs > 500 ? ConnectionState.DEGRADED : ConnectionState.CONNECTED;
      return this.transition(nextState);
    }
    return this.state;
  }

  disconnect() {
    this.retryCount = 0;
    return this.transition(ConnectionState.DISCONNECTED);
  }
}

module.exports = {
  ConnectionState,
  ConnectionFSM
};
