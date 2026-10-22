/**
 * TuneFlow Persistent Operational Logger (Bộ Log Vận Hành)
 *
 * Writes structured JSONL operational telemetry to:
 *   - macOS: ~/Library/Application Support/TuneFlow/logs/tuneflow.log
 *   - Windows: %LOCALAPPDATA%\TuneFlow\logs\tuneflow.log
 *   - Linux: ~/.local/share/tuneflow/logs/tuneflow.log
 * And maintains an in-memory ring buffer for real-time inspection via
 * GET /api/system/logs and the in-app Operational Log Viewer.
 */

const fs = require('fs');
const path = require('path');
const { LOGS_DIR } = require('../config');

const MAX_RING_BUFFER = 300;
const MAX_LOG_FILE_BYTES = 5 * 1024 * 1024; // 5 MB rotation threshold

function sanitizeMeta(meta) {
  if (!meta || typeof meta !== 'object') return {};
  const out = {};
  for (const [k, v] of Object.entries(meta)) {
    const lower = k.toLowerCase();
    if (lower.includes('password') || lower.includes('token') || lower.includes('secret') || lower.includes('cookie')) {
      out[k] = '[REDACTED]';
    } else if (typeof v === 'string' && v.length > 500) {
      out[k] = v.slice(0, 500) + '...';
    } else {
      out[k] = v;
    }
  }
  return out;
}

class OperationalLogger {
  constructor(logsDir = LOGS_DIR) {
    this.logsDir = logsDir;
    this.mainLogFile = path.join(this.logsDir, 'tuneflow.log');
    this.stdioLogFile = path.join(this.logsDir, 'server-stdio.log');
    this.doctorLogFile = path.join(this.logsDir, 'doctor.json');
    this.entries = [];
    this.seq = 0;

    this.ensureLogDir();
    this.hydrateRecentFromDisk();
  }

  ensureLogDir() {
    try {
      if (!fs.existsSync(this.logsDir)) {
        fs.mkdirSync(this.logsDir, { recursive: true });
      }
    } catch (_e) {}
  }

  hydrateRecentFromDisk() {
    try {
      if (!fs.existsSync(this.mainLogFile)) return;
      const stat = fs.statSync(this.mainLogFile);
      const readBytes = Math.min(stat.size, 64 * 1024);
      if (readBytes <= 0) return;
      const fd = fs.openSync(this.mainLogFile, 'r');
      const buf = Buffer.alloc(readBytes);
      fs.readSync(fd, buf, 0, readBytes, Math.max(0, stat.size - readBytes));
      fs.closeSync(fd);
      const lines = buf.toString('utf8').split('\n').map(l => l.trim()).filter(Boolean);
      const tail = lines.slice(-100);
      for (const line of tail) {
        try {
          const parsed = JSON.parse(line);
          if (parsed && parsed.timestamp && parsed.level) {
            this.entries.push(parsed);
            if (typeof parsed.id === 'number' && parsed.id > this.seq) {
              this.seq = parsed.id;
            }
          }
        } catch (_e) {}
      }
    } catch (_e) {}
  }

  rotateIfNeeded() {
    try {
      if (!fs.existsSync(this.mainLogFile)) return;
      const stat = fs.statSync(this.mainLogFile);
      if (stat.size >= MAX_LOG_FILE_BYTES) {
        const backup = this.mainLogFile + '.1';
        try {
          if (fs.existsSync(backup)) fs.unlinkSync(backup);
        } catch (_e) {}
        fs.renameSync(this.mainLogFile, backup);
      }
    } catch (_e) {}
  }

  record(level, category, message, meta = {}) {
    const entry = {
      id: ++this.seq,
      timestamp: new Date().toISOString(),
      level: String(level || 'INFO').toUpperCase(),
      category: String(category || 'system'),
      message: String(message || ''),
      meta: sanitizeMeta(meta)
    };

    this.entries.push(entry);
    if (this.entries.length > MAX_RING_BUFFER) {
      this.entries.shift();
    }

    try {
      this.ensureLogDir();
      this.rotateIfNeeded();
      fs.appendFileSync(this.mainLogFile, JSON.stringify(entry) + '\n', 'utf8');
    } catch (_e) {}

    return entry;
  }

  info(category, message, meta = {}) {
    return this.record('INFO', category, message, meta);
  }

  warn(category, message, meta = {}) {
    return this.record('WARN', category, message, meta);
  }

  error(category, message, meta = {}) {
    return this.record('ERROR', category, message, meta);
  }

  getEntries({ limit = 80, level = null, category = null } = {}) {
    const maxLimit = Math.max(1, Math.min(Number(limit) || 80, MAX_RING_BUFFER));
    let list = this.entries.slice();
    if (level && level !== 'ALL') {
      const target = String(level).toUpperCase();
      if (target === 'WARN_ERROR') {
        list = list.filter(e => e.level === 'WARN' || e.level === 'ERROR');
      } else {
        list = list.filter(e => e.level === target);
      }
    }
    if (category && category !== 'ALL') {
      list = list.filter(e => e.category === category);
    }
    return list.slice(-maxLimit).reverse();
  }

  getLogFilePaths() {
    return {
      logsDir: this.logsDir,
      mainLogFile: this.mainLogFile,
      stdioLogFile: this.stdioLogFile,
      doctorLogFile: this.doctorLogFile
    };
  }

  clear() {
    this.entries = [];
    try {
      if (fs.existsSync(this.mainLogFile)) {
        fs.writeFileSync(this.mainLogFile, '', 'utf8');
      }
    } catch (_e) {}
    return this.info('system', 'Đã xóa làm mới nhật ký vận hành (Operational Logs cleared)');
  }
}

const opLogger = new OperationalLogger();

module.exports = {
  OperationalLogger,
  opLogger
};
