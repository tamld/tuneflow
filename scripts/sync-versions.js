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
    const parts = version.split('.').map(Number);
    const versionCode = (parts[0] || 0) * 100 + (parts[1] || 0) * 10 + (parts[2] || 0);
    const expectedLine = `versionName "${version}"`;
    const expectedCode = `versionCode ${versionCode}`;
    if (!gradleContent.includes(expectedLine) || !gradleContent.includes(expectedCode)) {
      drifts.push(`android/app/build.gradle: missing ${expectedLine} or ${expectedCode}`);
      if (!checkOnly) {
        const updated = gradleContent
          .replace(/versionName\s+"[^"]+"/, expectedLine)
          .replace(/versionCode\s+\d+/, expectedCode);
        fs.writeFileSync(gradlePath, updated, 'utf8');
      }
    }
  }

  // OpenAPI contract spec
  const openapiPath = path.join(ROOT_DIR, 'packages/contract/openapi.json');
  if (fs.existsSync(openapiPath)) {
    const openapi = JSON.parse(fs.readFileSync(openapiPath, 'utf8'));
    if (openapi.info && openapi.info.version !== version) {
      drifts.push(`packages/contract/openapi.json: ${openapi.info.version} !== ${version}`);
      if (!checkOnly) {
        openapi.info.version = version;
        fs.writeFileSync(openapiPath, JSON.stringify(openapi, null, 2) + '\n', 'utf8');
      }
    }
  }

  // macOS Swift native host
  const swiftPath = path.join(ROOT_DIR, 'src/desktop/macos/main.swift');
  if (fs.existsSync(swiftPath)) {
    const swiftContent = fs.readFileSync(swiftPath, 'utf8');
    const expectedSwift = `TuneFlow v${version}`;
    if (!swiftContent.includes(expectedSwift)) {
      drifts.push(`src/desktop/macos/main.swift: missing ${expectedSwift}`);
      if (!checkOnly) {
        const updated = swiftContent.replace(/TuneFlow v\d+\.\d+\.\d+/g, expectedSwift);
        fs.writeFileSync(swiftPath, updated, 'utf8');
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
