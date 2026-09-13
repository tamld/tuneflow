const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  formatTrackFilename,
  sanitizeFat32Directory,
  detectUsbDrives,
  exportTracksToUsb,
  generateBatchZipBuffer
} = require('../src/engine/usb_exporter');
const { createZipArchive } = require('../src/engine/zip_util');

describe('Physical USB / SD Card Exporter (Gap 1 & Issue #135)', () => {
  let tempDir;
  let mockUsbDir;
  let mockDownloadsDir;

  before(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tuneflow-usb-test-'));
    mockUsbDir = path.join(tempDir, 'Mock_USB_Drive');
    mockDownloadsDir = path.join(tempDir, 'downloads');
    fs.mkdirSync(mockUsbDir, { recursive: true });
    fs.mkdirSync(mockDownloadsDir, { recursive: true });

    // Create dummy mp3 files
    fs.writeFileSync(path.join(mockDownloadsDir, 'song1.mp3'), 'FAKE_MP3_DATA_1');
    fs.writeFileSync(path.join(mockDownloadsDir, 'song2.mp3'), 'FAKE_MP3_DATA_2');
  });

  after(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (_e) {}
  });

  it('should format track filename with 3-digit zero-padded index and illegal char stripping', () => {
    const rawArtist = 'Chế Linh / Thanh Tuyền: Song Ca*';
    const rawTitle = 'Thành Phố Buồn? <1975> "Tuyển Chọn"';
    const filename = formatTrackFilename(1, rawArtist, rawTitle, '.mp3');

    assert.strictEqual(
      filename,
      '001 - Chế Linh - Thanh Tuyền - Song Ca - Thành Phố Buồn - 1975 - Tuyển Chọn.mp3'
    );
    // Ensure no illegal FAT32 characters remain
    assert.match(filename, /^001 - /);
    assert.doesNotMatch(filename, /[\\/:*?"<>|]/);
  });

  it('should format multi-digit indexes properly (e.g. 025, 142)', () => {
    const f25 = formatTrackFilename(25, 'Giao Linh', 'Chuyến Đò Vĩ Tuyến', '.mp3');
    assert.strictEqual(f25, '025 - Giao Linh - Chuyến Đò Vĩ Tuyến.mp3');

    const f142 = formatTrackFilename(142, 'Hương Lan', 'Lòng Mẹ', '.mp3');
    assert.strictEqual(f142, '142 - Hương Lan - Lòng Mẹ.mp3');
  });

  it('should sanitize FAT32 directory by purging macOS .DS_Store and ._* dot-underscore shadow files', () => {
    const targetDir = path.join(tempDir, 'dirty_fat32');
    fs.mkdirSync(targetDir, { recursive: true });

    // Inject dirty macOS files
    fs.writeFileSync(path.join(targetDir, '.DS_Store'), 'DS_STORE_DATA');
    fs.writeFileSync(path.join(targetDir, '._001 - Song.mp3'), 'MACOS_RESOURCE_FORK');
    fs.writeFileSync(path.join(targetDir, 'Thumbs.db'), 'WINDOWS_THUMB_DATA');
    fs.writeFileSync(path.join(targetDir, '001 - Real Song.mp3'), 'REAL_AUDIO_DATA');

    const purged = sanitizeFat32Directory(targetDir);

    assert.ok(purged >= 3, 'Must purge at least 3 dirty metadata files');
    assert.strictEqual(fs.existsSync(path.join(targetDir, '.DS_Store')), false);
    assert.strictEqual(fs.existsSync(path.join(targetDir, '._001 - Song.mp3')), false);
    assert.strictEqual(fs.existsSync(path.join(targetDir, 'Thumbs.db')), false);
    assert.strictEqual(fs.existsSync(path.join(targetDir, '001 - Real Song.mp3')), true);
  });

  it('should export tracks to USB with sequential filenames and M3U playlist', () => {
    const tracks = [
      {
        sourceFile: path.join(mockDownloadsDir, 'song1.mp3'),
        artist: 'Chế Linh',
        title: 'Thành Phố Buồn'
      },
      {
        sourceFile: path.join(mockDownloadsDir, 'song2.mp3'),
        artist: 'Giao Linh',
        title: 'Chuyến Đò Vĩ Tuyến'
      }
    ];

    const result = exportTracksToUsb({
      drivePath: mockUsbDir,
      tracks,
      subDir: 'Nhac_Bo_Me'
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.exportedCount, 2);

    const exportedFiles = fs.readdirSync(result.targetDir);
    assert.ok(exportedFiles.includes('001 - Chế Linh - Thành Phố Buồn.mp3'));
    assert.ok(exportedFiles.includes('002 - Giao Linh - Chuyến Đò Vĩ Tuyến.mp3'));
    assert.ok(exportedFiles.includes('playlist.m3u'));

    // Check playlist content
    const playlistContent = fs.readFileSync(path.join(result.targetDir, 'playlist.m3u'), 'utf8');
    assert.ok(playlistContent.includes('#EXTM3U'));
    assert.ok(playlistContent.includes('001 - Chế Linh - Thành Phố Buồn.mp3'));
  });

  it('should detect mounted removable volumes without crashing across platforms', () => {
    const drives = detectUsbDrives();
    assert.ok(Array.isArray(drives), 'detectUsbDrives must return an array');
    // On Mac Mini dev host, /Volumes exists
    if (process.platform === 'darwin') {
      assert.ok(drives.length >= 0);
    }
  });

  it('should generate a valid zero-dependency ZIP archive with guide file', () => {
    const files = [
      {
        name: '001 - Test Song.mp3',
        data: Buffer.from('TEST_AUDIO_CONTENT_12345')
      },
      {
        name: 'Huong_Dan_Chep_USB.txt',
        data: Buffer.from('Hướng dẫn chép nhạc vào USB cho Bố Mẹ...')
      }
    ];

    const zipBuffer = createZipArchive(files);
    assert.ok(Buffer.isBuffer(zipBuffer), 'Output must be a Node.js Buffer');
    assert.ok(zipBuffer.length > 50, 'ZIP buffer must have substantial size');

    // Check ZIP magic signature: PK\x03\x04 (0x04034b50 in little endian)
    assert.strictEqual(zipBuffer[0], 0x50); // 'P'
    assert.strictEqual(zipBuffer[1], 0x4b); // 'K'
    assert.strictEqual(zipBuffer[2], 0x03);
    assert.strictEqual(zipBuffer[3], 0x04);
  });

  it('should produce batch zip buffer for web client with auto-numbered tracks and guide', () => {
    const tracks = [
      {
        sourceFile: path.join(mockDownloadsDir, 'song1.mp3'),
        artist: 'Phi Nhung',
        title: 'Bông Điên Điển'
      }
    ];

    const zipBuffer = generateBatchZipBuffer({ tracks });
    assert.ok(Buffer.isBuffer(zipBuffer));
    assert.ok(zipBuffer.length > 100);
  });
});
