#!/usr/bin/env node
'use strict';

/**
 * TuneFlow Flat Production Dependency Bundler
 * Copies only runtime dependencies (express, cors, and their transitive packages)
 * into dist/win-unpacked/node_modules with all pnpm symlinks dereferenced.
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const targetSubdir = process.argv[2] || path.join('dist', 'win-unpacked', 'node_modules');
const outMods = path.resolve(root, targetSubdir);

fs.mkdirSync(outMods, { recursive: true });

const rootPkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const queue = Object.keys(rootPkg.dependencies || {}).map((name) => ({ name, from: root }));
const visited = new Set();

while (queue.length > 0) {
  const { name, from } = queue.shift();
  if (visited.has(name)) continue;

  let pkgJsonPath;
  try {
    pkgJsonPath = require.resolve(`${name}/package.json`, { paths: [from, root] });
  } catch (err) {
    const pnpmHoisted = path.join(root, 'node_modules', '.pnpm', 'node_modules', name, 'package.json');
    if (fs.existsSync(pnpmHoisted)) {
      pkgJsonPath = pnpmHoisted;
    } else {
      throw err;
    }
  }

  const realDir = fs.realpathSync(path.dirname(pkgJsonPath));
  const destDir = path.join(outMods, name);
  fs.mkdirSync(path.dirname(destDir), { recursive: true });
  fs.cpSync(realDir, destDir, { recursive: true, dereference: true });
  visited.add(name);

  const depPkg = JSON.parse(fs.readFileSync(path.join(realDir, 'package.json'), 'utf8'));
  for (const child of Object.keys(depPkg.dependencies || {})) {
    if (!visited.has(child)) {
      queue.push({ name: child, from: realDir });
    }
  }
}

console.log(`   Bundled ${visited.size} production runtime packages into ${targetSubdir}.`);
