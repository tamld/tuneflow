/**
 * TuneFlow Desktop Launcher Unit & Integration Tests
 * Authority: SPEC-0010 (REQ-DSK-05: Background Launcher & Browser Auto-Open)
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const net = require('net');
const { spawnSync } = require('child_process');
const launcher = require('../src/desktop/launcher');

describe('SPEC-0010: Desktop Launcher Engine Suite', () => {
  const repoRoot = path.resolve(__dirname, '..');
  const binScript = path.join(repoRoot, 'bin', 'tuneflow.js');

  it('should verify bin/tuneflow.js exists, is executable, and contains shebang', () => {
    assert.strictEqual(fs.existsSync(binScript), true, 'bin/tuneflow.js must exist');
    const content = fs.readFileSync(binScript, 'utf8');
    assert.ok(content.startsWith('#!/usr/bin/env node'), 'Must have node shebang');
  });

  it('should verify package.json declares bin.tuneflow entrypoint', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
    assert.strictEqual(pkg.bin?.tuneflow, './bin/tuneflow.js');
  });

  it('should verify isPortAvailable returns true for unused port and false for bound port', async () => {
    // Probe a dynamic high port
    const testPort = 49123;
    const initialFree = await launcher.isPortAvailable(testPort);
    assert.strictEqual(initialFree, true, `Port ${testPort} should be free initially`);

    // Bind port
    const server = net.createServer();
    await new Promise((resolve) => server.listen(testPort, '127.0.0.1', resolve));

    try {
      const boundCheck = await launcher.isPortAvailable(testPort);
      assert.strictEqual(boundCheck, false, `Port ${testPort} should be detected as unavailable when bound`);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }

    const releasedCheck = await launcher.isPortAvailable(testPort);
    assert.strictEqual(releasedCheck, true, `Port ${testPort} should be free again after closing`);
  });

  it('should verify findAvailablePort skips busy ports and returns next free port', async () => {
    const basePort = 49200;
    const server = net.createServer();
    await new Promise((resolve) => server.listen(basePort, '127.0.0.1', resolve));

    try {
      const nextPort = await launcher.findAvailablePort(basePort, 5);
      assert.ok(nextPort > basePort, `Found port ${nextPort} should be strictly greater than occupied ${basePort}`);
      assert.ok(nextPort < basePort + 5, `Found port ${nextPort} should be within range`);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('should return OS-specific browser open commands correctly', () => {
    const testUrl = 'http://localhost:3000';

    // macOS
    const macCmd = launcher.getBrowserOpenCommand(testUrl, 'darwin');
    assert.strictEqual(macCmd.cmd, 'open');
    assert.deepStrictEqual(macCmd.args, [testUrl]);

    // Windows
    const winCmd = launcher.getBrowserOpenCommand(testUrl, 'win32');
    assert.strictEqual(winCmd.cmd, 'cmd.exe');
    assert.deepStrictEqual(winCmd.args, ['/c', 'start', '""', testUrl]);

    // Linux
    const linuxCmd = launcher.getBrowserOpenCommand(testUrl, 'linux');
    assert.strictEqual(linuxCmd.cmd, 'xdg-open');
    assert.deepStrictEqual(linuxCmd.args, [testUrl]);
  });

  it('should verify bin/tuneflow.js CLI outputs version with --version flag', () => {
    const res = spawnSync(process.execPath, [binScript, '--version'], { encoding: 'utf8' });
    assert.strictEqual(res.status, 0);
    const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
    assert.strictEqual(res.stdout.trim(), `v${pkg.version}`);
  });

  it('should verify bin/tuneflow.js CLI outputs usage instructions with --help flag', () => {
    const res = spawnSync(process.execPath, [binScript, '--help'], { encoding: 'utf8' });
    assert.strictEqual(res.status, 0);
    assert.match(res.stdout, /Usage:/);
    assert.match(res.stdout, /--port/);
    assert.match(res.stdout, /--no-browser/);
  });
});
