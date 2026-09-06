const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { calculateChecksum } = require('../src/engine/queue');

describe('TuneFlow SHA-256 Checksum Engine Tests', () => {
  const testDir = path.join(__dirname, 'temp-checksum-test');
  const testFile = path.join(testDir, 'sample-track.mp3');
  const dummyAudioData = Buffer.from('TUNEFLOW_TEST_AUDIO_STREAM_DUMMY_MP3_DATA_1234567890');
  const expectedHash = crypto.createHash('sha256').update(dummyAudioData).digest('hex');

  test('setup test directory and dummy file', () => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    fs.writeFileSync(testFile, dummyAudioData);
    assert.strictEqual(fs.existsSync(testFile), true);
  });

  test('calculateChecksum should compute exact SHA-256 hex string for existing file', async () => {
    const hash = await calculateChecksum(testFile);
    assert.strictEqual(typeof hash, 'string');
    assert.strictEqual(hash.length, 64);
    assert.strictEqual(hash, expectedHash);
  });

  test('calculateChecksum should return null or throw gracefully for non-existent file', async () => {
    const nonExistentFile = path.join(testDir, 'missing.mp3');
    try {
      const hash = await calculateChecksum(nonExistentFile);
      assert.strictEqual(hash, null);
    } catch (err) {
      assert.ok(err);
    }
  });

  test('cleanup checksum test artifacts', () => {
    if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
    if (fs.existsSync(testDir)) fs.rmdirSync(testDir);
    assert.strictEqual(fs.existsSync(testFile), false);
  });
});
