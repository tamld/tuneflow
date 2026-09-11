const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { isValidStreamMimeType, isSafeRemoteStreamUrl } = require('../src/utils/validator');

describe('Gate 3: Audio Stream Pipe MIME & SSRF Guard Suite', () => {
  describe('isValidStreamMimeType', () => {
    it('should accept valid audio and video streaming MIME types', () => {
      assert.strictEqual(isValidStreamMimeType('audio/webm'), true);
      assert.strictEqual(isValidStreamMimeType('audio/webm; codecs="opus"'), true);
      assert.strictEqual(isValidStreamMimeType('audio/mp4'), true);
      assert.strictEqual(isValidStreamMimeType('audio/mpeg'), true);
      assert.strictEqual(isValidStreamMimeType('video/webm'), true);
      assert.strictEqual(isValidStreamMimeType('video/mp4'), true);
    });

    it('should reject HTML, JSON, and text MIME types returned during bot-check blocks', () => {
      assert.strictEqual(isValidStreamMimeType('text/html'), false);
      assert.strictEqual(isValidStreamMimeType('text/html; charset=utf-8'), false);
      assert.strictEqual(isValidStreamMimeType('application/json'), false);
      assert.strictEqual(isValidStreamMimeType('text/plain'), false);
      assert.strictEqual(isValidStreamMimeType(''), false);
      assert.strictEqual(isValidStreamMimeType(null), false);
      assert.strictEqual(isValidStreamMimeType(undefined), false);
    });
  });

  describe('isSafeRemoteStreamUrl', () => {
    it('should accept official Google/YouTube CDN streaming hosts', () => {
      assert.strictEqual(
        isSafeRemoteStreamUrl('https://rr1---sn-4g5ednle.googlevideo.com/videoplayback?expire=123'),
        true
      );
      assert.strictEqual(
        isSafeRemoteStreamUrl('https://manifest.googlevideo.com/api/manifest/hls_variant'),
        true
      );
      assert.strictEqual(
        isSafeRemoteStreamUrl('https://www.youtube.com/api/timedtext'),
        true
      );
    });

    it('should strictly reject loopback, private LAN and AWS metadata SSRF endpoints', () => {
      assert.strictEqual(isSafeRemoteStreamUrl('http://127.0.0.1:8080/admin'), false);
      assert.strictEqual(isSafeRemoteStreamUrl('http://localhost:3000/api/health'), false);
      assert.strictEqual(isSafeRemoteStreamUrl('http://192.168.1.1/router-config'), false);
      assert.strictEqual(isSafeRemoteStreamUrl('http://10.0.0.5/internal'), false);
      assert.strictEqual(isSafeRemoteStreamUrl('http://169.254.169.254/latest/meta-data/'), false);
      assert.strictEqual(isSafeRemoteStreamUrl('file:///etc/passwd'), false);
      assert.strictEqual(isSafeRemoteStreamUrl('ftp://example.com/audio.mp3'), false);
    });
  });
});
