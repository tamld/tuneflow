#!/usr/bin/env node

/**
 * TuneFlow Executable Desktop Runner
 *
 * Usage:
 *   tuneflow               # Starts server & opens default browser
 *   tuneflow --no-browser  # Starts server without opening browser
 *   tuneflow --port 8080   # Starts server on custom port
 *   tuneflow --version     # Displays current version
 *   tuneflow --help        # Displays help information
 */

const path = require('path');
const fs = require('fs');
const { launch } = require('../src/desktop/launcher');

const pkgPath = path.resolve(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
TuneFlow v${pkg.version} - Elderly-Friendly YouTube Music Downloader & Player

Usage:
  tuneflow [options]

Options:
  --port <number>     Port to bind (default: 3000, auto-increments if busy)
  --no-browser        Do not automatically open default browser on start
  --version, -v       Print current version and exit
  --help, -h          Show this help message and exit
`);
  process.exit(0);
}

if (args.includes('--version') || args.includes('-v')) {
  console.log(`v${pkg.version}`);
  process.exit(0);
}

let port = null;
const portIdx = args.indexOf('--port');
if (portIdx !== -1 && args[portIdx + 1]) {
  port = parseInt(args[portIdx + 1], 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    console.error(`❌ Invalid port number: ${args[portIdx + 1]}`);
    process.exit(1);
  }
}

const autoOpenBrowser = !args.includes('--no-browser');

// Sidecar lifeline: Auto-exit cleanly if parent process pipe terminates
if (!autoOpenBrowser) {
  process.stdin.resume();
  process.stdin.on('end', () => {
    process.exit(0);
  });
}

// Run desktop launcher
launch({ port, autoOpenBrowser }).catch((err) => {
  console.error(`💥 Failed to launch TuneFlow Desktop:`, err.message);
  process.exit(1);
});
