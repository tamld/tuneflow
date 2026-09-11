const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const { convertToMp3, pipeToMp3 } = require('../src/engine/ffmpeg');

describe('Engine: FFmpeg Transcoding Resilience & Atomic Cleanup Suite', () => {
  const tempDir = path.join(__dirname, 'temp_ffmpeg_test');
  const dummyInput = path.join(tempDir, 'dummy_input.webm');
  const dummyOutput = path.join(tempDir, 'dummy_output.mp3');

  beforeEach(() => {
    fs.mkdirSync(tempDir, { recursive: true });
    fs.writeFileSync(dummyInput, 'dummy media content header');
  });

  afterEach(() => {
    delete process.env.MOCK_FFMPEG;
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('convertToMp3 Validation & Core Execution', () => {
    it('should reject invalid or missing inputPath parameter', async () => {
      await assert.rejects(
        () => convertToMp3(null, dummyOutput),
        /Đường dẫn tệp đầu vào không hợp lệ/
      );
      await assert.rejects(
        () => convertToMp3(123, dummyOutput),
        /Đường dẫn tệp đầu vào không hợp lệ/
      );
    });

    it('should reject invalid or missing outputPath parameter', async () => {
      await assert.rejects(
        () => convertToMp3(dummyInput, null),
        /Đường dẫn tệp đầu ra không hợp lệ/
      );
      await assert.rejects(
        () => convertToMp3(dummyInput, ''),
        /Đường dẫn tệp đầu ra không hợp lệ/
      );
    });

    it('should reject when input file does not physically exist', async () => {
      const nonexistent = path.join(tempDir, 'ghost_file.webm');
      await assert.rejects(
        () => convertToMp3(nonexistent, dummyOutput),
        /Tệp đầu vào không tồn tại/
      );
    });

    it('should successfully convert media to MP3 when transcode succeeds', async () => {
      process.env.MOCK_FFMPEG = 'success';
      const result = await convertToMp3(dummyInput, dummyOutput, {
        title: 'Diễm Xưa',
        artist: 'Trịnh Công Sơn'
      });

      assert.strictEqual(result, dummyOutput);
      assert.strictEqual(fs.existsSync(dummyOutput), true, 'Output MP3 must exist');
      const stat = fs.statSync(dummyOutput);
      assert.ok(stat.size > 0, 'Output MP3 must have bytes');
    });

    it('should enforce atomic cleanup of corrupted partial file upon transcode failure', async () => {
      process.env.MOCK_FFMPEG = 'fail';

      await assert.rejects(
        () => convertToMp3(dummyInput, dummyOutput),
        /Lỗi chuyển đổi sang MP3/
      );

      // Verify that no orphaned partial file remains on disk
      assert.strictEqual(fs.existsSync(dummyOutput), false, 'Partial output file must be atomically deleted on failure');
    });

    it('should handle process spawn errors gracefully without uncaught exceptions', async () => {
      process.env.MOCK_FFMPEG = 'spawn_error';

      await assert.rejects(
        () => convertToMp3(dummyInput, dummyOutput),
        /spawn ENOENT/
      );
      assert.strictEqual(fs.existsSync(dummyOutput), false);
    });

    it('should transcode real audio file using FFmpeg subprocess when binary is available', async () => {
      try {
        require('child_process').execSync('ffmpeg -version', { stdio: 'ignore' });
      } catch {
        return; // Skip if in container/CI without ffmpeg
      }

      const wavPath = path.join(tempDir, 'silent.wav');
      const mp3Path = path.join(tempDir, 'converted.mp3');
      require('child_process').execSync(`ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t 0.1 -y "${wavPath}"`, { stdio: 'ignore' });

      delete process.env.MOCK_FFMPEG;
      const res = await convertToMp3(wavPath, mp3Path, { title: 'Test Audio', artist: 'Test Artist' });
      assert.strictEqual(res, mp3Path);
      assert.strictEqual(fs.existsSync(mp3Path), true);
      assert.ok(fs.statSync(mp3Path).size > 100);
    });
  });

  describe('pipeToMp3 Streaming Validation & Error Handling', () => {
    it('should reject when inputStream is invalid or missing pipe method', async () => {
      await assert.rejects(
        () => pipeToMp3(null, dummyOutput),
        /Luồng đầu vào không hợp lệ/
      );
      await assert.rejects(
        () => pipeToMp3({}, dummyOutput),
        /Luồng đầu vào không hợp lệ/
      );
    });

    it('should reject when outputPath is invalid', async () => {
      const stream = Readable.from(['chunk 1', 'chunk 2']);
      await assert.rejects(
        () => pipeToMp3(stream, null),
        /Đường dẫn tệp đầu ra không hợp lệ/
      );
    });

    it('should stream audio chunks to MP3 successfully', async () => {
      process.env.MOCK_FFMPEG = 'success';
      const stream = Readable.from(['audio binary chunk 1', 'chunk 2']);

      const result = await pipeToMp3(stream, dummyOutput, {
        title: 'Bolero Tuyệt Phẩm',
        artist: 'Nhiều Ca Sĩ'
      });

      assert.strictEqual(result, dummyOutput);
      assert.strictEqual(fs.existsSync(dummyOutput), true);
    });

    it('should atomically remove partial file when stream transcode fails', async () => {
      process.env.MOCK_FFMPEG = 'fail';
      const stream = Readable.from(['chunk 1']);

      await assert.rejects(
        () => pipeToMp3(stream, dummyOutput),
        /Lỗi chuyển đổi sang MP3 từ stream/
      );

      assert.strictEqual(fs.existsSync(dummyOutput), false, 'Corrupted stream file must be atomically cleaned up');
    });

    it('should transcode real audio stream to MP3 via pipeToMp3 when binary is available', async () => {
      try {
        require('child_process').execSync('ffmpeg -version', { stdio: 'ignore' });
      } catch {
        return; // Skip if in container/CI without ffmpeg
      }

      const wavPath = path.join(tempDir, 'silent_pipe.wav');
      const mp3Path = path.join(tempDir, 'piped.mp3');
      require('child_process').execSync(`ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t 0.1 -y "${wavPath}"`, { stdio: 'ignore' });

      delete process.env.MOCK_FFMPEG;
      const fileStream = fs.createReadStream(wavPath);
      const res = await pipeToMp3(fileStream, mp3Path, { title: 'Piped Audio', artist: 'Stream Artist' });
      assert.strictEqual(res, mp3Path);
      assert.strictEqual(fs.existsSync(mp3Path), true);
    });
  });
});
