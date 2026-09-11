const { spawn } = require('child_process');
const fs = require('fs');
const { resolveSidecarBinary, getSanitizedEnv } = require('../security/binary_guard');

/**
 * Convert any media file to pristine 320kbps MP3 with embedded metadata
 */
function convertToMp3(inputPath, outputPath, metadata = {}) {
  return new Promise((resolve, reject) => {
    if (!inputPath || typeof inputPath !== 'string') {
      return reject(new Error('Đường dẫn tệp đầu vào không hợp lệ'));
    }

    if (!outputPath || typeof outputPath !== 'string') {
      return reject(new Error('Đường dẫn tệp đầu ra không hợp lệ'));
    }

    if (!fs.existsSync(inputPath)) {
      return reject(new Error(`Tệp đầu vào không tồn tại: ${inputPath}`));
    }

    // Hermetic test mock hook
    if (process.env.MOCK_FFMPEG === 'success') {
      fs.writeFileSync(outputPath, Buffer.from([0xFF, 0xFB, 0x90, 0x64])); // ID3/MP3 header
      return resolve(outputPath);
    }
    if (process.env.MOCK_FFMPEG === 'fail') {
      fs.writeFileSync(outputPath, 'corrupted partial content');
      try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch (_e) {}
      return reject(new Error('Lỗi chuyển đổi sang MP3: simulated transcode failure'));
    }
    if (process.env.MOCK_FFMPEG === 'spawn_error') {
      return reject(new Error('spawn ENOENT: ffmpeg not found'));
    }

    const args = [
      '-y', // Overwrite output without asking
      '-i', inputPath,
      '-vn', // No video
      '-codec:a', 'libmp3lame',
      '-b:a', '320k', // 320kbps high fidelity
      '-ar', '44100' // Standard sample rate
    ];

    if (metadata.title) {
      args.push('-metadata', `title=${metadata.title}`);
    }
    if (metadata.artist) {
      args.push('-metadata', `artist=${metadata.artist}`);
    }

    args.push(outputPath);

    const ffmpegBin = resolveSidecarBinary('ffmpeg');
    const proc = spawn(ffmpegBin, args, {
      windowsHide: true,
      env: getSanitizedEnv(process.env)
    });

    let stderr = '';

    proc.stderr.on('data', (data) => {
      stderr += data.toString('utf8');
    });

    proc.on('close', (code) => {
      if (code === 0 && fs.existsSync(outputPath)) {
        resolve(outputPath);
      } else {
        // Atomic cleanup: remove partial/corrupted output file
        try {
          if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        } catch (_e) {}
        reject(new Error(`Lỗi chuyển đổi sang MP3: ${stderr.slice(-300)}`));
      }
    });

    proc.on('error', (err) => {
      try {
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      } catch (_e) {}
      reject(err);
    });
  });
}

/**
 * Stream audio chunks directly from stdin to 320kbps MP3 without intermediate temp files (Issue #21)
 */
function pipeToMp3(inputStream, outputPath, metadata = {}) {
  return new Promise((resolve, reject) => {
    if (!inputStream || typeof inputStream.pipe !== 'function') {
      return reject(new Error('Luồng đầu vào không hợp lệ'));
    }

    if (!outputPath || typeof outputPath !== 'string') {
      return reject(new Error('Đường dẫn tệp đầu ra không hợp lệ'));
    }

    // Hermetic test mock hook
    if (process.env.MOCK_FFMPEG === 'success') {
      fs.writeFileSync(outputPath, Buffer.from([0xFF, 0xFB, 0x90, 0x64]));
      return resolve(outputPath);
    }
    if (process.env.MOCK_FFMPEG === 'fail') {
      fs.writeFileSync(outputPath, 'corrupted stream partial content');
      try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch (_e) {}
      return reject(new Error('Lỗi chuyển đổi sang MP3 từ stream: simulated stream failure'));
    }

    const args = [
      '-y',
      '-i', 'pipe:0',
      '-vn',
      '-codec:a', 'libmp3lame',
      '-b:a', '320k',
      '-ar', '44100'
    ];

    if (metadata.title) {
      args.push('-metadata', `title=${metadata.title}`);
    }
    if (metadata.artist) {
      args.push('-metadata', `artist=${metadata.artist}`);
    }

    args.push(outputPath);

    const ffmpegBin = resolveSidecarBinary('ffmpeg');
    const proc = spawn(ffmpegBin, args, {
      windowsHide: true,
      stdio: ['pipe', 'ignore', 'pipe'],
      env: getSanitizedEnv(process.env)
    });

    let stderr = '';
    proc.stderr.on('data', (data) => {
      stderr += data.toString('utf8');
    });

    proc.on('close', (code) => {
      if (code === 0 && fs.existsSync(outputPath)) {
        resolve(outputPath);
      } else {
        // Atomic cleanup: remove partial/corrupted output file
        try {
          if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        } catch (_e) {}
        reject(new Error(`Lỗi chuyển đổi sang MP3 từ stream: ${stderr.slice(-300)}`));
      }
    });

    proc.on('error', (err) => {
      try {
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      } catch (_e) {}
      reject(err);
    });

    inputStream.pipe(proc.stdin);
    inputStream.on('error', (err) => {
      try { proc.kill('SIGTERM'); } catch (_e) {}
      try {
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      } catch (_e) {}
      reject(err);
    });
  });
}

module.exports = {
  convertToMp3,
  pipeToMp3
};
