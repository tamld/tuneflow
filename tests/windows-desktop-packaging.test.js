/**
 * TuneFlow Windows Desktop Packaging & Inno Setup Verification Suite
 * Authority: SPEC-0010 (REQ-DSK-02: Zero-Admin Windows Setup & Multi-Channel Distribution)
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

describe('SPEC-0010: Windows Native Desktop Packaging Suite', () => {
  const repoRoot = path.resolve(__dirname, '..');
  const issPath = path.join(repoRoot, 'installer', 'windows', 'setup.iss');
  const wingetPath = path.join(repoRoot, 'packaging', 'winget', 'tamld.TuneFlow.yaml');
  const scoopPath = path.join(repoRoot, 'packaging', 'scoop', 'tuneflow.json');
  const releaseYmlPath = path.join(repoRoot, '.github', 'workflows', 'release.yml');

  describe('1. Inno Setup 6 Zero-Admin Blueprint (installer/windows/setup.iss)', () => {
    it('should verify installer/windows/setup.iss exists and defines modern zero-admin parameters', () => {
      assert.strictEqual(fs.existsSync(issPath), true, 'setup.iss must exist in installer/windows/');
      const content = fs.readFileSync(issPath, 'utf8');

      // Essential Zero-Admin and UX configurations
      assert.match(content, /PrivilegesRequired=lowest/, 'Must enforce Zero-Admin lowest privileges');
      assert.match(content, /WizardStyle=modern/, 'Must use modern Inno Setup wizard style');
      assert.match(content, /DefaultDirName=\{localappdata\}\\Programs\\\{#MyAppName\}/, 'Must install to LocalAppData');
      assert.match(content, /SetupIconFile=public\\icons\\favicon\.ico/, 'Must reference favicon.ico as setup icon');
      assert.match(content, /Compression=lzma2\/ultra64/, 'Must use high-ratio lzma2 compression');
      assert.match(content, /SolidCompression=yes/, 'Must enable solid compression');
    });

    it('should verify setup.iss registers Windows Shell contracts (AppUserModelID, URL Protocol, App Paths)', () => {
      const content = fs.readFileSync(issPath, 'utf8');

      // AppUserModelID for Windows 10/11 taskbar grouping and toast notifications
      assert.match(content, /AppUserModelID:\s*"com\.tamld\.tuneflow"/, 'Must declare AppUserModelID');

      // App Paths for Windows Run dialog (Win+R -> tuneflow)
      assert.match(content, /Software\\Microsoft\\Windows\\CurrentVersion\\App Paths\\\{#MyAppExeName\}/, 'Must register App Paths');

      // URL Protocol handler for browser-to-desktop handoff (tuneflow://)
      assert.match(content, /Software\\Classes\\tuneflow/, 'Must register tuneflow protocol key');
      assert.match(content, /"URL Protocol"/, 'Must define URL Protocol marker');
    });

    it('should verify setup.iss defines post-install run section with browser integration', () => {
      const content = fs.readFileSync(issPath, 'utf8');
      assert.match(content, /\[Run\]/, 'Must declare [Run] section');
      assert.match(content, /Filename:\s*"\{app\}\\\{#MyAppExeName\}"/, 'Must execute installed executable');
      assert.match(content, /nowait\s+postinstall/, 'Must specify nowait postinstall flags');
    });
  });

  describe('2. Windows Package Manager Manifest Compliance (WinGet & Scoop)', () => {
    it('should verify WinGet manifest complies with Microsoft WinGet schema', () => {
      assert.strictEqual(fs.existsSync(wingetPath), true, 'WinGet manifest must exist');
      const content = fs.readFileSync(wingetPath, 'utf8');

      assert.match(content, /PackageIdentifier:\s*tamld\.TuneFlow/, 'Must define PackageIdentifier');
      assert.match(content, /PackageName:\s*TuneFlow/, 'Must define PackageName');
      assert.match(content, /InstallerType:\s*inno/, 'Must declare inno installer type');
      assert.match(content, /Scope:\s*user/, 'Must declare user scope for zero-admin installation');
      assert.match(content, /InstallerSwitches:/, 'Must declare InstallerSwitches');
      assert.match(content, /Silent:\s*\/VERYSILENT/, 'Must configure silent flag');
    });

    it('should verify Scoop manifest is valid JSON and declares 64-bit Inno installer', () => {
      assert.strictEqual(fs.existsSync(scoopPath), true, 'Scoop manifest must exist');
      const scoop = JSON.parse(fs.readFileSync(scoopPath, 'utf8'));

      assert.strictEqual(typeof scoop.version, 'string', 'Must specify version string');
      assert.strictEqual(scoop.innosetup, true, 'Must declare innosetup: true');
      assert.ok(scoop.architecture && scoop.architecture['64bit'], 'Must configure 64bit architecture');
      assert.ok(scoop.autoupdate, 'Must configure autoupdate');
      assert.ok(scoop.checkver, 'Must configure checkver');
    });
  });

  describe('3. GitHub Actions Release Workflow Windows Integration', () => {
    it('should verify release.yml contains windows-desktop-build with Inno Setup compilation', () => {
      const content = fs.readFileSync(releaseYmlPath, 'utf8');

      assert.match(content, /windows-desktop-build:/, 'Must declare windows-desktop-build job');
      assert.match(content, /runs-on:\s*windows-latest/, 'Must run on windows-latest');
      assert.match(content, /setup\.iss/, 'Must compile setup.iss');
      assert.match(content, /tuneflow-windows-installer/, 'Must upload Windows installer artifact');
      assert.match(content, /release-assets\/\*\.exe/, 'Must include .exe in release assets');
    });
  });
});
