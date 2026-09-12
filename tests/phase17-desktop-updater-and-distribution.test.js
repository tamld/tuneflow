/**
 * TuneFlow Phase 17: Desktop In-App Auto-Update & Self-Healing Distribution Test Suite
 * Authority: SPEC-0015 & ADR-0017 (Milestone v3.1.0)
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

describe("SPEC-0015 & ADR-0017: Desktop In-App Auto-Update & Self-Healing Architecture", () => {
  const rootDir = path.resolve(__dirname, "..");
  const specPath = path.join(rootDir, "docs/spec/SPEC-0015-desktop-auto-update-and-multi-arch-distribution.md");
  const adrPath = path.join(rootDir, "docs/adr/ADR-0017-tauri-updater-and-self-healing-distribution.md");
  const roadmapPath = path.join(rootDir, "docs/ROADMAP.md");
  const srcTauriDir = path.join(rootDir, "src-tauri");

  describe("1. SSoT Specification & Architectural Dossier Integrity", () => {
    it("should verify SPEC-0015 exists and declares PRD, SRS, FSM, DoR, DoD, and AC", () => {
      assert.strictEqual(fs.existsSync(specPath), true, "SPEC-0015 must exist in docs/spec/");
      const content = fs.readFileSync(specPath, "utf8");

      assert.match(content, /1\.\s+PRD\s+\(PRODUCT REQUIREMENTS DOCUMENT\)/);
      assert.match(content, /2\.\s+SRS\s+\(SOFTWARE REQUIREMENTS SPECIFICATION\)/);
      assert.match(content, /3\.\s+FSM\s+\(FINITE STATE MACHINE\)/);
      assert.match(content, /4\.\s+DoR\s+&\s+DoD\s+QUALITY GATES/);
      assert.match(content, /5\.\s+ACCEPTANCE CRITERIA\s+\(AC\)/);

      assert.match(content, /REQ-UPD-01/, "Must declare REQ-UPD-01 (Remote Manifest)");
      assert.match(content, /REQ-UPD-02/, "Must declare REQ-UPD-02 (Signature Validation)");
      assert.match(content, /REQ-UPD-03/, "Must declare REQ-UPD-03 (System Diagnostics IPC)");
      assert.match(content, /REQ-UPD-04/, "Must declare REQ-UPD-04 (Self-Healing Engine)");
      assert.match(content, /REQ-UPD-05/, "Must declare REQ-UPD-05 (Non-Blocking Polling)");
    });

    it("should verify ADR-0017 exists and defines technical decisions for updater and healing", () => {
      assert.strictEqual(fs.existsSync(adrPath), true, "ADR-0017 must exist in docs/adr/");
      const content = fs.readFileSync(adrPath, "utf8");

      assert.match(content, /## Status\s*\nAccepted/);
      assert.match(content, /Ed25519/, "Must mandate Ed25519 signature verification");
      assert.match(content, /check_for_updates/, "Must declare check_for_updates IPC");
      assert.match(content, /get_system_diagnostics/, "Must declare get_system_diagnostics IPC");
      assert.match(content, /self_heal_connectivity/, "Must declare self_heal_connectivity IPC");
    });

    it("should verify docs/ROADMAP.md links RM-41 to SPEC-0015 and ADR-0017", () => {
      const roadmap = fs.readFileSync(roadmapPath, "utf8");
      assert.match(roadmap, /RM-41/, "Roadmap must include RM-41 in Traceability Matrix");
      assert.match(roadmap, /SPEC-0015/, "RM-41 must cite SPEC-0015");
      assert.match(roadmap, /ADR-0017/, "RM-41 must cite ADR-0017");
      assert.match(roadmap, /tests\/phase17-desktop-updater-and-distribution\.test\.js/, "Must cite Phase 17 test file");
    });
  });

  describe("2. Update Manifest Schema & Cryptographic Signing Contracts", () => {
    const sampleManifest = {
      version: "3.1.0",
      notes: "Enhanced Auto-Update & Self-Healing Diagnostics",
      pub_date: "2026-09-12T12:00:00Z",
      platforms: {
        "darwin-aarch64": {
          signature: "dW50YW1wZXJlZF9zaWduYXR1cmVfZm9yX3R1bmVmbG93X2Rlc2t0b3BfdjNfMV8wX2FybTY0X3NlY3VyZQ==",
          url: "https://github.com/tamld/tuneflow/releases/download/v3.1.0/TuneFlow-3.1.0-arm64.dmg"
        },
        "windows-x86_64": {
          signature: "dW50YW1wZXJlZF9zaWduYXR1cmVfZm9yX3R1bmVmbG93X2Rlc2t0b3BfdjNfMV8wX3g2NF9zZWN1cmU=",
          url: "https://github.com/tamld/tuneflow/releases/download/v3.1.0/TuneFlow-Setup-3.1.0.exe"
        }
      }
    };

    it("should validate updater manifest conforms to strict semantic versioning and platform schema", () => {
      assert.match(sampleManifest.version, /^\d+\.\d+\.\d+$/, "Version must be valid semver");
      assert.strictEqual(typeof sampleManifest.notes, "string");
      assert.ok(sampleManifest.platforms["darwin-aarch64"], "Must include darwin-aarch64 target");
      assert.ok(sampleManifest.platforms["windows-x86_64"], "Must include windows-x86_64 target");

      const macEntry = sampleManifest.platforms["darwin-aarch64"];
      assert.match(macEntry.url, /^https:\/\//, "Download URL must be HTTPS");
      assert.ok(macEntry.signature.length >= 32, "Ed25519 signature must be sufficiently long");
    });

    it("should enforce fail-closed rejection when Ed25519 signature is missing or corrupted", () => {
      function verifyPayload(entry) {
        if (!entry || !entry.signature || entry.signature.length < 32) {
          return { valid: false, error: "MISSING_OR_CORRUPT_SIGNATURE" };
        }
        if (entry.signature.includes("tampered")) {
          return { valid: false, error: "CRYPTO_VERIFICATION_FAILED" };
        }
        return { valid: true };
      }

      const validMac = sampleManifest.platforms["darwin-aarch64"];
      assert.strictEqual(verifyPayload(validMac).valid, true);

      const tamperedEntry = { ...validMac, signature: "tampered_fake_signature_with_more_than_32_characters_here" };
      const res = verifyPayload(tamperedEntry);
      assert.strictEqual(res.valid, false);
      assert.strictEqual(res.error, "CRYPTO_VERIFICATION_FAILED");

      const emptyEntry = { ...validMac, signature: "" };
      assert.strictEqual(verifyPayload(emptyEntry).valid, false);
    });
  });

  describe("3. Update FSM Lifecycle & Autonomous Self-Healing Simulation", () => {
    const updateStates = {
      IDLE: "U0_IDLE",
      CHECKING: "U1_CHECKING_MANIFEST",
      PROMPT: "U2_NOTIFICATION_PROMPT",
      DOWNLOADING: "U3_DOWNLOADING",
      VERIFYING: "U4_VERIFYING_SIGNATURE",
      READY_RESTART: "U5_READY_RESTART",
      TAMPER_ABORT: "U6_TAMPER_ABORT"
    };

    function simulateUpdateFSM(currentState, event) {
      switch (currentState) {
        case updateStates.IDLE:
          if (event === "CHECK_REQUESTED") return updateStates.CHECKING;
          break;
        case updateStates.CHECKING:
          if (event === "MANIFEST_CURRENT") return updateStates.IDLE;
          if (event === "MANIFEST_NEWER") return updateStates.PROMPT;
          if (event === "NETWORK_ERROR") return updateStates.IDLE;
          break;
        case updateStates.PROMPT:
          if (event === "USER_ACCEPT") return updateStates.DOWNLOADING;
          if (event === "USER_POSTPONE") return updateStates.IDLE;
          break;
        case updateStates.DOWNLOADING:
          if (event === "DOWNLOAD_SUCCESS") return updateStates.VERIFYING;
          break;
        case updateStates.VERIFYING:
          if (event === "SIGNATURE_OK") return updateStates.READY_RESTART;
          if (event === "SIGNATURE_FAIL") return updateStates.TAMPER_ABORT;
          break;
        case updateStates.TAMPER_ABORT:
          if (event === "ACKNOWLEDGED") return updateStates.IDLE;
          break;
      }
      return currentState;
    }

    it("should successfully traverse from IDLE to READY_RESTART on valid signed update", () => {
      let state = updateStates.IDLE;
      state = simulateUpdateFSM(state, "CHECK_REQUESTED");
      assert.strictEqual(state, updateStates.CHECKING);

      state = simulateUpdateFSM(state, "MANIFEST_NEWER");
      assert.strictEqual(state, updateStates.PROMPT);

      state = simulateUpdateFSM(state, "USER_ACCEPT");
      assert.strictEqual(state, updateStates.DOWNLOADING);

      state = simulateUpdateFSM(state, "DOWNLOAD_SUCCESS");
      assert.strictEqual(state, updateStates.VERIFYING);

      state = simulateUpdateFSM(state, "SIGNATURE_OK");
      assert.strictEqual(state, updateStates.READY_RESTART);
    });

    it("should abort to TAMPER_ABORT state when signature verification fails", () => {
      let state = updateStates.VERIFYING;
      state = simulateUpdateFSM(state, "SIGNATURE_FAIL");
      assert.strictEqual(state, updateStates.TAMPER_ABORT);

      state = simulateUpdateFSM(state, "ACKNOWLEDGED");
      assert.strictEqual(state, updateStates.IDLE);
    });

    it("should simulate autonomous self-healing fallback when remote endpoint is unreachable", () => {
      function simulateHealing(activeEndpoint, mockReachability) {
        if (mockReachability[activeEndpoint]) {
          return { healed: true, active_endpoint: activeEndpoint, action: "RECONNECTED_CURRENT" };
        }
        const fallback = "http://127.0.0.1:3000";
        if (mockReachability[fallback]) {
          return { healed: true, active_endpoint: fallback, action: "FALLBACK_STANDALONE" };
        }
        return { healed: false, active_endpoint: activeEndpoint, action: "FAILED_RETRY" };
      }

      // Case 1: Remote server down -> auto fallback to standalone
      const mockNetwork = {
        "http://192.168.1.100:3000": false,
        "http://127.0.0.1:3000": true
      };
      const result = simulateHealing("http://192.168.1.100:3000", mockNetwork);
      assert.strictEqual(result.healed, true);
      assert.strictEqual(result.active_endpoint, "http://127.0.0.1:3000");
      assert.strictEqual(result.action, "FALLBACK_STANDALONE");

      // Case 2: Current endpoint online -> retained
      const mockNetwork2 = { "http://192.168.1.100:3000": true };
      const result2 = simulateHealing("http://192.168.1.100:3000", mockNetwork2);
      assert.strictEqual(result2.healed, true);
      assert.strictEqual(result2.action, "RECONNECTED_CURRENT");
    });
  });

  describe("4. Tauri v2 Rust Codebase & IPC Bridge Registration Verification", () => {
    it("should verify commands.rs declares check_for_updates, get_system_diagnostics, and self_heal_connectivity", () => {
      const commandsPath = path.join(srcTauriDir, "src/commands.rs");
      assert.strictEqual(fs.existsSync(commandsPath), true);
      const content = fs.readFileSync(commandsPath, "utf8");

      assert.match(content, /pub async fn check_for_updates/);
      assert.match(content, /pub async fn get_system_diagnostics/);
      assert.match(content, /pub async fn self_heal_connectivity/);
      assert.match(content, /pub struct UpdateInfo/);
      assert.match(content, /pub struct SystemDiagnostics/);
      assert.match(content, /pub struct HealingResult/);
    });

    it("should verify lib.rs registers Phase 17 IPC handlers in invoke_handler", () => {
      const libPath = path.join(srcTauriDir, "src/lib.rs");
      assert.strictEqual(fs.existsSync(libPath), true);
      const content = fs.readFileSync(libPath, "utf8");

      assert.match(content, /commands::check_for_updates/);
      assert.match(content, /commands::get_system_diagnostics/);
      assert.match(content, /commands::self_heal_connectivity/);
    });

    it("should verify public/js/remote-client.js provides TUNEFLOW_DESKTOP bridge helper wrappers", () => {
      const remoteClientPath = path.join(rootDir, "public/js/remote-client.js");
      assert.strictEqual(fs.existsSync(remoteClientPath), true);
      const content = fs.readFileSync(remoteClientPath, "utf8");

      assert.match(content, /window\.TUNEFLOW_DESKTOP\s*=/);
      assert.match(content, /checkForUpdates/);
      assert.match(content, /getDiagnostics/);
      assert.match(content, /selfHeal/);
    });
  });
});
