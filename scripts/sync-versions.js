#!/usr/bin/env node
/**
 * Single-Source Version Synchronization Script (Directive D-01 & Issue #140)
 * Reads authoritative version from root package.json (2.5.0) and verifies or synchronizes:
 * - Workspace package.json manifests (packages/*, apps/*, distros/*)
 * - PWA manifest.json
 * - Service Worker cache key (public/sw.js)
 * - Android app/build.gradle versionName
 * - Scoop manifest (packaging/scoop/tuneflow.json)
 * - Windows Inno Setup (installer/windows/setup.iss)
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const checkOnly = process.argv.includes('--check');

function syncVersions() {
  const rootPkgPath = path.join(ROOT_DIR, 'package.json');
  const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
  const version = rootPkg.version;
  const drifts = [];

  const jsonTargets = [
    'manifest.json',
    'packaging/scoop/tuneflow.json',
    'packages/contract/package.json',
    'packages/core/package.json',
    'packages/web/package.json',
    'apps/desktop/package.json',
    'apps/android/package.json',
    'apps/extension/package.json',
    'distros/selfhost/package.json'
  ];

  for (const relPath of jsonTargets) {
    const absPath = path.join(ROOT_DIR, relPath);
    if (!fs.existsSync(absPath)) continue;
    const data = JSON.parse(fs.readFileSync(absPath, 'utf8'));
    if (data.version !== version) {
      drifts.push(`${relPath}: ${data.version} !== ${version}`);
      if (!checkOnly) {
        data.version = version;
        fs.writeFileSync(absPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
      }
    }
  }

  // Service worker cache version
  const swPath = path.join(ROOT_DIR, 'public/sw.js');
  if (fs.existsSync(swPath)) {
    const swContent = fs.readFileSync(swPath, 'utf8');
    const expectedCache = `tuneflow-v${version}`;
    if (!swContent.includes(expectedCache)) {
      drifts.push(`public/sw.js: missing ${expectedCache}`);
      if (!checkOnly) {
        const updated = swContent.replace(/tuneflow-v\d+\.\d+\.\d+/g, expectedCache);
        fs.writeFileSync(swPath, updated, 'utf8');
      }
    }
  }

  // Android build.gradle
  const gradlePath = path.join(ROOT_DIR, 'android/app/build.gradle');
  if (fs.existsSync(gradlePath)) {
    const gradleContent = fs.readFileSync(gradlePath, 'utf8');
    const expectedLine = `versionName "${version}"`;
    if (!gradleContent.includes(expectedLine)) {
      drifts.push(`android/app/build.gradle: missing ${expectedLine}`);
      if (!checkOnly) {
        const updated = gradleContent.replace(/versionName\s+"[^"]+"/, expectedLine);
        fs.writeFileSync(gradlePath, updated, 'utf8');
      }
    }
  }

  // Windows Inno Setup
  const issPath = path.join(ROOT_DIR, 'installer/windows/setup.iss');
  if (fs.existsSync(issPath)) {
    const issContent = fs.readFileSync(issPath, 'utf8');
    const expectedDefine = `#define MyAppVersion "${version}"`;
    if (!issContent.includes(expectedDefine)) {
      drifts.push(`installer/windows/setup.iss: missing ${expectedDefine}`);
      if (!checkOnly) {
        const updated = issContent.replace(/#define\s+MyAppVersion\s+"[^"]+"/, expectedDefine);
        fs.writeFileSync(issPath, updated, 'utf8');
      }
    }
  }

  if (checkOnly && drifts.length > 0) {
    console.error(`[sync-versions] Version drift detected against canonical ${version}:\n  - ` + drifts.join('\n  - '));
    process.exit(1);
  }

  console.log(`[sync-versions] All workspace & distribution manifests synchronized at v${version} (${drifts.length} updated).`);
  return { version, drifts };
}

if (require.main === module) {
  syncVersions();
}

module.exports = { syncVersions };
