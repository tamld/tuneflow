/**
 * Standardized Child Process Lifecycle & Anti-Orphan Supervisor (SPEC-0018)
 *
 * Centralizes registration, PID tracking, cross-platform process-tree termination
 * (Windows `taskkill /T /F` + POSIX `-pid` process group signaling), PID lockfile
 * management, and graceful shutdown cleanup to guarantee zero zombie/orphan processes.
 */

const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { DATA_DIR } = require('../config');

const DEFAULT_PID_FILE = path.join(DATA_DIR || path.resolve(__dirname, '..', '..', 'data'), 'tuneflow.pid');

class ProcessManager {
  constructor() {
    /**
     * Map of pid -> { pid, proc, label, itemId, command, args, startedAt, timer }
     * @type {Map<number, object>}
     */
    this.activeProcesses = new Map();
    this.totalSpawned = 0;
    this.totalTerminated = 0;
    this.totalOrphansKilled = 0;
    this.pidFilePath = DEFAULT_PID_FILE;
  }

  /**
   * Register a spawned ChildProcess for lifecycle tracking and automatic unregistration on exit.
   * @param {import('child_process').ChildProcess} proc
   * @param {object} [meta]
   * @param {string} [meta.label='subprocess']
   * @param {string} [meta.itemId=null]
   * @param {string} [meta.command='']
   * @param {number} [meta.timeoutMs=0]
   * @param {AbortSignal} [meta.signal=null]
   * @returns {import('child_process').ChildProcess}
   */
  register(proc, meta = {}) {
    if (!proc || typeof proc.pid !== 'number') {
      return proc;
    }

    const pid = proc.pid;
    this.totalSpawned++;

    const entry = {
      pid,
      proc,
      label: meta.label || 'subprocess',
      itemId: meta.itemId || null,
      command: meta.command || '',
      startedAt: Date.now(),
      timer: null,
      timedOut: false,
      aborted: false
    };

    if (meta.timeoutMs && meta.timeoutMs > 0) {
      entry.timer = setTimeout(() => {
        entry.timedOut = true;
        this.killProcessTree(proc, 'SIGKILL', `timeout:${meta.timeoutMs}ms`);
      }, meta.timeoutMs);
      if (entry.timer && typeof entry.timer.unref === 'function') {
        entry.timer.unref();
      }
    }

    let onAbort = null;
    if (meta.signal) {
      if (meta.signal.aborted) {
        entry.aborted = true;
        this.killProcessTree(proc, 'SIGKILL', 'abort_signal');
      } else {
        onAbort = () => {
          entry.aborted = true;
          this.killProcessTree(proc, 'SIGKILL', 'abort_signal');
        };
        meta.signal.addEventListener('abort', onAbort, { once: true });
      }
    }

    this.activeProcesses.set(pid, entry);

    const cleanup = () => {
      if (entry.timer) {
        clearTimeout(entry.timer);
        entry.timer = null;
      }
      if (meta.signal && onAbort) {
        try {
          meta.signal.removeEventListener('abort', onAbort);
        } catch (_e) {}
      }
      if (this.activeProcesses.has(pid)) {
        this.activeProcesses.delete(pid);
        this.totalTerminated++;
      }
    };

    proc.once('close', cleanup);
    proc.once('error', cleanup);

    return proc;
  }

  /**
   * Kill an entire process tree cross-platform (prevents Windows PyInstaller / FFmpeg orphans
   * and POSIX detached process-group leaks).
   * @param {import('child_process').ChildProcess | number} procOrPid
   * @param {string} [signal='SIGKILL']
   * @param {string} [_reason='manual']
   * @returns {boolean}
   */
  killProcessTree(procOrPid, signal = 'SIGKILL', _reason = 'manual') {
    const proc = typeof procOrPid === 'object' && procOrPid !== null ? procOrPid : null;
    const pid = proc ? proc.pid : (typeof procOrPid === 'number' ? procOrPid : null);

    if (!pid || pid <= 0) {
      return false;
    }

    let killed = false;

    if (process.platform === 'win32') {
      try {
        // Use taskkill /T (tree) /F (force) to terminate PyInstaller bootloader + child python/ffmpeg
        const result = spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], {
          windowsHide: true,
          stdio: 'ignore',
          timeout: 3000
        });
        if (result && result.status === 0) {
          killed = true;
        }
      } catch (_e) {}

