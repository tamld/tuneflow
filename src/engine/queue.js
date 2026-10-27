const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { TEMP_DIR, DOWNLOADS_DIR, MAX_DOWNLOADS, MAX_RETRIES, DOWNLOAD_TTL_HOURS, MAX_STORAGE_MB, YTDLP_COOKIES_PATH, YTDLP_PROXY, YTDLP_EXTRACTOR_ARGS } = require('../config');
const { convertToMp3 } = require('./ffmpeg');
const { supportsJsRuntimes } = require('./ytdlp');
const { resolveSidecarBinary, getSanitizedEnv } = require('../security/binary_guard');
const { processManager } = require('./process_manager');

/**
 * Sanitize titles for all operating systems (Windows, Linux, macOS)
 * Strips reserved characters, control codes, Windows device names, and limits length
 */
function sanitizeTitle(rawTitle) {
  if (!rawTitle || typeof rawTitle !== 'string') return 'Bai_hat';
  
  // Replace illegal OS chars \ / : * ? " < > | and control characters
  let clean = rawTitle.replace(/[\\/:*?"<>|\x00-\x1f\x7f]/g, '_').trim();
  
  // Truncate to maximum 120 chars to avoid ENAMETOOLONG
  if (clean.length > 120) {
    clean = clean.substring(0, 120).trim();
  }

  // Strip trailing periods and spaces (invalid on Windows)
  clean = clean.replace(/[. ]+$/, '');

  // Guard against Windows reserved device names: CON, PRN, AUX, NUL, COM1-9, LPT1-9
  const reservedRegex = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
  if (reservedRegex.test(clean)) {
    clean = `Song_${clean}`;
  }

  return clean || 'Bai_hat';
}

/**
 * Calculate SHA-256 checksum of a file
 * @param {string} filePath 
 * @returns {Promise<string|null>} Hex string of SHA-256 hash or null if not found
 */
async function calculateChecksum(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return new Promise((resolve, reject) => {
    try {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      stream.on('error', (err) => reject(err));
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
    } catch (err) {
      reject(err);
    }
  });
}

const ELDERLY_STATUS_MAP = {
  queued: {
    vi: 'Đang chờ tải',
    en: 'Waiting to download'
  },
  downloading: {
    vi: 'Đang tải về máy...',
    en: 'Downloading to device...'
  },
  converting: {
    vi: 'Đang chuẩn bị bản nhạc MP3...',
    en: 'Converting to MP3...'
  },
  completed: {
    vi: 'Đã tải xong hoàn tất',
    en: 'Successfully downloaded'
  },
  failed: {
    vi: 'Chưa tải được (Bố Mẹ bấm Thử lại nhé)',
    en: 'Failed (tap Retry to try again)'
  },
  cancelled: {
    vi: 'Đã dừng tải',
    en: 'Download cancelled'
  }
};

class DownloadQueue {
  constructor() {
    this.items = new Map(); // id -> item
    this.activeProcesses = new Map(); // id -> ChildProcess
    this.sseClients = new Set();
    this.isPaused = false;
    this.isProcessing = false;
    this.lastBroadcast = 0;
    this.broadcastTimer = null;
    this.libraryVersion = 1;

    // Periodic storage cleanup and quota enforcement (runs every hour)
    setInterval(() => this.cleanupOldFiles(), 60 * 60 * 1000).unref();
  }

  shutdown() {
    console.log(`🛑 DownloadQueue: Gracefully terminating ${this.activeProcesses.size} active download processes and ${this.sseClients.size} SSE client streams...`);
    if (this.broadcastTimer) {
      clearTimeout(this.broadcastTimer);
      this.broadcastTimer = null;
    }
    for (const [_id, proc] of this.activeProcesses.entries()) {
      processManager.killProcessTree(proc, 'SIGKILL', 'queue_shutdown');
    }
    this.activeProcesses.clear();
    processManager.killAll('queue_shutdown');
    for (const client of this.sseClients) {
      try {
        client.end();
      } catch (_e) {}
    }
    this.sseClients.clear();
  }

  add(itemData) {
    const id = itemData.id || `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const sanitizedTitle = sanitizeTitle(itemData.title);
    const finalMp3Path = path.join(DOWNLOADS_DIR, `${sanitizedTitle}.mp3`);

    // Deduplication check: If file already exists and is healthy (>50KB), instantly complete
    const isPreExisting = fs.existsSync(finalMp3Path) && fs.statSync(finalMp3Path).size > 50000;
    
    const item = {
      id,
      url: itemData.url,
      title: itemData.title || 'Đang xác định tên...',
      sanitizedTitle,
      uploader: itemData.uploader || 'Nghệ sĩ',
      thumbnail: itemData.thumbnail || '',
      duration: itemData.duration || 0,
      format: itemData.format || 'mp3',
      status: isPreExisting ? 'completed' : 'queued', // queued | downloading | converting | completed | failed | cancelled
      progress: isPreExisting ? 100 : 0,
      speed: '',
      eta: '',
      error: null,
      retries: 0,
      createdAt: new Date().toISOString(),
      completedFilePath: isPreExisting ? finalMp3Path : null,
      checksum: null
    };

    this.items.set(id, item);
    this.broadcast();
    if (!isPreExisting) {
      this.processNext();
    }
    return item;
  }

  addBatch(items, format = 'mp3') {
    if (!Array.isArray(items) || items.length === 0) return [];
    const queuedItems = [];
    for (const entry of items) {
      const item = this.add({
        id: entry.id,
        url: entry.url,
        title: entry.title,
        uploader: entry.uploader || entry.channel,
        thumbnail: entry.thumbnail,
        duration: entry.duration,
        format: format
      });
      queuedItems.push(item);
    }
    return queuedItems;
  }

  cleanupOldFiles(maxAgeHours = DOWNLOAD_TTL_HOURS) {
    const now = Date.now();
    const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
    let deletedCount = 0;

    try {
      if (fs.existsSync(DOWNLOADS_DIR)) {
        const files = fs.readdirSync(DOWNLOADS_DIR);
        for (const file of files) {
          if (file === 'temp') continue;
          const fullPath = path.join(DOWNLOADS_DIR, file);
          try {
            const stat = fs.statSync(fullPath);
            if (stat.isFile() && (now - stat.mtimeMs > maxAgeMs)) {
              fs.unlinkSync(fullPath);
              deletedCount++;
            }
          } catch {
            // Concurrent deletion or inaccessible file, safe to skip
          }
        }
      }

      if (fs.existsSync(TEMP_DIR)) {
        const tempFiles = fs.readdirSync(TEMP_DIR);
        for (const file of tempFiles) {
          const fullPath = path.join(TEMP_DIR, file);
          try {
            const stat = fs.statSync(fullPath);
            if (stat.isFile() && (now - stat.mtimeMs > 6 * 60 * 60 * 1000)) {
              fs.unlinkSync(fullPath);
              deletedCount++;
            }
          } catch {
            // Concurrent deletion or inaccessible file, safe to skip
          }
        }
      }
    } catch (e) {
      console.error('Lỗi khi dọn dẹp bộ nhớ tạm:', e.message);
    }
    this.enforceStorageQuota();
    return deletedCount;
  }

  /**
   * Enforces MAX_STORAGE_MB quota using FIFO (removes oldest files first)
   */
  enforceStorageQuota(maxQuotaMb = MAX_STORAGE_MB) {
    let prunedCount = 0;
    try {
      if (!fs.existsSync(DOWNLOADS_DIR)) return 0;
      const files = fs.readdirSync(DOWNLOADS_DIR)
        .filter(f => f.endsWith('.mp3') || f.endsWith('.mp4') || f.endsWith('.m4a'))
        .map(file => {
          const fullPath = path.join(DOWNLOADS_DIR, file);
          try {
            const stat = fs.statSync(fullPath);
            return { name: file, fullPath, size: stat.size, mtimeMs: stat.mtimeMs };
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      const totalBytes = files.reduce((acc, f) => acc + f.size, 0);
      const quotaBytes = (maxQuotaMb || 2048) * 1024 * 1024;

      if (totalBytes > quotaBytes) {
        // FIFO: Sort oldest modified first
        files.sort((a, b) => a.mtimeMs - b.mtimeMs);
        let currentBytes = totalBytes;
        const targetBytes = quotaBytes * 0.8; // Prune down to 80% of max

        for (const file of files) {
          if (currentBytes <= targetBytes) break;
          try {
            fs.unlinkSync(file.fullPath);
            currentBytes -= file.size;
            prunedCount++;
          } catch (e) {}
        }
      }
    } catch (e) {
      console.error('Lỗi khi kiểm tra quota đĩa:', e.message);
    }
    return prunedCount;
  }

  get(id) {
    return this.items.get(id);
  }

  getAll() {
    return Array.from(this.items.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  cancel(id) {
    const item = this.items.get(id);
    if (!item) return false;

    if (this.activeProcesses.has(id)) {
      const proc = this.activeProcesses.get(id);
      processManager.killProcessTree(proc, 'SIGKILL', `cancel:${id}`);
      this.activeProcesses.delete(id);
    }
    processManager.killByItemId(id);

    item.status = 'cancelled';
    this.broadcast();
    this.processNext();
    return true;
  }

  /**
   * Safely retries a failed or cancelled queue item.
   * Resets retry counters and progresses back to queued state.
   * @param {string} id
   * @returns {{ ok: boolean, reason?: string, currentStatus?: string, item?: object }}
   */
  retryQueueItem(id) {
    const item = this.items.get(id);
    if (!item) {
      return { ok: false, reason: 'not_found' };
    }

    if (!['failed', 'cancelled'].includes(item.status)) {
      return { ok: false, reason: 'invalid_state', currentStatus: item.status };
    }

    item.status = 'queued';
    item.progress = 0;
    item.error = null;
    item.retries = 0; // Fresh start for manual retry requested by user
    item.speed = '';
    item.eta = '';

    this.broadcast(true);
    this.processNext();
    return { ok: true, item };
  }

  /**
   * Returns a friendly elderly-oriented label and details for a specific item.
   * @param {string} id
   * @param {'vi'|'en'} [lang='vi']
   * @returns {{ ok: boolean, label: string, status: string|null, error?: string|null }}
   */
  getElderlyStatus(id, lang = 'vi') {
    const item = this.items.get(id);
    if (!item) {
      return {
        ok: false,
        label: lang === 'en' ? 'Song not found in queue' : 'Không tìm thấy bài hát trong hàng đợi',
        status: null
      };
    }
    const locale = lang === 'en' ? 'en' : 'vi';
    const entry = ELDERLY_STATUS_MAP[item.status] || {
      vi: item.status,
      en: item.status
    };
    return {
      ok: true,
      label: entry[locale] || entry.vi,
      status: item.status,
      error: item.error || null
    };
  }

  /**
   * Summarizes current queue health into an elderly-friendly digestible message.
   * Does NOT mutate the wire protocol or broadcast payloads.
   * @param {'vi'|'en'} [lang='vi']
   * @returns {{
   *   total: number,
   *   active: number,
   *   queued: number,
   *   completed: number,
   *   failed: number,
   *   cancelled: number,
   *   headline: string,
   *   details: string
   * }}
   */
  getElderlySummary(lang = 'vi') {
    const locale = lang === 'en' ? 'en' : 'vi';
    const all = Array.from(this.items.values());
    const total = all.length;
    const completed = all.filter(i => i.status === 'completed').length;
    const failed = all.filter(i => i.status === 'failed').length;
    const cancelled = all.filter(i => i.status === 'cancelled').length;
    const active = all.filter(i => i.status === 'downloading' || i.status === 'converting').length;
    const queued = all.filter(i => i.status === 'queued').length;

    let headline = '';
    let details = '';

    if (total === 0) {
      headline = locale === 'en' ? 'Queue is empty' : 'Hàng đợi đang trống';
      details = locale === 'en'
        ? 'No songs have been added yet. Tap [Save MP3] to add songs!'
        : 'Chưa có bài hát nào được chọn. Bố Mẹ bấm [Tải Về Máy] để bắt đầu tải nhé!';
    } else if (failed > 0) {
      headline = locale === 'en' ? 'Attention needed' : 'Cần chú ý';
      details = locale === 'en'
        ? `${failed} download(s) could not finish. You can tap [Retry] to try again.`
        : `Có ${failed} bài tải chưa thành công. Bố Mẹ có thể bấm nút [Thử Lại] để máy tải lại nhé!`;
    } else if (active > 0 || queued > 0) {
      headline = locale === 'en' ? 'Downloading in progress' : 'Đang xử lý tải nhạc';
      const inFlight = active + queued;
      details = locale === 'en'
        ? `Currently processing ${inFlight} song(s). Please wait a moment.`
        : `Đang tải ${inFlight} bài hát về máy. Bố Mẹ vui lòng đợi giây lát nhé!`;
    } else if (completed === total) {
      headline = locale === 'en' ? 'All done' : 'Đã tải xong toàn bộ';
      details = locale === 'en'
        ? `All ${completed} song(s) downloaded successfully.`
        : `Tất cả ${completed} bài hát đã được tải xong an toàn về máy của Bố Mẹ.`;
    } else {
      headline = locale === 'en' ? 'Queue updated' : 'Trạng thái hàng đợi';
      details = locale === 'en'
        ? `${completed} finished, ${cancelled} cancelled.`
        : `Đã hoàn tất ${completed} bài, đã dừng ${cancelled} bài.`;
    }

    return {
      total,
      active,
      queued,
      completed,
      failed,
      cancelled,
      headline,
      details
    };
  }

  clearCompleted() {
    for (const [id, item] of this.items.entries()) {
      if (item.status === 'completed' || item.status === 'cancelled' || item.status === 'failed') {
        this.items.delete(id);
      }
    }
    this.broadcast();
  }

  subscribeSSE(res) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    this.sseClients.add(res);
    res.write(`data: ${JSON.stringify(this.getAll())}\n\n`);

    const cleanup = () => {
      this.sseClients.delete(res);
    };

    res.on('close', cleanup);
    res.on('error', cleanup);
  }

  /**
   * Throttles SSE progress broadcasting to prevent CPU exhaustion and event-loop churn
   */
  broadcast(force = false) {
    const now = Date.now();
    if (!force && now - this.lastBroadcast < 300) {
      if (!this.broadcastTimer) {
        this.broadcastTimer = setTimeout(() => {
          this.broadcastTimer = null;
          this.doBroadcast();
        }, 300 - (now - this.lastBroadcast));
        if (this.broadcastTimer && typeof this.broadcastTimer.unref === 'function') {
          this.broadcastTimer.unref();
        }
      }
      return;
    }

    if (this.broadcastTimer) {
      clearTimeout(this.broadcastTimer);
      this.broadcastTimer = null;
    }
    this.doBroadcast();
  }

  doBroadcast() {
    this.lastBroadcast = Date.now();
    if (this.sseClients.size === 0) return;
    const data = JSON.stringify(this.getAll());
    for (const client of this.sseClients) {
      try {
        client.write(`data: ${data}\n\n`);
      } catch (err) {
        this.sseClients.delete(client);
      }
    }
  }

  async processNext() {
    if (this.isPaused || this.isProcessing) return;
    this.isProcessing = true;

    try {
      const activeCount = Array.from(this.items.values()).filter(i => i.status === 'downloading' || i.status === 'converting').length;
      if (activeCount >= MAX_DOWNLOADS) return;

      const nextItem = Array.from(this.items.values()).find(i => i.status === 'queued');
      if (!nextItem) return;

      // Start execution in background, reactively picking next upon completion
      this.executeItem(nextItem).finally(() => {
        this.processNext();
      });

      // If we still have an available slot, dispatch immediately
      if (activeCount + 1 < MAX_DOWNLOADS) {
        setImmediate(() => this.processNext());
      }
    } finally {
      this.isProcessing = false;
    }
  }

  async executeItem(item) {
    item.status = 'downloading';
    item.progress = 5;
    this.broadcast(true);

    // Isolated temp download target
    const tempRawPath = path.join(TEMP_DIR, `${item.id}.%(ext)s`);
    const finalMp3Path = path.join(DOWNLOADS_DIR, `${item.sanitizedTitle}.mp3`);
    let downloadedTempFile = null;

    try {
      // Step 1: Download stream using yt-dlp (keeping partial .part files for resume)
      await new Promise((resolve, reject) => {
        const args = [];
        if (supportsJsRuntimes()) {
          args.push('--js-runtimes', 'node:node');
        }
        if (YTDLP_EXTRACTOR_ARGS) {
          args.push('--extractor-args', YTDLP_EXTRACTOR_ARGS);
        }
        if (YTDLP_COOKIES_PATH && fs.existsSync(YTDLP_COOKIES_PATH)) {
          args.push('--cookies', YTDLP_COOKIES_PATH);
        }
        if (YTDLP_PROXY) {
          args.push('--proxy', YTDLP_PROXY);
        }
        args.push(
          '-f', '140/251/bestaudio/best',
          '--no-playlist',
          '--newline',
          '-o', tempRawPath,
          '--',
          item.url
        );

        const ytdlpBin = resolveSidecarBinary('yt-dlp');
        // A .js yt-dlp path (e.g. a test shim) is not executable on its own, and launching a
        // .cmd/.bat wrapper requires shell: true, which Node 20+ rejects on win32 with spawn
        // EINVAL (CVE-2024-27980 hardening). Run .js targets through the current Node binary
        // instead so no shell is ever needed and the same code path works on every platform.
        const ytdlpIsJs = /\.js$/i.test(ytdlpBin);
        const spawnCommand = ytdlpIsJs ? process.execPath : ytdlpBin;
        const spawnArgs = ytdlpIsJs ? [ytdlpBin, ...args] : args;
        const proc = spawn(spawnCommand, spawnArgs, {
          windowsHide: true,
          detached: process.platform !== 'win32',
          stdio: ['ignore', 'pipe', 'pipe'],
          env: getSanitizedEnv(process.env)
        });
        this.activeProcesses.set(item.id, proc);
        processManager.register(proc, {
          label: 'yt-dlp:download',
          itemId: item.id,
          command: ytdlpBin
        });

        let ytdlpStderr = '';

        proc.stdout.on('data', (data) => {
          const chunk = data.toString('utf8');
          // Parse all yt-dlp percentage matches in chunk: [download] 45.2% of 4.50MiB at 1.20MiB/s ETA 00:02
          const matches = Array.from(chunk.matchAll(/\[download\]\s+(\d+(?:\.\d+)?)%/g));
          if (matches.length > 0) {
            const lastMatch = matches[matches.length - 1];
            const pct = parseFloat(lastMatch[1]);
            item.progress = Math.min(85, Math.max(item.progress || 0, Math.round(pct * 0.85))); // 0-85% for download

            const speedMatches = Array.from(chunk.matchAll(/at\s+([^\s]+)/g));
            if (speedMatches.length > 0) {
              item.speed = speedMatches[speedMatches.length - 1][1];
            }

            const etaMatches = Array.from(chunk.matchAll(/ETA\s+([^\s]+)/g));
            if (etaMatches.length > 0) {
              item.eta = etaMatches[etaMatches.length - 1][1];
            }

            this.broadcast(false);
          }
        });

        proc.stderr.on('data', (data) => {
          ytdlpStderr = (ytdlpStderr + data.toString('utf8')).slice(-2048);
        });

        proc.on('close', (code) => {
          this.activeProcesses.delete(item.id);
          if (code === 0) {
            if ((item.progress || 0) < 85) {
              item.progress = 85;
              this.broadcast(false);
            }
            resolve();
          } else {
            const errDetail = ytdlpStderr.trim() ? `: ${ytdlpStderr.trim().slice(-240)}` : '';
            reject(new Error(`Tải xuống không thành công (mã lỗi ${code})${errDetail}`));
          }
        });

        proc.on('error', (err) => {
          this.activeProcesses.delete(item.id);
          processManager.killProcessTree(proc, 'SIGKILL', 'download_spawn_error');
          reject(err);
        });
      });

      if (item.status === 'cancelled') return;

      // Find the downloaded temp audio file
      const tempFiles = fs.readdirSync(TEMP_DIR).filter(f => f.startsWith(item.id) && !f.endsWith('.part') && !f.endsWith('.ytdl'));
      if (tempFiles.length === 0) {
        throw new Error('Không tìm thấy tệp âm thanh sau khi tải');
      }

      downloadedTempFile = path.join(TEMP_DIR, tempFiles[0]);

      // Step 2: Convert to pristine 320kbps MP3
      item.status = 'converting';
      item.progress = 90;
      this.broadcast(true);

      try {
        await convertToMp3(downloadedTempFile, finalMp3Path, {
          title: item.title,
          artist: item.uploader,
          itemId: item.id,
          durationSec: Number(item.duration) || 0,
          onProcess: (ffmpegProc) => {
            this.activeProcesses.set(item.id, ffmpegProc);
          },
          onProgress: (transcodePct) => {
            const mapped = Math.min(99, Math.max(90, 86 + Math.round((transcodePct / 100) * 13)));
            if (mapped > item.progress) {
              item.progress = mapped;
              this.broadcast(false);
            }
          }
        });
      } finally {
        this.activeProcesses.delete(item.id);
      }

      if (item.status === 'cancelled') return;

      // Step 3: Success! Mark completed & calculate SHA-256 checksum
      try {
        fs.unlinkSync(downloadedTempFile);
      } catch (err) {
        console.warn(`[Temp File Cleanup Warning] Could not remove temp file ${downloadedTempFile}:`, err.message);
      }

      const checksum = await calculateChecksum(finalMp3Path);

      item.status = 'completed';
      item.progress = 100;
      item.completedFilePath = finalMp3Path;
      item.checksum = checksum;
      this.libraryVersion++;
      this.broadcast(true);

      // Enforce storage quota after new file completion
      this.enforceStorageQuota();

    } catch (err) {
      if (item.status === 'cancelled') return;

      // Clean up orphaned downloaded temporary file on failure
      if (downloadedTempFile && fs.existsSync(downloadedTempFile)) {
        try {
          fs.unlinkSync(downloadedTempFile);
        } catch (cleanupErr) {
          console.warn(`[Failure Cleanup Warning] Failed to delete temp file ${downloadedTempFile}:`, cleanupErr.message);
        }
      }

      if (item.retries < MAX_RETRIES) {
        item.retries++;
        item.status = 'queued'; // Re-queue for retry with existing .part file
        item.lastError = err.message || 'Lỗi tạm thời khi xử lý bài hát';
        this.broadcast(true);
      } else {
        item.status = 'failed';
        item.error = err.message || 'Lỗi không xác định khi xử lý bài hát';
        this.broadcast(true);
      }
    }
  }
}

const queueInstance = new DownloadQueue();
queueInstance.sanitizeTitle = sanitizeTitle;
queueInstance.calculateChecksum = calculateChecksum;
queueInstance.DownloadQueue = DownloadQueue;
queueInstance.ELDERLY_STATUS_MAP = ELDERLY_STATUS_MAP;

module.exports = queueInstance;
