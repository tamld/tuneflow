const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const queue = require('../src/engine/queue');
const { sanitizeTitle } = queue;
const { DOWNLOADS_DIR, TEMP_DIR } = require('../src/config');

test('EDGE CASE: sanitizeTitle handles Vietnamese diacritics and Unicode correctly', () => {
  const input = 'Trịnh Công Sơn - Hạ Trắng (Bản Thu Trước 1975) & Dạ Cổ Hoài Lang';
  const output = sanitizeTitle(input);
  assert.strictEqual(output, 'Trịnh Công Sơn - Hạ Trắng (Bản Thu Trước 1975) & Dạ Cổ Hoài Lang');
});

test('EDGE CASE: sanitizeTitle truncates extremely long titles (>200 chars) to <= 120 chars', () => {
  const longTitle = 'Nhạc Vàng Hải Ngoại '.repeat(20) + 'Tuyển Tập Bất Hủ Đi Cùng Năm Tháng';
  assert.ok(longTitle.length > 250);
  const sanitized = sanitizeTitle(longTitle);
  assert.ok(sanitized.length <= 120);
  assert.ok(sanitized.startsWith('Nhạc Vàng'));
});

test('EDGE CASE: sanitizeTitle removes Windows reserved device names', () => {
  assert.strictEqual(sanitizeTitle('CON'), 'Song_CON');
  assert.strictEqual(sanitizeTitle('aux'), 'Song_aux');
  assert.strictEqual(sanitizeTitle('nul'), 'Song_nul');
  assert.strictEqual(sanitizeTitle('prn'), 'Song_prn');
  assert.strictEqual(sanitizeTitle('COM1'), 'Song_COM1');
  assert.strictEqual(sanitizeTitle('lpt2'), 'Song_lpt2');
});

test('EDGE CASE: sanitizeTitle strips illegal characters and trailing dots/spaces', () => {
  const illegal = 'Bài Hát: Tình Lỡ / Đoạn Tuyệt * Áo Cưới Em Màu Tím ? <Đặc Biệt> | Số 1... ';
  const clean = sanitizeTitle(illegal);
  assert.ok(!clean.includes(':'));
  assert.ok(!clean.includes('/'));
  assert.ok(!clean.includes('*'));
  assert.ok(!clean.includes('?'));
  assert.ok(!clean.includes('<'));
  assert.ok(!clean.includes('>'));
  assert.ok(!clean.includes('|'));
  assert.ok(!clean.endsWith('.'));
  assert.ok(!clean.endsWith(' '));
});

test('EDGE CASE: Deduplication marks pre-existing downloaded MP3 as completed instantly', () => {
  const testTitle = 'Mock_Deduplication_Track_Test';
  const testMp3Path = path.join(DOWNLOADS_DIR, `${testTitle}.mp3`);

  // Create dummy mp3 file > 50KB to simulate pre-existing download
  const dummyBuffer = Buffer.alloc(65536, 'A');
  fs.writeFileSync(testMp3Path, dummyBuffer);

  try {
    const item = queue.add({
      url: 'https://www.youtube.com/watch?v=mock_dedup_01',
      title: testTitle,
      uploader: 'Test Singer',
      format: 'mp3'
    });

    assert.strictEqual(item.status, 'completed');
    assert.strictEqual(item.progress, 100);
    assert.strictEqual(item.completedFilePath, testMp3Path);
  } finally {
    // Cleanup dummy file
    if (fs.existsSync(testMp3Path)) {
      fs.unlinkSync(testMp3Path);
    }
  }
});

test('EDGE CASE: cleanupOldFiles removes files older than maxAge while preserving fresh ones', () => {
  const oldFile = path.join(DOWNLOADS_DIR, 'test_old_expired.mp3');
  const newFile = path.join(DOWNLOADS_DIR, 'test_fresh_keep.mp3');

  fs.writeFileSync(oldFile, 'old data');
  fs.writeFileSync(newFile, 'new data');

  // Backdate old file to 30 hours ago
  const thirtyHoursAgo = (Date.now() - (30 * 60 * 60 * 1000)) / 1000;
  fs.utimesSync(oldFile, thirtyHoursAgo, thirtyHoursAgo);

  try {
    const deletedCount = queue.cleanupOldFiles(24); // max 24 hours
    assert.ok(deletedCount >= 1);
    assert.ok(!fs.existsSync(oldFile), 'Old file should be deleted');
    assert.ok(fs.existsSync(newFile), 'Fresh file should be kept');
  } finally {
    if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
    if (fs.existsSync(newFile)) fs.unlinkSync(newFile);
  }
});
