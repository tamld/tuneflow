const { spawn } = require('child_process');
const fs = require('fs');

/**
 * Convert any media file to pristine 320kbps MP3 with embedded metadata
 */
function convertToMp3(inputPath, outputPath, metadata = {}) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(inputPath)) {
      return reject(new Error(`Tệp đầu vào không tồn tại: ${inputPath}`));
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

    const process = spawn('ffmpeg', args, {
      windowsHide: true
    });

    let stderr = '';

    process.stderr.on('data', (data) => {
      stderr += data.toString('utf8');
    });

    process.on('close', (code) => {
      if (code === 0 && fs.existsSync(outputPath)) {
        resolve(outputPath);
      } else {
        reject(new Error(`Lỗi chuyển đổi sang MP3: ${stderr.slice(-300)}`));
      }
    });

    process.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Stream audio chunks directly from stdin to 320kbps MP3 without intermediate temp files (Issue #21)
 */
function pipeToMp3(inputStream, outputPath, metadata = {}) {
  return new Promise((resolve, reject) => {
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

    const proc = spawn('ffmpeg', args, {
      windowsHide: true,
      stdio: ['pipe', 'ignore', 'pipe']
    });

    let stderr = '';
    proc.stderr.on('data', (data) => {
      stderr += data.toString('utf8');
    });

    proc.on('close', (code) => {
      if (code === 0 && fs.existsSync(outputPath)) {
        resolve(outputPath);
      } else {
        reject(new Error(`Lỗi chuyển đổi sang MP3 từ stream: ${stderr.slice(-300)}`));
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });

    inputStream.pipe(proc.stdin);
    inputStream.on('error', (err) => {
      try { proc.kill('SIGTERM'); } catch (_e) {}
      reject(err);
    });
  });
}

module.exports = {
  convertToMp3,
  pipeToMp3
};
