/**
 * TuneFlow Physical USB / SD Card Exporter (Issue #135)
 * Bridges the gap between digital homelab and elderly physical music hardware:
 * - Sequential 3-digit numbering (001, 002...) for non-smart MP3 chips
 * - FAT32 sanitation: cleans macOS .DS_Store and ._* dot-underscore shadow files
 * - Standard M3U playlist generation
 * - Offline batch ZIP generation with Vietnamese guide for web clients
 */

const fs = require('fs');
const path = require('path');
const { createZipArchive } = require('./zip_util');

/**
 * Strips illegal FAT32/exFAT characters and normalizes Unicode
 * @param {number} index 1-based track index
 * @param {string} artist Artist name
 * @param {string} title Song title
 * @param {string} [ext='.mp3'] File extension
 * @returns {string} Sanitized sequential filename
 */
function formatTrackFilename(index, artist = '', title = '', ext = '.mp3') {
  const padIndex = String(index).padStart(3, '0');

  const sanitizePart = (str) => {
    return (str || '')
      .normalize('NFC')
      .replace(/[\\/:*?"<>|]/g, ' - ') // Replace illegal FAT32 characters with hyphen
      .replace(/\s+/g, ' ')           // Collapse whitespace
      .replace(/(?:\s*-\s*)+/g, ' - ')// Collapse consecutive hyphens
      .replace(/^[-\s.]+/, '')        // Strip leading punctuation
      .replace(/[-\s.]+$/, '')        // Strip trailing punctuation
      .trim();
  };

  const cleanArtist = sanitizePart(artist);
  const cleanTitle = sanitizePart(title);

  const parts = [cleanArtist, cleanTitle].filter(Boolean);
  let baseName = parts.length > 0 ? `${padIndex} - ${parts.join(' - ')}` : `${padIndex} - Bai Hat`;

  // Final pass: collapse multiple consecutive hyphens or spaces
  baseName = baseName
    .replace(/(?:\s*-\s*)+/g, ' - ')
    .replace(/^[-\s.]+/, '')
    .replace(/[-\s.]+$/, '')
    .trim();

  const cleanExt = ext.startsWith('.') ? ext : `.${ext}`;
  return `${baseName}${cleanExt}`;
}

/**
 * Recursively purges macOS / Windows metadata files that choke FAT32 MP3 players
 * Removes .DS_Store, ._* (AppleDouble), Thumbs.db, .Trashes, .fseventsd
 * @param {string} targetDir
 * @returns {number} Count of removed dirty files
 */
function sanitizeFat32Directory(targetDir) {
  if (!fs.existsSync(targetDir)) return 0;

  let purgedCount = 0;
  const entries = fs.readdirSync(targetDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      if (['.Trashes', '.fseventsd', '.Spotlight-V100'].includes(entry.name)) {
        try {
          fs.rmSync(fullPath, { recursive: true, force: true });
          purgedCount++;
        } catch (_e) {}
      } else {
        purgedCount += sanitizeFat32Directory(fullPath);
      }
    } else if (entry.isFile()) {
      const isDirty = (
        entry.name === '.DS_Store' ||
        entry.name === 'Thumbs.db' ||
        entry.name.startsWith('._')
      );

      if (isDirty) {
        try {
          fs.unlinkSync(fullPath);
          purgedCount++;
        } catch (_e) {}
      }
    }
  }

  return purgedCount;
}

/**
 * Scan for mounted removable USB drives on the server host
 * @returns {Array<{ path: string, name: string, isRemovable: boolean }>}
 */
function detectUsbDrives() {
  const drives = [];
  const platform = process.platform;

  try {
    if (platform === 'darwin') {
      const volumesDir = '/Volumes';
      if (fs.existsSync(volumesDir)) {
        const entries = fs.readdirSync(volumesDir, { withFileTypes: true });
        for (const entry of entries) {
          // Ignore root symlink or system Macintosh HD
          if (entry.name === 'Macintosh HD' || entry.name.startsWith('.')) {
            continue;
          }
          const fullPath = path.join(volumesDir, entry.name);
          drives.push({
            path: fullPath,
            name: entry.name,
            isRemovable: true
          });
        }
      }
    } else if (platform === 'linux') {
      const candidates = ['/media', '/mnt', '/run/media'];
      for (const base of candidates) {
        if (fs.existsSync(base)) {
          const entries = fs.readdirSync(base, { withFileTypes: true });
          for (const entry of entries) {
            const fullPath = path.join(base, entry.name);
            drives.push({
              path: fullPath,
              name: entry.name,
              isRemovable: true
            });
          }
        }
      }
    } else if (platform === 'win32') {
      // Check drive letters D: through Z:
      for (let i = 68; i <= 90; i++) {
        const driveLetter = `${String.fromCharCode(i)}:\\`;
        if (fs.existsSync(driveLetter)) {
          drives.push({
            path: driveLetter,
            name: `USB Drive (${driveLetter})`,
            isRemovable: true
          });
        }
      }
    }
  } catch (_e) {}

  return drives;
}

/**
 * Export tracks directly to a connected USB drive
 * @param {Object} options
 * @param {string} options.drivePath Target USB mount path
 * @param {Array<Object>} options.tracks Array of { sourceFile, artist, title }
 * @param {string} [options.subDir='TuneFlow_Music'] Destination subfolder
 * @returns {Object} Result summary
 */
function exportTracksToUsb({ drivePath, tracks = [], subDir = 'TuneFlow_Music' }) {
  if (!drivePath || !fs.existsSync(drivePath)) {
    throw new Error('Đường dẫn ổ đĩa USB không tồn tại hoặc đã bị rút ra');
  }

  const targetDir = path.join(drivePath, subDir);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const exportedFiles = [];
  const playlistLines = ['#EXTM3U'];

  tracks.forEach((track, idx) => {
    const ext = path.extname(track.sourceFile || '') || '.mp3';
    const destName = formatTrackFilename(idx + 1, track.artist, track.title, ext);
    const destPath = path.join(targetDir, destName);

    if (track.sourceFile && fs.existsSync(track.sourceFile)) {
      fs.copyFileSync(track.sourceFile, destPath);
      exportedFiles.push(destName);
      playlistLines.push(`#EXTINF:-1,${track.artist || ''} - ${track.title || ''}`);
      playlistLines.push(destName);
    }
  });

  // Write M3U playlist
  const playlistPath = path.join(targetDir, 'playlist.m3u');
  fs.writeFileSync(playlistPath, playlistLines.join('\n'), 'utf8');

  // Purge any dirty metadata files
  sanitizeFat32Directory(targetDir);

  return {
    success: true,
    targetDir,
    exportedCount: exportedFiles.length,
    files: exportedFiles,
    playlistPath
  };
}

/**
 * Generate in-memory ZIP buffer with sequential tracks and elderly guide
 * @param {Object} options
 * @param {Array<Object>} options.tracks Array of { sourceFile, artist, title, data }
 * @param {boolean} [options.includeGuide=true]
 * @returns {Buffer} Complete ZIP binary
 */
function generateBatchZipBuffer({ tracks = [], includeGuide = true }) {
  const fileEntries = [];

  tracks.forEach((track, idx) => {
    const ext = path.extname(track.sourceFile || '') || '.mp3';
    const filename = formatTrackFilename(idx + 1, track.artist, track.title, ext);

    let content = null;
    if (track.data) {
      content = track.data;
    } else if (track.sourceFile && fs.existsSync(track.sourceFile)) {
      content = fs.readFileSync(track.sourceFile);
    }

    if (content) {
      fileEntries.push({
        name: filename,
        data: content
      });
    }
  });

  if (includeGuide) {
    const guideText = [
      '====================================================================',
      '   HƯỚNG DẪN CHÉP NHẠC VÀO USB / THẺ NHỚ CHO BỐ MẸ TỪ TUNEFLOW',
      '====================================================================',
      '',
      'Kính gửi Bố Mẹ và Anh/Chị,',
      'Toàn bộ bài hát trong thư mục này đã được TuneFlow sắp xếp và đánh số thứ tự',
      'chuẩn (001, 002, 003...) tương thích 100% với loa đài, thẻ nhớ, đài Craven/BKK,',
      'đầu đĩa ô tô và đài niệm Phật.',
      '',
      'CÁC BƯỚC THỰC HIỆN ĐƠN GIẢN:',
      '1. Cắm USB hoặc Thẻ nhớ vào máy tính.',
      '2. Sao chép (Copy) tất cả các bài hát trong file ZIP này vào USB.',
      '3. Rút an toàn USB và cắm vào Loa / Xe / Đài.',
      '4. Bật nguồn và thưởng thức! Nhạc sẽ tự động phát chuẩn theo đúng danh sách.',
      '',
      'Chúc Bố Mẹ luôn có những phút giây thư thái bên những giai điệu yêu thích!',
      '--------------------------------------------------------------------',
      'TuneFlow — Giai Điệu Yêu Thương Dành Cho Cha Mẹ.'
    ].join('\r\n');

    fileEntries.push({
      name: '000_Huong_Dan_Chep_USB_Cho_Bo_Me.txt',
      data: Buffer.from(guideText, 'utf8')
    });
  }

  return createZipArchive(fileEntries);
}

module.exports = {
  formatTrackFilename,
  sanitizeFat32Directory,
  detectUsbDrives,
  exportTracksToUsb,
  generateBatchZipBuffer
};
