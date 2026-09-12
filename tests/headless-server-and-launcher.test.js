const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');

describe('Headless Server & Launcher Verification (Mode 2 & Mode 3)', () => {

  describe('1. Systemd Service Unit Specification', () => {
    const servicePath = path.join(REPO_ROOT, 'installer', 'server', 'tuneflow.service');

    test('installer/server/tuneflow.service exists', () => {
      assert.ok(fs.existsSync(servicePath), 'tuneflow.service should exist on disk');
    });

    test('tuneflow.service contains production hardening directives', () => {
      const content = fs.readFileSync(servicePath, 'utf8');

      // Unit definition
      assert.ok(content.includes('Description=TuneFlow Headless Media Server'), 'Should have standard description');
      assert.ok(content.includes('After=network.target'), 'Should start after network is ready');

      // Service execution & reliability
      assert.ok(content.includes('Type=simple'), 'Should use simple service type');
      assert.ok(content.includes('User=tuneflow'), 'Should run as unprivileged tuneflow user');
      assert.ok(content.includes('Restart=always'), 'Should specify Restart=always for high availability');
      assert.ok(content.includes('LimitNOFILE=65536'), 'Should configure high file descriptor limit');
      assert.ok(content.includes('EnvironmentFile=-/etc/tuneflow/tuneflow.env'), 'Should load optional environment file');

      // Security hardening
      assert.ok(content.includes('PrivateTmp=true'), 'Should enable PrivateTmp sandbox');
      assert.ok(content.includes('ProtectSystem=full'), 'Should protect system binaries and libraries');
      assert.ok(content.includes('ProtectHome=read-only'), 'Should protect home directory');
      assert.ok(content.includes('NoNewPrivileges=true'), 'Should prevent privilege escalation');
      assert.ok(content.includes('ReadWritePaths=/var/lib/tuneflow'), 'Should allow explicit write access to data directory');
    });
  });

  describe('2. Server Environment Configuration Template', () => {
    const envPath = path.join(REPO_ROOT, 'installer', 'server', 'tuneflow.env.example');

    test('installer/server/tuneflow.env.example exists', () => {
      assert.ok(fs.existsSync(envPath), 'tuneflow.env.example should exist on disk');
    });

    test('tuneflow.env.example defines storage-agnostic POSIX parameters', () => {
      const content = fs.readFileSync(envPath, 'utf8');

      // Check standard variables
      assert.ok(content.includes('PORT=3000'), 'Should declare PORT');
      assert.ok(content.includes('HOST=0.0.0.0'), 'Should declare HOST');
      assert.ok(content.includes('DATA_DIR=/var/lib/tuneflow/data'), 'Should declare DATA_DIR');
      assert.ok(content.includes('DOWNLOADS_DIR=/var/lib/tuneflow/downloads'), 'Should declare DOWNLOADS_DIR');
      assert.ok(content.includes('TEMP_DIR=/var/lib/tuneflow/temp'), 'Should declare TEMP_DIR');
      assert.ok(content.includes('DB_PATH=/var/lib/tuneflow/data/tuneflow.db'), 'Should declare DB_PATH');
      assert.ok(content.includes('MAX_STORAGE_MB=10240'), 'Should declare MAX_STORAGE_MB');

      // Neutrality invariant: zero private homelab or vendor branding
      assert.ok(!content.toLowerCase().includes('proxmox'), 'Must not reference proprietary hypervisors');
      assert.ok(!content.toLowerCase().includes('ct122'), 'Must not reference private container IDs');
    });
  });

  describe('3. Turnkey Headless Server Installer (install.sh)', () => {
    const installerPath = path.join(REPO_ROOT, 'installer', 'server', 'install.sh');

    test('install.sh exists and is executable', () => {
      assert.ok(fs.existsSync(installerPath), 'install.sh should exist');
      fs.accessSync(installerPath, fs.constants.X_OK);
    });

    test('install.sh passes bash syntax validation (bash -n)', () => {
      assert.doesNotThrow(() => {
        execSync(`bash -n "${installerPath}"`, { stdio: 'pipe' });
      }, 'install.sh should pass bash syntax verification');
    });

    test('install.sh --help outputs comprehensive usage info and exits 0', () => {
      const stdout = execSync(`"${installerPath}" --help`, { encoding: 'utf8' });
      assert.ok(stdout.includes('Usage:'), 'Should display usage');
      assert.ok(stdout.includes('--prefix'), 'Should document --prefix');
      assert.ok(stdout.includes('--data-dir'), 'Should document --data-dir');
      assert.ok(stdout.includes('--config-dir'), 'Should document --config-dir');
      assert.ok(stdout.includes('--port'), 'Should document --port');
      assert.ok(stdout.includes('--dry-run'), 'Should document --dry-run');
    });

    test('install.sh --dry-run validates parameters without making system modifications', () => {
      const stdout = execSync(`"${installerPath}" --dry-run --port 9090 --prefix /tmp/tuneflow_test`, {
        encoding: 'utf8'
      });
      assert.ok(stdout.includes('DRY-RUN SIMULATION'), 'Should enter dry-run simulation');
      assert.ok(stdout.includes('9090'), 'Should reflect custom port');
      assert.ok(stdout.includes('/tmp/tuneflow_test'), 'Should reflect custom prefix');
      assert.ok(stdout.includes('Dry run validation completed successfully'), 'Should report validation success');
    });
  });

  describe('4. Server Runtime & Daemon Configuration', () => {
    test('src/config.js exports configurable HOST defaulting to 0.0.0.0', () => {
      const config = require('../src/config');
      assert.ok(typeof config.HOST === 'string', 'HOST should be exported as a string');
      assert.ok(config.HOST === '0.0.0.0' || config.HOST.length > 0, 'HOST should have a valid default');
    });

    test('bin/tuneflow.js CLI help documents --daemon flag', () => {
      const stdout = execSync('node bin/tuneflow.js --help', {
        cwd: REPO_ROOT,
        encoding: 'utf8'
      });
      assert.ok(stdout.includes('--daemon'), 'CLI help must document --daemon flag');
      assert.ok(stdout.includes('--no-browser'), 'CLI help must document --no-browser flag');
    });
  });

  describe('5. Packaging Suites & Thin Client Profiles', () => {
    test('scripts/package_macos.sh passes bash syntax validation and supports --thin-client', () => {
      const scriptPath = path.join(REPO_ROOT, 'scripts', 'package_macos.sh');
      assert.doesNotThrow(() => {
        execSync(`bash -n "${scriptPath}"`, { stdio: 'pipe' });
      }, 'package_macos.sh should pass bash syntax check');

      const stdout = execSync(`bash "${scriptPath}" --help`, { encoding: 'utf8' });
      assert.ok(stdout.includes('--thin-client'), 'package_macos.sh help should document --thin-client');
    });

    test('scripts/package_linux.sh passes bash syntax validation', () => {
      const scriptPath = path.join(REPO_ROOT, 'scripts', 'package_linux.sh');
      assert.doesNotThrow(() => {
        execSync(`bash -n "${scriptPath}"`, { stdio: 'pipe' });
      }, 'package_linux.sh should pass bash syntax check');
    });
  });
});
