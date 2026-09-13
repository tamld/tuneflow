const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');

describe('Phase 19: 1-Click Zero-Friction Community Ship Suite (RM-46)', () => {

  describe('1. CasaOS AppStore Manifest (docker-compose.casaos.yml)', () => {
    const casaosPath = path.join(REPO_ROOT, 'docker-compose.casaos.yml');

    test('docker-compose.casaos.yml exists on disk', () => {
      assert.ok(fs.existsSync(casaosPath), 'docker-compose.casaos.yml must exist');
    });

    test('docker-compose.casaos.yml contains valid x-casaos metadata', () => {
      const content = fs.readFileSync(casaosPath, 'utf8');

      // Top-level x-casaos metadata
      assert.ok(content.includes('x-casaos:'), 'Must contain top-level x-casaos metadata');
      assert.ok(content.includes('category: "Media"'), 'Must specify category Media');
      assert.ok(content.includes('port_map: "3000"'), 'Must map port 3000');
      assert.ok(content.includes('author: "tamld"'), 'Must specify author');
      assert.ok(content.includes('title:'), 'Must specify title');
      assert.ok(content.includes('icon:'), 'Must specify icon');

      // Multi-arch support
      assert.ok(content.includes('amd64'), 'Must support amd64');
      assert.ok(content.includes('arm64'), 'Must support arm64');

      // Persistent volumes and environment
      assert.ok(content.includes('/app/downloads'), 'Must mount downloads directory');
      assert.ok(content.includes('/app/data'), 'Must mount data directory');
      assert.ok(content.includes('ADMIN_PASSWORD'), 'Must declare ADMIN_PASSWORD');
    });
  });

  describe('2. Unraid Community Applications Template (installer/unraid/tuneflow.xml)', () => {
    const unraidPath = path.join(REPO_ROOT, 'installer', 'unraid', 'tuneflow.xml');

    test('installer/unraid/tuneflow.xml exists on disk', () => {
      assert.ok(fs.existsSync(unraidPath), 'installer/unraid/tuneflow.xml must exist');
    });

    test('tuneflow.xml defines compliant Unraid application schema', () => {
      const content = fs.readFileSync(unraidPath, 'utf8');

      // Core tags
      assert.ok(content.includes('<Name>TuneFlow</Name>'), 'Must define Name');
      assert.ok(content.includes('<Repository>ghcr.io/tamld/tuneflow:latest</Repository>'), 'Must use GHCR latest image');
      assert.ok(content.includes('<Category>MediaApp:Music MediaServer:Music Productivity:</Category>'), 'Must specify music category');
      assert.ok(content.includes('<WebUI>http://[IP]:[PORT:3000]/</WebUI>'), 'Must define WebUI endpoint');

      // Path and volume mappings
      assert.ok(content.includes('<ContainerDir>/app/downloads</ContainerDir>'), 'Must map /app/downloads');
      assert.ok(content.includes('<ContainerDir>/app/data</ContainerDir>'), 'Must map /app/data');
      assert.ok(content.includes('<ContainerPort>3000</ContainerPort>'), 'Must expose port 3000');
    });
  });

  describe('3. Production Compose Suite & Watchtower Auto-Update Profile', () => {
    const composePath = path.join(REPO_ROOT, 'docker-compose.yml');

    test('docker-compose.yml defines watchtower under auto-update profile', () => {
      const content = fs.readFileSync(composePath, 'utf8');

      assert.ok(content.includes('watchtower:'), 'Must define watchtower service');
      assert.ok(content.includes('profiles:'), 'Must define compose profiles');
      assert.ok(content.includes('auto-update'), 'Must include auto-update profile');
      assert.ok(content.includes('containrrr/watchtower'), 'Must use containrrr/watchtower image');
      assert.ok(content.includes('/var/run/docker.sock'), 'Must mount docker socket');
      assert.ok(content.includes('WATCHTOWER_POLL_INTERVAL=43200'), 'Must poll every 12 hours');
    });

    test('docker-compose.yml maintains persistent volume integrity', () => {
      const content = fs.readFileSync(composePath, 'utf8');

      assert.ok(content.includes('./downloads:/app/downloads'), 'Must preserve ./downloads volume');
      assert.ok(content.includes('./data:/app/data'), 'Must preserve ./data volume');
      assert.ok(content.includes('healthcheck:'), 'Must define container healthcheck');
    });
  });
});
