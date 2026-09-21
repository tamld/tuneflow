/**
 * TuneFlow Unified Desktop Launcher Engine
 *
 * Authority: SPEC-0010 (Desktop Packaging & Installation Wizards, REQ-DSK-05)
 * Purpose: Platform-agnostic desktop entrypoint that probes port availability,
 * launches the TuneFlow Express server, and automatically opens the user's
 * default web browser to http://localhost:<PORT>.
 */

const net = require('net');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..', '..');

/**
 * Checks if a specific TCP port is available on localhost.
 * @param {number} port
 * @returns {Promise<boolean>}
 */
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '127.0.0.1');
  });
}

/**
 * Finds the first available port in the range [startPort, startPort + maxAttempts - 1].
 * @param {number} startPort
 * @param {number} maxAttempts
 * @returns {Promise<number>}
 */
async function findAvailablePort(startPort = 3000, maxAttempts = 10) {
  for (let p = startPort; p < startPort + maxAttempts; p++) {
    if (await isPortAvailable(p)) {
      return p;
    }
  }
  throw new Error(`No available port found between ${startPort} and ${startPort + maxAttempts - 1}`);
}

/**
 * Returns the OS-specific command and arguments to open a URL in the default browser.
 * @param {string} url
 * @param {string} [platform]
 * @returns {{ cmd: string, args: string[] }}
 */
function getBrowserOpenCommand(url, platform = process.platform) {
  if (platform === 'darwin') {
    return { cmd: 'open', args: [url] };
  } else if (platform === 'win32') {
    return { cmd: 'cmd.exe', args: ['/c', 'start', '""', url] };
  } else {
    // Linux / FreeDesktop / BSD
    return { cmd: 'xdg-open', args: [url] };
  }
}

/**
 * Returns OS-specific standalone application window command if a compatible
 * Chromium/WebKit runtime is available (Edge/Chrome App Mode), or null.
 * @param {string} url
 * @param {string} [platform]
 * @returns {{ cmd: string, args: string[] } | null}
 */
function getStandaloneAppCommand(url, platform = process.platform) {
  const fs = require('fs');
  const os = require('os');

  if (platform === 'win32') {
    const candidates = [
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      path.join(process.env.LOCALAPPDATA || '', 'Microsoft\\Edge\\Application\\msedge.exe'),
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe')
    ];

    const profileDir = path.join(process.env.LOCALAPPDATA || os.tmpdir(), 'TuneFlow', 'AppProfile');

    for (const bin of candidates) {
      if (fs.existsSync(bin)) {
        return {
          cmd: bin,
          args: [
            `--app=${url}`,
            '--window-size=1080,750',
            `--user-data-dir=${profileDir}`,
            '--app-id=com.tamld.tuneflow'
          ]
        };
      }
    }
  } else if (platform === 'linux') {
    const linuxBins = ['/usr/bin/google-chrome', '/usr/bin/chromium-browser', '/usr/bin/chromium'];
    for (const bin of linuxBins) {
      if (fs.existsSync(bin)) {
        return {
          cmd: bin,
          args: [`--app=${url}`, '--window-size=1080,750']
        };
      }
    }
  }
  return null;
}

/**
 * Launches the system's standalone application window or default browser.
 * @param {string} url
 * @param {string} [platform]
 * @param {{ preferStandalone?: boolean }} [options]
 * @returns {import('child_process').ChildProcess | null}
 */
function openBrowser(url, platform = process.platform, options = {}) {
  if (options.preferStandalone !== false) {
    const appCmd = getStandaloneAppCommand(url, platform);
    if (appCmd) {
      try {
        const child = spawn(appCmd.cmd, appCmd.args, { stdio: 'ignore', detached: true });
        child.unref();
        return child;
      } catch (err) {
        console.warn(`⚠️ Could not launch standalone window: ${err.message}`);
      }
    }
  }

  const { cmd, args } = getBrowserOpenCommand(url, platform);
  try {
    const child = spawn(cmd, args, { stdio: 'ignore', detached: true });
    child.unref();
    return child;
  } catch (err) {
    console.warn(`⚠️ Could not launch browser automatically: ${err.message}`);
    return null;
  }
}

/**
 * Polls the health check URL until server responds or timeout expires.
 * @param {string} url
 * @param {number} [timeoutMs]
 * @returns {Promise<boolean>}
 */
function waitForHealthCheck(url, timeoutMs = 10000) {
  const start = Date.now();
  return new Promise((resolve) => {
    function check() {
      if (Date.now() - start > timeoutMs) {
        return resolve(false);
      }
      const req = http.get(url, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 400) {
          resolve(true);
        } else {
          setTimeout(check, 100);
        }
      });
      req.on('error', () => {
        setTimeout(check, 100);
      });
    }
    check();
  });
}

/**
 * Starts TuneFlow desktop runtime:
 * 1. Probes port availability.
 * 2. Starts Express server.
 * 3. Waits for /api/health to be ready.
 * 4. Opens default browser.
 *
 * @param {object} [options]
 * @param {number} [options.port]
 * @param {boolean} [options.autoOpenBrowser]
 * @returns {Promise<{ port: number, url: string, server: import('http').Server }>}
 */
async function launch({ port: requestedPort, autoOpenBrowser = true } = {}) {
  const startPort = requestedPort || parseInt(process.env.PORT || '3000', 10);
  const port = await findAvailablePort(startPort);

  process.env.PORT = String(port);

  // Require Express app after setting process.env.PORT
  const { app } = require('../server');

  return new Promise((resolve, reject) => {
    const server = app.listen(port, '0.0.0.0', async () => {
      const url = `http://localhost:${port}`;
      console.log(`\n🎶 TuneFlow Desktop App running at: ${url}`);
      console.log('📂 Press Ctrl+C to stop.\n');

      // Start maintenance engine if available
      try {
        const maintenance = require('../engine/maintenance');
        if (maintenance && typeof maintenance.startMaintenance === 'function') {
          maintenance.startMaintenance();
        }
      } catch (_e) {}

      if (autoOpenBrowser) {
        const ready = await waitForHealthCheck(`${url}/api/health`, 5000);
        if (ready) {
          openBrowser(url);
        } else {
          openBrowser(url);
        }
      }

      resolve({ port, url, server });
    });

    server.once('error', reject);
  });
}

module.exports = {
  isPortAvailable,
  findAvailablePort,
  getBrowserOpenCommand,
  getStandaloneAppCommand,
  openBrowser,
  waitForHealthCheck,
  launch,
  ROOT_DIR
};
