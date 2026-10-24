#!/usr/bin/env node

/**
 * TuneFlow Sidecar Bundler & SHA-256 Manifest Generator (SPEC-0017 / REQ-PKG-01)
 *
 * Responsibilities:
 * 1. Exclude unused `cloudflared` / `cloudflared.exe` from desktop bundle directories.
 * 2. Copy `tuneflow.js` and `yt-dlp` (plus `ffmpeg` when `--include-ffmpeg` is passed)
 *    from local `bin/` or Scoop/system PATH into the target bundle `bin/` directory.
 * 3. Compute SHA-256 checksums for all bundled sidecars and write `SHA256SUMS.json`
 *    consumed by `src/security/binary_guard.js`.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);

const targetIdx = args.indexOf('--target');
const targetDir = (targetIdx !== -1 && args[targetIdx + 1])
  ? path.resolve(args[targetIdx + 1])
  : path.join(ROOT, 'dist', 'win-unpacked', 'bin');

const includeFfmpeg = args.includes('--include-ffmpeg');

function computeFileSha256(filePath) {
  const hash = crypto.createHash('sha256');
  const data = fs.readFileSync(filePath);
  hash.update(data);
  return hash.digest('hex');
}

function findChocolateyRealBinary(exeName, binaryName) {
  const chocoLib = 'C:\\ProgramData\\chocolatey\\lib';
  if (!fs.existsSync(chocoLib)) return null;
  const dirs = [
    path.join(chocoLib, binaryName),
    path.join(chocoLib, `${binaryName}.install`)
  ];
  const stack = dirs.filter((d) => fs.existsSync(d));
  while (stack.length > 0) {
    const cur = stack.pop();
    let entries = [];
    try {
      entries = fs.readdirSync(cur, { withFileTypes: true });
    } catch (_e) {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(cur, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile() && entry.name.toLowerCase() === exeName.toLowerCase()) {
        try {
          const stat = fs.statSync(full);
          if (stat.size >= 1024 * 1024) {
            return full;
          }
        } catch (_e) {}
      }
    }
  }
  return null;
}

function findLocalBinaryCandidate(binaryName) {
  const isWin = process.platform === 'win32';
  const exeName = isWin ? `${binaryName}.exe` : binaryName;
  const userProfile = process.env.USERPROFILE || process.env.HOME || '';

  const pathDirs = (process.env.PATH || '')
    .split(path.delimiter)
    .map((d) => d.trim())
    .filter(Boolean);

  const candidates = [
    path.join(ROOT, 'bin', exeName),
    userProfile ? path.join(userProfile, 'scoop', 'apps', binaryName, 'current', exeName) : '',
    userProfile ? path.join(userProfile, 'scoop', 'apps', binaryName, 'current', 'bin', exeName) : '',
    isWin ? findChocolateyRealBinary(exeName, binaryName) : '',
    ...pathDirs.map((dir) => path.join(dir, exeName)),
    userProfile ? path.join(userProfile, 'scoop', 'shims', exeName) : ''
  ].filter(Boolean);

  // On Windows, prefer standalone binaries (>= 1 MB) over Chocolatey/Scoop shim wrappers (~100 KB)
  if (isWin) {
    for (const candidate of candidates) {
      try {
        if (fs.existsSync(candidate)) {
          const stat = fs.statSync(candidate);
          if (stat.isFile() && stat.size >= 1024 * 1024) {
            return candidate;
          }
        }
      } catch (_e) {}
    }
  }

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return candidate;
      }
    } catch (_e) {
      // Ignore inaccessible candidate
    }
  }
  return null;
}

function bundleSidecars() {
  fs.mkdirSync(targetDir, { recursive: true });

  // 1. Remove unused cloudflared binaries and cross-OS POSIX sidecars on Windows
  const excludedNames = ['cloudflared.exe', 'cloudflared'];
  if (process.platform === 'win32') {
    excludedNames.push('yt-dlp', 'ffmpeg', 'ffprobe');
  }
  for (const unusedName of excludedNames) {
    const unusedPath = path.join(targetDir, unusedName);
    if (fs.existsSync(unusedPath)) {
      fs.unlinkSync(unusedPath);
      console.log(`🧹 Excluded unused sidecar: ${unusedName}`);
    }
  }

  // 2. Ensure tuneflow.js CLI entrypoint is present in targetDir
  const srcTuneflowJs = path.join(ROOT, 'bin', 'tuneflow.js');
  const destTuneflowJs = path.join(targetDir, 'tuneflow.js');
  if (fs.existsSync(srcTuneflowJs) && path.resolve(srcTuneflowJs) !== path.resolve(destTuneflowJs)) {
    fs.copyFileSync(srcTuneflowJs, destTuneflowJs);
  }

  // 3. Copy yt-dlp (and optionally ffmpeg) into targetDir if not already present
  const sidecarNames = ['yt-dlp'];
  if (includeFfmpeg) {
    sidecarNames.push('ffmpeg');
  }

  for (const name of sidecarNames) {
    const isWin = process.platform === 'win32';
    const exeName = isWin ? `${name}.exe` : name;
    const destPath = path.join(targetDir, exeName);
    if (!fs.existsSync(destPath)) {
      const candidate = findLocalBinaryCandidate(name);
      if (candidate) {
        fs.copyFileSync(candidate, destPath);
        console.log(`📦 Bundled sidecar ${exeName} from ${candidate}`);
      }
    }
  }

  // 4. Generate SHA256SUMS.json for all files in targetDir
  const entries = fs.readdirSync(targetDir);
  const binaries = {};
  for (const entry of entries) {
    if (entry === 'SHA256SUMS.json' || entry === 'cloudflared.exe' || entry === 'cloudflared') {
      continue;
    }
    const fullPath = path.join(targetDir, entry);
    try {
      const stat = fs.statSync(fullPath);
      if (stat.isFile()) {
        binaries[entry] = computeFileSha256(fullPath);
      }
    } catch (_e) {
      // Skip unreadable file
    }
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    platform: process.platform,
    arch: process.arch,
    binaries
  };

  const manifestPath = path.join(targetDir, 'SHA256SUMS.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`✅ Wrote sidecar manifest: ${manifestPath} (${Object.keys(binaries).length} files)`);
}

bundleSidecars();
