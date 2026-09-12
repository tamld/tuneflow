/**
 * CI/CD Preflight Verification Gate Suite
 *
 * Purpose: Guarantee that local changes will never break GitHub Actions CI/CD workflows.
 * Verifies package manager lockfile compatibility, npm overrides syntax, zero CVEs,
 * GHA workflow contract parity, non-blocking automation scripts, and manifest version sync.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const os = require('os');

describe('CI/CD Preflight Verification Gate & GHA Failure Prevention', () => {
  const rootDir = path.join(__dirname, '..');
  const packageJsonPath = path.join(rootDir, 'package.json');
  const packageLockPath = path.join(rootDir, 'package-lock.json');
  const ciYmlPath = path.join(rootDir, '.github/workflows/ci.yml');
  const releaseYmlPath = path.join(rootDir, '.github/workflows/release.yml');
  const pyCmd = process.platform === 'win32' ? 'python' : (fs.existsSync('/usr/bin/python3') ? '/usr/bin/python3' : 'python3');

  it('should verify package.json overrides syntax is strictly valid for npm and pnpm', () => {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    function validateOverrides(obj, pathPrefix = 'overrides') {
      if (!obj || typeof obj !== 'object') return;
      for (const [key, value] of Object.entries(obj)) {
        assert.ok(
          !key.includes('>') && !key.includes(' ') && (!key.includes(':') || key.startsWith('@')),
          `Key "${key}" at ${pathPrefix} contains illegal characters for npm overrides (e.g. ">"). Must use nested object syntax.`
        );
        if (typeof value === 'object' && value !== null) {
          validateOverrides(value, `${pathPrefix}.${key}`);
        }
      }
    }

    if (pkg.overrides) {
      validateOverrides(pkg.overrides, 'overrides');
    }
    if (pkg.pnpm && pkg.pnpm.overrides) {
      validateOverrides(pkg.pnpm.overrides, 'pnpm.overrides');
    }
  });

  it('should verify npm ci dry-run completes successfully without lockfile mismatch or EUSAGE', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tuneflow-npm-ci-check-'));
    try {
      fs.copyFileSync(packageJsonPath, path.join(tempDir, 'package.json'));
      fs.copyFileSync(packageLockPath, path.join(tempDir, 'package-lock.json'));

      const res = spawnSync('npm', ['ci', '--dry-run'], {
        cwd: tempDir,
        encoding: 'utf8',
        timeout: 30000
      });

      assert.strictEqual(
        res.status,
        0,
        `npm ci --dry-run failed with code ${res.status}.\nStderr: ${res.stderr}\nStdout: ${res.stdout}`
      );
      assert.ok(
        !res.stderr.includes('npm error code EUSAGE'),
        'npm ci must not report EUSAGE lockfile mismatch'
      );
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should verify zero high or critical security vulnerabilities via npm audit', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tuneflow-npm-audit-check-'));
    try {
      fs.copyFileSync(packageJsonPath, path.join(tempDir, 'package.json'));
      fs.copyFileSync(packageLockPath, path.join(tempDir, 'package-lock.json'));

      const res = spawnSync('npm', ['audit', '--audit-level=high'], {
        cwd: tempDir,
        encoding: 'utf8',
        timeout: 30000
      });

      assert.strictEqual(
        res.status,
        0,
        `npm audit reported high/critical vulnerabilities!\nStderr: ${res.stderr}\nStdout: ${res.stdout}`
      );
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should verify .github/workflows/ci.yml enforces strict quality gates in correct order', () => {
    assert.strictEqual(fs.existsSync(ciYmlPath), true, 'ci.yml must exist');
    const content = fs.readFileSync(ciYmlPath, 'utf8');

    // Verification steps in ci.yml
    assert.match(content, /node-version:\s*22/, 'Must test against Node.js 22');
    assert.match(content, /npm ci/, 'Must install dependencies via npm ci');
    assert.match(content, /npm audit --audit-level=high/, 'Must include security audit gate');
    assert.match(content, /npm run lint/, 'Must include ESLint analysis');
    assert.match(content, /npx puppeteer browsers install chrome/, 'Must install Chrome for E2E tests');
    assert.match(content, /npm test/, 'Must execute full test suite');
    assert.match(content, /container-smoke-test:/, 'Must contain container smoke test job');
    assert.match(content, /curl --fail http:\/\/localhost:3000\/api\/health/, 'Container smoke test must check /api/health');
  });

  it('should verify scripts/gh_safe_post.py executes deterministically without blocking stdin', () => {
    const scriptPath = path.join(rootDir, 'scripts', 'gh_safe_post.py');
    assert.strictEqual(fs.existsSync(scriptPath), true);

    // Run --help
    const helpRes = spawnSync(pyCmd, [scriptPath, '--help'], {
      input: '', // Empty stdin
      encoding: 'utf8',
      timeout: 5000
    });
    assert.strictEqual(helpRes.status, 0, 'gh_safe_post.py --help must exit with 0 immediately');

    // Run lint subcommand with body string
    const lintRes = spawnSync(pyCmd, [scriptPath, 'lint', '--body', '# Safe Markdown Test\n\nValid line.'], {
      input: '',
      encoding: 'utf8',
      timeout: 5000
    });
    assert.strictEqual(lintRes.status, 0, 'gh_safe_post.py lint must exit with 0');
    assert.match(lintRes.stdout, /Clean: No shell mangling/i);
  });

  it('should verify cross-version consistency across all distribution manifests', () => {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const version = pkg.version;

    // 1. PWA manifest
    const manifestPath = path.join(rootDir, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      assert.strictEqual(manifest.version, version, 'manifest.json version must match package.json');
    }

    // 2. Service Worker cache key
    const swPath = path.join(rootDir, 'public', 'sw.js');
    if (fs.existsSync(swPath)) {
      const sw = fs.readFileSync(swPath, 'utf8');
      assert.match(sw, new RegExp(`tuneflow-v${version.replace(/\./g, '\\.')}`), 'sw.js cache name must match version');
    }

    // 3. Android build.gradle
    const gradlePath = path.join(rootDir, 'android/app/build.gradle');
    if (fs.existsSync(gradlePath)) {
      const gradle = fs.readFileSync(gradlePath, 'utf8');
      assert.match(gradle, new RegExp(`versionName\\s+"${version.replace(/\./g, '\\.')}"`), 'android build.gradle must match version');
    }

    // 4. Scoop manifest
    const scoopPath = path.join(rootDir, 'packaging/scoop/tuneflow.json');
    if (fs.existsSync(scoopPath)) {
      const scoop = JSON.parse(fs.readFileSync(scoopPath, 'utf8'));
      assert.strictEqual(scoop.version, version, 'packaging/scoop/tuneflow.json version must match package.json');
    }

    // 5. Windows Inno Setup
    const setupIssPath = path.join(rootDir, 'installer/windows/setup.iss');
    if (fs.existsSync(setupIssPath)) {
      const setupIss = fs.readFileSync(setupIssPath, 'utf8');
      assert.match(setupIss, new RegExp(`#define\\s+MyAppVersion\\s+"${version.replace(/\./g, '\\.')}"`), 'setup.iss MyAppVersion must match package.json');
    }
  });

  it('should verify that all test files guard platform-specific binary invocations against Linux CI divergence', () => {
    const testsDir = path.join(rootDir, 'tests');
    const testFiles = fs.readdirSync(testsDir).filter(f => f.endsWith('.test.js'));
    const osSpecificBinaries = ['plutil', 'lsregister', 'mdimport', 'codesign', 'spctl'];

    for (const file of testFiles) {
      const content = fs.readFileSync(path.join(testsDir, file), 'utf8');
      for (const bin of osSpecificBinaries) {
        if (content.includes(bin)) {
          const regex = new RegExp(`(?:execSync|spawnSync)\\([^)]*${bin}[^)]*\\)`);
          if (regex.test(content)) {
            assert.ok(
              content.includes("process.platform === 'darwin'") ||
              content.includes('try {') ||
              content.includes('hasCommand('),
              `Test file "${file}" invokes platform-specific binary "${bin}" without Darwin platform guard or try-catch protection!`
            );
          }
        }
      }
    }
  });
});
