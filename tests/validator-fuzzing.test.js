const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { isValidYouTubeUrl, isValidVideoId } = require('../src/utils/validator');
const { sanitizeTitle } = require('../src/engine/queue');

describe('TuneFlow Comprehensive Validation & Security Fuzzing Suite', () => {
  describe('YouTube URL & Domain Whitelist Validation', () => {
    it('should accept valid standard YouTube desktop URLs', () => {
      assert.strictEqual(isValidYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), true);
      assert.strictEqual(isValidYouTubeUrl('https://youtube.com/watch?v=dQw4w9WgXcQ'), true);
      assert.strictEqual(isValidYouTubeUrl('http://www.youtube.com/watch?v=dQw4w9WgXcQ'), true);
    });

    it('should accept valid YouTube shortened, mobile, music, and shorts URLs', () => {
      assert.strictEqual(isValidYouTubeUrl('https://youtu.be/dQw4w9WgXcQ'), true);
      assert.strictEqual(isValidYouTubeUrl('https://m.youtube.com/watch?v=dQw4w9WgXcQ'), true);
      assert.strictEqual(isValidYouTubeUrl('https://music.youtube.com/watch?v=dQw4w9WgXcQ'), true);
      assert.strictEqual(isValidYouTubeUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ'), true);
    });

    it('should accept valid playlist URLs with list parameters', () => {
      assert.strictEqual(isValidYouTubeUrl('https://www.youtube.com/playlist?list=PL1234567890abcdef'), true);
      assert.strictEqual(isValidYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL1234567890abcdef'), true);
    });

    it('should strictly reject malicious SSRF and intranet IP targets', () => {
      assert.strictEqual(isValidYouTubeUrl('http://localhost:3000'), false);
      assert.strictEqual(isValidYouTubeUrl('http://127.0.0.1:8080'), false);
      assert.strictEqual(isValidYouTubeUrl('http://192.168.1.1/admin'), false);
      assert.strictEqual(isValidYouTubeUrl('http://10.0.0.1/secret'), false);
      assert.strictEqual(isValidYouTubeUrl('http://169.254.169.254/latest/meta-data/'), false);
      assert.strictEqual(isValidYouTubeUrl('http://[::1]:80/'), false);
    });

    it('should reject spoofed domains containing youtube keywords', () => {
      assert.strictEqual(isValidYouTubeUrl('https://www.youtube.com.attacker.com/watch?v=123'), false);
      assert.strictEqual(isValidYouTubeUrl('https://attacker-youtube.com/watch?v=123'), false);
      assert.strictEqual(isValidYouTubeUrl('https://fakeyoutu.be/watch?v=123'), false);
    });

    it('should reject non-HTTP protocols, file paths, and malformed attempts', () => {
      assert.strictEqual(isValidYouTubeUrl('file:///etc/passwd'), false);
      assert.strictEqual(isValidYouTubeUrl('javascript:alert(1)'), false);
      assert.strictEqual(isValidYouTubeUrl('data:text/html,test'), false);
      assert.strictEqual(isValidYouTubeUrl('https://youtube.com/watch?v=123; echo hacked'), false);
      assert.strictEqual(isValidYouTubeUrl(''), false);
      assert.strictEqual(isValidYouTubeUrl(null), false);
      assert.strictEqual(isValidYouTubeUrl(undefined), false);
    });
  });

  describe('YouTube Video ID Validation', () => {
    it('should accept valid 11-character base64url YouTube video IDs', () => {
      assert.strictEqual(isValidVideoId('dQw4w9WgXcQ'), true);
      assert.strictEqual(isValidVideoId('_HUpk4c9n2Y'), true);
      assert.strictEqual(isValidVideoId('abc-123_XYZ'), true);
    });

    it('should reject IDs with invalid length or illegal characters', () => {
      assert.strictEqual(isValidVideoId('short'), false);
      assert.strictEqual(isValidVideoId('way_too_long_video_id_12345'), false);
      assert.strictEqual(isValidVideoId('dQw4w9WgXc!'), false);
      assert.strictEqual(isValidVideoId('dQw4w9WgXc '), false);
      assert.strictEqual(isValidVideoId('../../../etc'), false);
      assert.strictEqual(isValidVideoId(''), false);
      assert.strictEqual(isValidVideoId(null), false);
    });
  });

  describe('Sanitize Title OS Filename Fuzzing', () => {
    it('should preserve Vietnamese accented characters and normalize spaces', () => {
      const title = 'Mưa Đêm Tỉnh Nhỏ - Ca Nhạc Tuyển Chọn 2026';
      assert.strictEqual(sanitizeTitle(title), 'Mưa Đêm Tỉnh Nhỏ - Ca Nhạc Tuyển Chọn 2026');
    });

    it('should strip illegal Windows / POSIX file characters', () => {
      const unsafe = 'Song: "Best" *Hits* / 2026 <Vol. 1> | Exclusive?';
      const clean = sanitizeTitle(unsafe);
      assert.ok(!clean.includes(':'));
      assert.ok(!clean.includes('"'));
      assert.ok(!clean.includes('*'));
      assert.ok(!clean.includes('/'));
      assert.ok(!clean.includes('<'));
      assert.ok(!clean.includes('>'));
      assert.ok(!clean.includes('|'));
      assert.ok(!clean.includes('?'));
    });

    it('should guard against Windows reserved device keywords (CON, PRN, AUX, NUL)', () => {
      assert.strictEqual(sanitizeTitle('CON'), 'Song_CON');
      assert.strictEqual(sanitizeTitle('prn'), 'Song_prn');
      assert.strictEqual(sanitizeTitle('AUX'), 'Song_AUX');
      assert.strictEqual(sanitizeTitle('NUL'), 'Song_NUL');
      assert.strictEqual(sanitizeTitle('COM1'), 'Song_COM1');
      assert.strictEqual(sanitizeTitle('lpt3'), 'Song_lpt3');
    });

    it('should strip trailing spaces and periods to prevent Windows file errors', () => {
      assert.strictEqual(sanitizeTitle('My Song...   '), 'My Song');
      assert.strictEqual(sanitizeTitle('Track One. . .'), 'Track One');
    });

    it('should enforce 120-character maximum length boundary', () => {
      const hugeTitle = 'A'.repeat(300);
      const sanitized = sanitizeTitle(hugeTitle);
      assert.ok(sanitized.length <= 120);
      assert.strictEqual(sanitized, 'A'.repeat(120));
    });

    it('should provide sensible fallback for empty or non-string inputs', () => {
      assert.strictEqual(sanitizeTitle(''), 'Bai_hat');
      assert.strictEqual(sanitizeTitle(null), 'Bai_hat');
      assert.strictEqual(sanitizeTitle(undefined), 'Bai_hat');
      assert.strictEqual(sanitizeTitle(12345), 'Bai_hat');
    });
  });
});