      if (proc && typeof proc.kill === 'function') {
        try {
          proc.kill(signal);
          killed = true;
        } catch (_e) {}
      } else if (!killed) {
        try {
          process.kill(pid, signal);
          killed = true;
        } catch (_e) {}
      }
    } else {
      // POSIX: Kill process group (-pid) first if detached, then direct PID
      try {
        process.kill(-pid, signal);
        killed = true;
      } catch (_e) {}

      if (proc && typeof proc.kill === 'function') {
        try {
          proc.kill(signal);
          killed = true;
        } catch (_e) {}
      } else {
        try {
          process.kill(pid, signal);
          killed = true;
        } catch (_e) {}
      }
    }

    const entry = this.activeProcesses.get(pid);
    if (entry) {
      if (entry.timer) {
        clearTimeout(entry.timer);
        entry.timer = null;
      }
      this.activeProcesses.delete(pid);
      this.totalTerminated++;
    }

    return killed;
  }

  /**
   * Kill all active processes associated with a specific queue itemId (both yt-dlp and ffmpeg).
   * @param {string} itemId
   * @returns {number} Number of processes terminated
   */
  killByItemId(itemId) {
    if (!itemId) return 0;
    let count = 0;
    for (const [pid, entry] of Array.from(this.activeProcesses.entries())) {
      if (entry.itemId === itemId) {
        this.killProcessTree(entry.proc || pid, 'SIGKILL', `cancel_item:${itemId}`);
        count++;
      }
    }
    return count;
  }

  /**
   * Terminate all registered active child processes (used during graceful shutdown or stdin EOF).
   * @param {string} [reason='shutdown']
   * @returns {number} Number of processes terminated
   */
  killAll(reason = 'shutdown') {
    let count = 0;
    for (const [pid, entry] of Array.from(this.activeProcesses.entries())) {
      this.killProcessTree(entry.proc || pid, 'SIGKILL', reason);
      count++;
    }
    this.activeProcesses.clear();
    return count;
  }

  /**
   * Count active processes, optionally filtered by label prefix.
   * @param {string} [labelPrefix]
   * @returns {number}
   */
  getActiveCount(labelPrefix = '') {
    if (!labelPrefix) return this.activeProcesses.size;
    let count = 0;
    for (const entry of this.activeProcesses.values()) {
      if (entry.label && entry.label.startsWith(labelPrefix)) {
        count++;
      }
    }
    return count;
  }

  /**
   * Return a serializable snapshot of all active child processes and supervisor metrics.
   * @returns {object}
   */
  getSnapshot() {
    const now = Date.now();
    const active = [];
    for (const entry of this.activeProcesses.values()) {
      active.push({
        pid: entry.pid,
        label: entry.label,
        itemId: entry.itemId,
        runtimeMs: now - entry.startedAt
      });
    }
    return {
      parentPid: process.pid,
      activeCount: active.length,
      totalSpawned: this.totalSpawned,
      totalTerminated: this.totalTerminated,
      totalOrphansKilled: this.totalOrphansKilled,
      activeProcesses: active
    };
  }

  /**
   * Check if a process PID is currently alive in the OS process table.
   * @param {number} pid
   * @returns {boolean}
   */
  isPidAlive(pid) {
    if (!pid || typeof pid !== 'number' || pid <= 0) return false;
    try {
      process.kill(pid, 0);
      return true;
    } catch (err) {
      return err && err.code === 'EPERM';
    }
  }

  /**
   * Write current server PID lockfile and detect any stale lockfile from a prior unclean exit.
   * @param {string} [customPath]
   * @returns {{ pid: number, pidFile: string, stalePidCleaned: number | null }}
   */
  writePidFile(customPath = this.pidFilePath) {
    let stalePidCleaned = null;
    try {
      const dir = path.dirname(customPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (fs.existsSync(customPath)) {
        const raw = fs.readFileSync(customPath, 'utf8').trim();
        const oldData = raw.startsWith('{') ? JSON.parse(raw) : { pid: parseInt(raw, 10) };
        const oldPid = oldData && typeof oldData.pid === 'number' ? oldData.pid : null;
        if (oldPid && oldPid !== process.pid && !this.isPidAlive(oldPid)) {
          stalePidCleaned = oldPid;
        }
      }
      const payload = JSON.stringify({
        pid: process.pid,
        startedAt: new Date().toISOString(),
        platform: process.platform
      });
      fs.writeFileSync(customPath, payload, 'utf8');
      this.pidFilePath = customPath;
    } catch (_e) {
      // Non-fatal in read-only environments
    }
    return { pid: process.pid, pidFile: customPath, stalePidCleaned };
  }

  /**
   * Remove PID lockfile if owned by the current process.
   * @param {string} [customPath]
   * @returns {boolean}
   */
  removePidFile(customPath = this.pidFilePath) {
    try {
      if (!fs.existsSync(customPath)) return false;
      const raw = fs.readFileSync(customPath, 'utf8').trim();
      const data = raw.startsWith('{') ? JSON.parse(raw) : { pid: parseInt(raw, 10) };
      if (!data.pid || data.pid === process.pid) {
        fs.unlinkSync(customPath);
        return true;
      }
    } catch (_e) {}
    return false;
  }
}

const processManager = new ProcessManager();

module.exports = {
  ProcessManager,
  processManager,
  spawn
};
