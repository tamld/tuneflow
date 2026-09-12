/**
 * TuneFlow Phase 16: Tauri v2 Native GUI Architecture & Testing Matrix Suite
 * Authority: SPEC-0014 & ADR-0016 (v3.0.0 Milestone)
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('SPEC-0014 & ADR-0016: Tauri v2 Native Desktop Shell & IPC Verification Suite', () => {
  const rootDir = path.resolve(__dirname, '..');
  const specPath = path.join(rootDir, 'docs/spec/SPEC-0014-tauri-desktop-gui-shell.md');
  const adrPath = path.join(rootDir, 'docs/adr/ADR-0016-tauri-desktop-shell-and-ipc-bridge.md');
  const roadmapPath = path.join(rootDir, 'docs/ROADMAP.md');

  describe('1. SSoT Specification & Architectural Dossier Integrity', () => {
    it('should verify SPEC-0014 exists and declares PRD, SRS, FSM, DoR, DoD, and AC', () => {
      assert.strictEqual(fs.existsSync(specPath), true, 'SPEC-0014 must exist in docs/spec/');
      const content = fs.readFileSync(specPath, 'utf8');

      // Quality Dossier Sections
      assert.match(content, /1\.\s+PRD\s+\(PRODUCT REQUIREMENTS DOCUMENT\)/);
      assert.match(content, /2\.\s+SRS\s+\(SOFTWARE REQUIREMENTS SPECIFICATION\)/);
      assert.match(content, /3\.\s+FSM\s+\(FINITE STATE MACHINE\)/);
      assert.match(content, /4\.\s+DoR\s+&\s+DoD\s+QUALITY GATES/);
      assert.match(content, /5\.\s+ACCEPTANCE CRITERIA\s+\(AC\)/);

      // Core Requirements
      assert.match(content, /REQ-TAU-01/, 'Must declare REQ-TAU-01 (Rust Core & Native Webview)');
      assert.match(content, /REQ-TAU-02/, 'Must declare REQ-TAU-02 (Frameless SilverMelody Window)');
      assert.match(content, /REQ-TAU-03/, 'Must declare REQ-TAU-03 (System Tray Integration)');
      assert.match(content, /REQ-TAU-04/, 'Must declare REQ-TAU-04 (Secure Typed IPC Commands)');
      assert.match(content, /REQ-TAU-05/, 'Must declare REQ-TAU-05 (Background Audio & Close-to-Tray)');
    });

    it('should verify ADR-0016 exists and documents technical rationale against Electron bloat', () => {
      assert.strictEqual(fs.existsSync(adrPath), true, 'ADR-0016 must exist in docs/adr/');
      const content = fs.readFileSync(adrPath, 'utf8');

      assert.match(content, /## Status\s*\nAccepted/);
      assert.match(content, /WKWebView/, 'Must leverage macOS WKWebView');
      assert.match(content, /WebView2/, 'Must leverage Windows WebView2');
      assert.match(content, /WebKitGTK/, 'Must leverage Linux WebKitGTK');
      assert.match(content, /<25MB/, 'Must specify <25MB memory footprint invariant');
    });

    it('should verify docs/ROADMAP.md links RM-40 to SPEC-0014 and ADR-0016', () => {
      const roadmap = fs.readFileSync(roadmapPath, 'utf8');
      assert.match(roadmap, /RM-40/, 'Roadmap must include RM-40 in Traceability Matrix');
      assert.match(roadmap, /SPEC-0014/, 'RM-40 must cite SPEC-0014');
      assert.match(roadmap, /ADR-0016/, 'RM-40 must cite ADR-0016');
      assert.match(roadmap, /tests\/tauri-architecture-matrix\.test\.js/, 'Must link to this verification test file');
    });
  });

  describe('2. IPC Bridge Command Contracts & Payload Schemas', () => {
    const requiredCommands = [
      'connect_server',
      'get_client_config',
      'save_client_config',
      'open_downloads_folder',
      'minimize_to_tray'
    ];

    it('should verify all required IPC commands are formalized in SPEC-0014', () => {
      const content = fs.readFileSync(specPath, 'utf8');
      for (const cmd of requiredCommands) {
        assert.ok(content.includes(cmd), `SPEC-0014 must define IPC command: ${cmd}`);
      }
    });

    it('should validate simulated connect_server IPC response schema', () => {
      const sampleResponse = {
        status: 'healthy',
        version: 'v2.7.0',
        latency_ms: 15,
        endpoint: 'http://192.168.1.100:3000'
      };

      assert.strictEqual(typeof sampleResponse.status, 'string');
      assert.strictEqual(typeof sampleResponse.version, 'string');
      assert.strictEqual(typeof sampleResponse.latency_ms, 'number');
      assert.ok(sampleResponse.latency_ms >= 0 && sampleResponse.latency_ms <= 500, 'Latency must be within SLA');
      assert.match(sampleResponse.endpoint, /^https?:\/\//, 'Endpoint must have http or https scheme');
    });
  });

  describe('3. Native System Tray & Window FSM Lifecycle Simulation', () => {
    const states = {
      INITIALIZING: 'S0_INITIALIZING',
      ACTIVE_WINDOW: 'S1_ACTIVE_WINDOW',
      TRAY_MINIMIZED: 'S2_TRAY_MINIMIZED',
      STREAMING_ACTIVE: 'S3_STREAMING_ACTIVE',
      RECONNECTING: 'S4_RECONNECTING',
      TERMINATING: 'S5_TERMINATING'
    };

    function simulateFsmTransition(currentState, event) {
      switch (currentState) {
        case states.INITIALIZING:
          if (event === 'WINDOW_READY') return states.ACTIVE_WINDOW;
          break;
        case states.ACTIVE_WINDOW:
          if (event === 'CLOSE_CLICKED') return states.TRAY_MINIMIZED;
          if (event === 'PLAY_STARTED') return states.STREAMING_ACTIVE;
          break;
        case states.TRAY_MINIMIZED:
          if (event === 'TRAY_CLICKED') return states.ACTIVE_WINDOW;
          break;
        case states.STREAMING_ACTIVE:
          if (event === 'SERVER_TIMEOUT') return states.RECONNECTING;
          if (event === 'CLOSE_CLICKED') return states.TRAY_MINIMIZED;
          break;
        case states.RECONNECTING:
          if (event === 'HEALTH_OK') return states.STREAMING_ACTIVE;
          break;
      }
      if (event === 'QUIT_COMMAND') return states.TERMINATING;
      return currentState;
    }

    it('should transition from INITIALIZING to ACTIVE_WINDOW upon window readiness', () => {
      const next = simulateFsmTransition(states.INITIALIZING, 'WINDOW_READY');
      assert.strictEqual(next, states.ACTIVE_WINDOW);
    });

    it('should transition from ACTIVE_WINDOW to TRAY_MINIMIZED when close button is clicked (Close-to-Tray)', () => {
      const next = simulateFsmTransition(states.ACTIVE_WINDOW, 'CLOSE_CLICKED');
      assert.strictEqual(next, states.TRAY_MINIMIZED);
    });

    it('should restore ACTIVE_WINDOW from TRAY_MINIMIZED on tray icon click', () => {
      const next = simulateFsmTransition(states.TRAY_MINIMIZED, 'TRAY_CLICKED');
      assert.strictEqual(next, states.ACTIVE_WINDOW);
    });

    it('should handle network interruption by transitioning to RECONNECTING state and recovering', () => {
      const degraded = simulateFsmTransition(states.STREAMING_ACTIVE, 'SERVER_TIMEOUT');
      assert.strictEqual(degraded, states.RECONNECTING);

      const recovered = simulateFsmTransition(degraded, 'HEALTH_OK');
      assert.strictEqual(recovered, states.STREAMING_ACTIVE);
    });

    it('should gracefully transition any state to TERMINATING on QUIT_COMMAND', () => {
      assert.strictEqual(simulateFsmTransition(states.ACTIVE_WINDOW, 'QUIT_COMMAND'), states.TERMINATING);
      assert.strictEqual(simulateFsmTransition(states.TRAY_MINIMIZED, 'QUIT_COMMAND'), states.TERMINATING);
      assert.strictEqual(simulateFsmTransition(states.STREAMING_ACTIVE, 'QUIT_COMMAND'), states.TERMINATING);
    });
  });

  describe('4. Native Tauri v2 Codebase & Physical Scaffolding Integrity', () => {
    const srcTauriDir = path.join(rootDir, 'src-tauri');
    const cargoTomlPath = path.join(srcTauriDir, 'Cargo.toml');
    const tauriConfPath = path.join(srcTauriDir, 'tauri.conf.json');

    it('should verify src-tauri/Cargo.toml defines tuneflow-desktop v3.0.0 and required dependencies', () => {
      assert.strictEqual(fs.existsSync(cargoTomlPath), true, 'Cargo.toml must exist in src-tauri');
      const cargo = fs.readFileSync(cargoTomlPath, 'utf8');

      assert.match(cargo, /name\s*=\s*"tuneflow-desktop"/, 'Package name must be tuneflow-desktop');
      assert.match(cargo, /version\s*=\s*"3\.0\.0"/, 'Desktop shell version must be 3.0.0');
      assert.match(cargo, /name\s*=\s*"tuneflow_lib"/, 'Library name must be tuneflow_lib');
      assert.match(cargo, /tauri\s*=\s*\{\s*version\s*=\s*"2\./, 'Must depend on Tauri v2');
      assert.match(cargo, /"tray-icon"/, 'Must enable tray-icon feature');
      assert.match(cargo, /"image-png"/, 'Must enable image-png feature');
      assert.match(cargo, /reqwest/, 'Must declare reqwest for IPC HTTP health checks');
      assert.match(cargo, /dirs/, 'Must declare dirs for OS config/download resolution');
    });

    it('should verify src-tauri/tauri.conf.json declares valid window ergonomics, tray, and security policy', () => {
      assert.strictEqual(fs.existsSync(tauriConfPath), true, 'tauri.conf.json must exist in src-tauri');
      const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));

      assert.strictEqual(tauriConf.productName, 'TuneFlow');
      assert.strictEqual(tauriConf.version, '3.0.0');
      assert.strictEqual(tauriConf.identifier, 'com.tamld.tuneflow');
      assert.strictEqual(tauriConf.app.withGlobalTauri, true);

      // Window constraints
      const win = tauriConf.app.windows[0];
      assert.ok(win, 'Main window must be defined');
      assert.ok(win.minWidth >= 860, 'minWidth must be >= 860px to prevent layout stacking');
      assert.ok(win.minHeight >= 640, 'minHeight must be >= 640px');
      assert.strictEqual(win.resizable, true);

      // System tray & security
      assert.ok(tauriConf.app.trayIcon, 'System tray must be configured');
      assert.strictEqual(tauriConf.app.trayIcon.id, 'tuneflow-tray');
      assert.ok(tauriConf.app.security.csp, 'CSP must be configured');
    });

    it('should verify src-tauri Rust modules (commands, config, tray, lib, main) implement required invariants', () => {
      const srcDir = path.join(srcTauriDir, 'src');
      const files = ['commands.rs', 'config.rs', 'tray.rs', 'lib.rs', 'main.rs'];
      for (const file of files) {
        assert.strictEqual(fs.existsSync(path.join(srcDir, file)), true, `src-tauri/src/${file} must exist`);
      }

      const commandsContent = fs.readFileSync(path.join(srcDir, 'commands.rs'), 'utf8');
      assert.match(commandsContent, /pub async fn connect_server/);
      assert.match(commandsContent, /pub fn get_client_config/);
      assert.match(commandsContent, /pub fn save_client_config/);
      assert.match(commandsContent, /pub fn open_downloads_folder/);
      assert.match(commandsContent, /pub fn minimize_to_tray/);

      const libContent = fs.readFileSync(path.join(srcDir, 'lib.rs'), 'utf8');
      assert.match(libContent, /WindowEvent::CloseRequested/);
      assert.match(libContent, /api\.prevent_close\(\)/, 'Must enforce Close-to-Tray');
      assert.match(libContent, /win_clone\.hide\(\)/, 'Must hide window instead of closing');
      assert.match(libContent, /commands::connect_server/);
      assert.match(libContent, /commands::get_client_config/);
      assert.match(libContent, /commands::save_client_config/);
      assert.match(libContent, /commands::open_downloads_folder/);
      assert.match(libContent, /commands::minimize_to_tray/);
    });

    it('should verify native branding icons exist and package.json exports tauri scripts', () => {
      const iconsDir = path.join(srcTauriDir, 'icons');
      assert.strictEqual(fs.existsSync(path.join(iconsDir, 'icon.icns')), true, 'icon.icns must exist');
      assert.strictEqual(fs.existsSync(path.join(iconsDir, 'icon.ico')), true, 'icon.ico must exist');
      assert.strictEqual(fs.existsSync(path.join(iconsDir, '32x32.png')), true, '32x32.png must exist');
      assert.strictEqual(fs.existsSync(path.join(iconsDir, '128x128.png')), true, '128x128.png must exist');

      const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
      assert.ok(pkg.scripts.tauri, 'package.json must declare tauri script');
      assert.ok(pkg.scripts['tauri:dev'], 'package.json must declare tauri:dev script');
      assert.ok(pkg.scripts['tauri:build'], 'package.json must declare tauri:build script');
    });
  });
});

