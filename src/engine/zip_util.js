/**
 * Zero-Dependency In-Memory ZIP Archive Generator (Issue #135)
 * Standard PKZip 2.0 format implementation using native Node.js zlib & Buffer.
 */

const zlib = require('zlib');

/**
 * Convert JavaScript Date to MS-DOS time and date
 * @param {Date} date
 * @returns {{ time: number, date: number }}
 */
function toDosDateTime(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = Math.floor(date.getSeconds() / 2);

  const dosDate = ((year - 1980) << 9) | (month << 5) | day;
  const dosTime = (hours << 11) | (minutes << 5) | seconds;

  return { time: dosTime, date: dosDate };
}

/**
 * Create a standard ZIP archive from an array of file entries
 * @param {Array<{ name: string, data: Buffer|string }>} files
 * @returns {Buffer} Complete ZIP binary buffer
 */
function createZipArchive(files = []) {
  const localChunks = [];
  const centralChunks = [];
  let offset = 0;
  const { time: dosTime, date: dosDate } = toDosDateTime();

  for (const file of files) {
    const rawData = Buffer.isBuffer(file.data) ? file.data : Buffer.from(file.data || '', 'utf8');
    const nameBuffer = Buffer.from(file.name.replace(/\\/g, '/'), 'utf8');

    // Compress using deflateRaw (no zlib wrapper headers)
    let compressedData;
    let compressionMethod = 0; // Stored (uncompressed) as fallback

    try {
      const deflated = zlib.deflateRawSync(rawData);
      if (deflated.length < rawData.length) {
        compressedData = deflated;
        compressionMethod = 8; // Deflate
      } else {
        compressedData = rawData;
        compressionMethod = 0; // Stored
      }
    } catch (_e) {
      compressedData = rawData;
      compressionMethod = 0;
    }

    const crc = zlib.crc32(rawData);
    const uncompressedSize = rawData.length;
    const compressedSize = compressedData.length;

    // --- Local File Header (30 bytes + filename) ---
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0); // Signature
    localHeader.writeUInt16LE(0x0014, 4);     // Version needed: 2.0
    localHeader.writeUInt16LE(0x0800, 6);     // General purpose bit flag: bit 11 = UTF-8
    localHeader.writeUInt16LE(compressionMethod, 8);
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressedSize, 18);
    localHeader.writeUInt32LE(uncompressedSize, 22);
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0x0000, 28);    // Extra field length

    localChunks.push(localHeader, nameBuffer, compressedData);

    // --- Central Directory Header (46 bytes + filename) ---
    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0); // Signature
    centralHeader.writeUInt16LE(0x0314, 4);     // Made by: Unix / 2.0
    centralHeader.writeUInt16LE(0x0014, 6);     // Version needed: 2.0
    centralHeader.writeUInt16LE(0x0800, 8);     // Bit flag: UTF-8
    centralHeader.writeUInt16LE(compressionMethod, 10);
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compressedSize, 20);
    centralHeader.writeUInt32LE(uncompressedSize, 24);
    centralHeader.writeUInt16LE(nameBuffer.length, 28);
    centralHeader.writeUInt16LE(0x0000, 30);    // Extra field length
    centralHeader.writeUInt16LE(0x0000, 32);    // Comment length
    centralHeader.writeUInt16LE(0x0000, 34);    // Disk number start
    centralHeader.writeUInt16LE(0x0000, 36);    // Internal file attributes
    centralHeader.writeUInt32LE(0x81a40000, 38); // External file attr: -rw-r--r--
    centralHeader.writeUInt32LE(offset, 42);   // Relative offset of local header

    centralChunks.push(centralHeader, nameBuffer);

    offset += 30 + nameBuffer.length + compressedSize;
  }

  const centralDirOffset = offset;
  const centralDirBuffer = Buffer.concat(centralChunks);
  const centralDirSize = centralDirBuffer.length;

  // --- End of Central Directory Record (22 bytes) ---
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // Signature
  eocd.writeUInt16LE(0x0000, 4);     // Disk number
  eocd.writeUInt16LE(0x0000, 6);     // Disk with central dir
  eocd.writeUInt16LE(files.length, 8);  // Entries on this disk
  eocd.writeUInt16LE(files.length, 10); // Total entries
  eocd.writeUInt32LE(centralDirSize, 12);
  eocd.writeUInt32LE(centralDirOffset, 16);
  eocd.writeUInt16LE(0x0000, 20);    // Comment length

  return Buffer.concat([...localChunks, centralDirBuffer, eocd]);
}

module.exports = {
  createZipArchive,
  toDosDateTime
};
