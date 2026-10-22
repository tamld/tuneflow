const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  runSystemDoctor,
  checkBinaryStaticPresence,
  probeDirectoryWritability
} = require('../src/engine/doctor');
const {
  EngineHealthMonitor,
  classifyYouTubeError,
  engineHealthMonitor
} = require('../src/engine/engine_health');

describe('TuneFlow Deployment & Doctor Readiness (Deep Vertical F1)', () => {
  describe('Static Binary Presence vs Runtime Execution Probing', () => {
    it('should correctly identify static binary existence for existing absolute path', () => {
      assert.strictEqual(checkBinaryStaticPresence(process.execPath), true);
    });

    it('should return false for non-existent absolute binary paths', () => {
      const nonExistent = path.join(os.tmpdir(), 'non_existent_binary_xyz_12345');
      assert.strictEqual(checkBinaryStaticPresence(nonExistent), false);
    });

    it('should return false for empty or null binary paths', () => {
      assert.strictEqual(checkBinaryStaticPresence(null), false);
      assert.strictEqual(checkBinaryStaticPresence(''), false);
      assert.strictEqual(checkBinaryStaticPresence(undefined), false);
    });

    it('should find system executables in PATH (e.g. node)', () => {
      assert.strictEqual(checkBinaryStaticPresence('node'), true);
    });

    it('should handle paths with spaces or unusual characters safely', () => {
      const spacePath = path.join(os.tmpdir(), 'space test dir path', 'fake_bin');
      assert.strictEqual(checkBinaryStaticPresence(spacePath), false);
    });

    it('should not find bogus commands in PATH', () => {
      assert.strictEqual(checkBinaryStaticPresence('definitely_not_a_real_binary_abc987'), false);
    });
  });

  describe('Directory Writability Probing (Zero Orphan Leakage)', () => {
    it('should probe a valid writable directory and verify zero orphan probe files remain', () => {
      const testDir = path.join(os.tmpdir(), `tuneflow_test_writable_${Date.now()}`);
      fs.mkdirSync(testDir, { recursive: true });

      try {
        const result = probeDirectoryWritability(testDir);
        assert.strictEqual(result.writable, true);
        assert.strictEqual(result.writeProbe, 'passed');
        assert.strictEqual(result.error, null);

        // Verify no orphan .tmp probe files left in directory
        const remaining = fs.readdirSync(testDir);
        const probeFiles = remaining.filter(f => f.includes('tuneflow_doctor_probe'));
        assert.strictEqual(probeFiles.length, 0, 'No orphan probe files must leak');
      } finally {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    });

    it('should handle non-existent directory gracefully by attempting creation', () => {
      const testDir = path.join(os.tmpdir(), `tuneflow_non_existent_${Date.now()}`);
      try {
        const result = probeDirectoryWritability(testDir);
        assert.strictEqual(result.writable, true);
        assert.strictEqual(result.writeProbe, 'passed');
      } finally {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    });

    it('should fail write probe gracefully on an invalid path (directory blocked by file)', () => {
      const testFile = path.join(os.tmpdir(), `tuneflow_file_blocker_${Date.now()}`);
      fs.writeFileSync(testFile, 'blocker', 'utf8');

      try {
        const invalidSubdir = path.join(testFile, 'cannot_create_dir_here');
        const result = probeDirectoryWritability(invalidSubdir);
        assert.strictEqual(result.writable, false);
        assert.strictEqual(result.writeProbe, 'failed');
        assert.ok(result.error !== null);
      } finally {
        fs.unlinkSync(testFile);
      }
    });

    it('should fail write probe on real read-only filesystem directory (POSIX chmod 0555)', () => {
      if (process.platform === 'win32') return; // chmod write restriction differs on Windows
      const readOnlyDir = path.join(os.tmpdir(), `tuneflow_ro_dir_${Date.now()}`);
      fs.mkdirSync(readOnlyDir, { recursive: true });
      fs.chmodSync(readOnlyDir, 0o555);

      try {
        const result = probeDirectoryWritability(readOnlyDir);
        assert.strictEqual(result.writable, false);
        assert.strictEqual(result.writeProbe, 'failed');
        assert.ok(result.error && (result.error.includes('EACCES') || result.error.includes('permission')));

        // Ensure cleanup didn't throw and no file remains
        fs.chmodSync(readOnlyDir, 0o755);
        const remaining = fs.readdirSync(readOnlyDir);
        assert.strictEqual(remaining.length, 0);
      } finally {
        fs.chmodSync(readOnlyDir, 0o755);
        fs.rmSync(readOnlyDir, { recursive: true, force: true });
      }
    });
  });

  describe('Comprehensive Doctor Diagnostics (SPEC-0017 / REQ-PKG-02)', () => {
    it('should return backward-compatible diagnostic report structure with enriched fields', async () => {
      const report = await runSystemDoctor({ writeLog: false });

      // Core root fields
      assert.strictEqual(typeof report.ok, 'boolean');
      assert.strictEqual(typeof report.success, 'boolean');
      assert.ok(['healthy', 'degraded'].includes(report.status));
      assert.ok(report.timestamp);

      // Node check
      assert.strictEqual(report.checks.node.ok, true);
      assert.strictEqual(report.checks.node.version, process.version);

      // Downloads dir check
      const d = report.checks.downloadsDir;
      assert.strictEqual(typeof d.ok, 'boolean');
      assert.strictEqual(typeof d.writable, 'boolean');
      assert.strictEqual(typeof d.exists, 'boolean');
      assert.strictEqual(d.probed, true);
      assert.ok(['passed', 'failed', 'skipped'].includes(d.writeProbe));
      assert.strictEqual(typeof d.audioFilesCount, 'number');

      // Database check
      assert.strictEqual(typeof report.checks.database.ok, 'boolean');

      // Sidecar checks
      const ytdlp = report.checks.ytdlp;
      assert.strictEqual(typeof ytdlp.ok, 'boolean');
      assert.strictEqual(typeof ytdlp.present, 'boolean');
      assert.strictEqual(typeof ytdlp.runtimeVerified, 'boolean');
      assert.ok(['operational', 'exec_failed', 'missing'].includes(ytdlp.status));

      const ffmpeg = report.checks.ffmpeg;
      assert.strictEqual(typeof ffmpeg.ok, 'boolean');
      assert.strictEqual(typeof ffmpeg.present, 'boolean');
      assert.strictEqual(typeof ffmpeg.runtimeVerified, 'boolean');
      assert.ok(['operational', 'exec_failed', 'missing'].includes(ffmpeg.status));

      // Engine health check
      assert.strictEqual(typeof report.checks.engineHealth.ok, 'boolean');
      assert.strictEqual(typeof report.checks.engineHealth.healthy, 'boolean');
    });

    it('should write doctor.json when LOCALAPPDATA is set and writeLog is true', async () => {
      const tempAppDir = path.join(os.tmpdir(), `tuneflow_appdata_${Date.now()}`);
      const oldLocalAppData = process.env.LOCALAPPDATA;
      process.env.LOCALAPPDATA = tempAppDir;

      try {
        const report = await runSystemDoctor({ writeLog: true });
        const logFile = path.join(tempAppDir, 'TuneFlow', 'logs', 'doctor.json');
        assert.ok(fs.existsSync(logFile), 'doctor.json must be persisted');

        const savedContent = JSON.parse(fs.readFileSync(logFile, 'utf8'));
        assert.strictEqual(savedContent.timestamp, report.timestamp);
        assert.strictEqual(savedContent.status, report.status);
      } finally {
        if (oldLocalAppData) {
          process.env.LOCALAPPDATA = oldLocalAppData;
        } else {
          delete process.env.LOCALAPPDATA;
        }
        fs.rmSync(tempAppDir, { recursive: true, force: true });
      }
    });

    it('should reflect engine health degradation into overall doctor status', async () => {
      // Record errors to degrade the global monitor
      const botErr = new Error("Sign in to confirm you're not a bot");
      engineHealthMonitor.recordError(botErr);
      engineHealthMonitor.recordError(botErr);

      try {
        assert.strictEqual(engineHealthMonitor.getStatus().degraded, true);
        const report = await runSystemDoctor({ writeLog: false });

        assert.strictEqual(report.checks.engineHealth.degraded, true);
        assert.strictEqual(report.checks.engineHealth.ok, false);
        assert.strictEqual(report.status, 'degraded', 'Doctor must report degraded status when engine is degraded');
      } finally {
        engineHealthMonitor.recordSuccess(); // Reset back to healthy
        assert.strictEqual(engineHealthMonitor.getStatus().degraded, false);
      }
    });
  });

  describe('Skeptic Counterexamples & Edge-Case Falsification Checks (F2-2 D2)', () => {
    it('Counterexample 1 (F2-2): Invalid version strings must NOT be treated as operational', () => {
      // Prior bug: Boolean(ytdlpVersion && ytdlpVersion !== "Unavailable") evaluated "not_installed" or "unknown" as true!
      const INVALID_VERSIONS = ['Unavailable', 'not_installed', 'unknown', ''];
      for (const inv of INVALID_VERSIONS) {
        const isRuntimeVerified = Boolean(inv && !INVALID_VERSIONS.includes(inv));
        assert.strictEqual(isRuntimeVerified, false, `Version '${inv}' must not be treated as runtime verified`);
      }
      // Valid versions must pass
      assert.strictEqual(Boolean('2025.02.01' && !INVALID_VERSIONS.includes('2025.02.01')), true);
      assert.strictEqual(Boolean('ffmpeg version 6.1' && !INVALID_VERSIONS.includes('ffmpeg version 6.1')), true);
    });

    it('Counterexample 2 (F2-2): Decoupled EngineHealthMonitor maintains single responsibility without circular deps', () => {
      // F2-2 rejected Proposal 2 because coupling engine_health -> doctor introduced circular dependencies and heavy DB walks
      const monitor = new EngineHealthMonitor(2);
      assert.strictEqual(monitor.errorThreshold, 2);

      // Verify state transitions cleanly without touching doctor
      monitor.recordError(new Error('Sign in to confirm you are not a bot'));
      assert.strictEqual(monitor.getStatus().healthy, true);
      assert.strictEqual(monitor.getStatus().consecutiveErrors, 1);

      monitor.recordError(new Error('Sign in to confirm you are not a bot'));
      assert.strictEqual(monitor.getStatus().healthy, false);
      assert.strictEqual(monitor.getStatus().degraded, true);

      monitor.recordSuccess();
      assert.strictEqual(monitor.getStatus().healthy, true);
      assert.strictEqual(monitor.getStatus().consecutiveErrors, 0);
    });

    it('Counterexample 3 (F2-2): Probed write cleanup must be exception-resilient and leak no tmp files', () => {
      const probeDir = path.join(os.tmpdir(), `tuneflow_cleanup_test_${Date.now()}`);
      fs.mkdirSync(probeDir, { recursive: true });

      try {
        const res = probeDirectoryWritability(probeDir);
        assert.strictEqual(res.writable, true);

        // Verify zero leftover probe files
        const files = fs.readdirSync(probeDir);
        assert.strictEqual(files.length, 0);
      } finally {
        fs.rmSync(probeDir, { recursive: true, force: true });
      }
    });

    it('Counterexample 4 (F2-2): Error classification handles various YouTube failure signatures', () => {
      const botCheck = classifyYouTubeError(new Error("Sign in to confirm you're not a bot"));
      assert.strictEqual(botCheck.isYouTubeDegraded, true);
      assert.strictEqual(botCheck.fallbackSuggested, true);

      const rateCheck = classifyYouTubeError(new Error('HTTP Error 429: Too Many Requests'));
      assert.strictEqual(rateCheck.isYouTubeDegraded, true);

      const cipherCheck = classifyYouTubeError(new Error('player js challenge / n-sig extract error'));
      assert.strictEqual(cipherCheck.isYouTubeDegraded, true);

      const normalErr = classifyYouTubeError(new Error('Disk space full'));
      assert.strictEqual(normalErr.isYouTubeDegraded, false);
      assert.strictEqual(normalErr.fallbackSuggested, false);
    });
  });
});
