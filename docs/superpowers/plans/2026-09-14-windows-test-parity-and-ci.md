# Windows Test Suite Parity & CI Runner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Achieve 100% native test suite passing on Windows environments (0 failures across all 511+ tests) and expand GitHub Actions CI to continuously verify Windows compatibility.

**Architecture:** Add OS guards for POSIX permissions and bash scripts, enhance child process execution for Windows batch scripts (`npm.cmd`), implement graceful tool fallbacks for missing Python on Windows hosts, establish dedicated Windows packaging tests, and integrate `windows-latest` into `.github/workflows/ci.yml`.

**Tech Stack:** Node.js 22 (`node:test`), Windows PowerShell / CMD, GitHub Actions workflows, Inno Setup 6 specifications.

**Spec:** [docs/spec/SPEC-0011-master-testing-matrix-and-quality-gates.md](file:///C:/Users/Administrator/github/tuneflow/docs/spec/SPEC-0011-master-testing-matrix-and-quality-gates.md) & Issue #137

## Global Constraints
- Zero test regression: All existing 511+ tests must continue to pass on Linux (`ubuntu-latest`) and macOS (`macos-latest`).
- Deterministic teardown and hermetic execution under 10 seconds.
- No live network calls in test suites.
- Strict ESLint compliance with zero warnings.

---

### Task 1: Guard POSIX File Mode Assertions for Windows Compatibility

**Files:**
- Modify: `tests/macos-desktop-packaging.test.js:58-64`
- Modify: `tests/linux-desktop-packaging.test.js:30-36`

**Interfaces:**
- Consumes: `fs.statSync()`, `process.platform`
- Produces: Skipped or bypassed `stat.mode & 0o111` execute bit check on `win32` platform.

- [ ] **Step 1: Inspect failing tests on Windows**
Run: `node --test tests/macos-desktop-packaging.test.js tests/linux-desktop-packaging.test.js`
Expected: Fails on Windows with `AssertionError: package_macos.sh must be executable` and `package_linux.sh must be executable`.

- [ ] **Step 2: Add platform guard to `tests/macos-desktop-packaging.test.js`**
Wrap the `stat.mode & 0o111` assertion with `if (process.platform !== 'win32')`.

- [ ] **Step 3: Add platform guard to `tests/linux-desktop-packaging.test.js`**
Wrap the `stat.mode & 0o111` assertion with `if (process.platform !== 'win32')`.

- [ ] **Step 4: Verify tests pass on Windows**
Run: `node --test tests/macos-desktop-packaging.test.js tests/linux-desktop-packaging.test.js`
Expected: PASS (all tests green).

---

### Task 2: Guard POSIX Bash Script Execution in Headless Server Tests

**Files:**
- Modify: `tests/headless-server-and-launcher.test.js:70-98,119-135,181-196`

**Interfaces:**
- Consumes: `execSync`, `process.platform`
- Produces: Protected execution of `install.sh`, `package_macos.sh`, `package_linux.sh`, `install_macos.sh`, `install_linux.sh` on POSIX hosts, graceful skip on Windows.

- [ ] **Step 1: Check failing tests in headless-server-and-launcher**
Run: `node --test tests/headless-server-and-launcher.test.js`
Expected: Fails on Windows when attempting to invoke bash scripts directly.

- [ ] **Step 2: Update bash script verification tests with platform checks**
In `tests/headless-server-and-launcher.test.js`, wrap the execution of `install.sh --help`, `install.sh --dry-run`, and `bash -n` invocations with `if (process.platform !== 'win32')`. On Windows, verify file existence and read content to assert expected flags/metadata.

- [ ] **Step 3: Verify tests pass**
Run: `node --test tests/headless-server-and-launcher.test.js`
Expected: PASS (all tests green).

---

### Task 3: Fix Windows Batch Execution and Python Detection in CI Preflight Gate

**Files:**
- Modify: `tests/ci-preflight-gate.test.js:48-94,111-131`

**Interfaces:**
- Consumes: `spawnSync` with `{ shell: process.platform === 'win32' }`
- Produces: Reliable `npm ci --dry-run` and `npm audit` execution on Windows; graceful bypass of `gh_safe_post.py` if Python is absent.

- [ ] **Step 1: Run preflight test on Windows**
Run: `node --test tests/ci-preflight-gate.test.js`
Expected: Fails with `spawnSync npm ENOENT` and Python execution errors.

- [ ] **Step 2: Add `shell: process.platform === 'win32'` to npm spawns**
Update `npm ci --dry-run` and `npm audit` spawns to use `shell: process.platform === 'win32'`.

- [ ] **Step 3: Add python availability check before executing python scripts**
Check if Python is available via helper function; skip python execution assertions if Python is not installed.

- [ ] **Step 4: Verify test passes**
Run: `node --test tests/ci-preflight-gate.test.js`
Expected: PASS.

---

### Task 4: Add Python Availability Guard to `tests/gh-safe-post.test.js`

**Files:**
- Modify: `tests/gh-safe-post.test.js:10-25`

**Interfaces:**
- Consumes: `pyCmd` availability check
- Produces: Tests execute when Python interpreter is present; skip gracefully when absent.

- [ ] **Step 1: Verify failure on Windows**
Run: `node --test tests/gh-safe-post.test.js`
Expected: Fails with "Python was not found".

- [ ] **Step 2: Add Python probe helper**
Add `function isPythonWorking()` to probe `spawnSync(pyCmd, ['--version'])`. If false, skip child tests with `t.skip('Python interpreter not available on this host')`.

- [ ] **Step 3: Verify test passes or skips cleanly**
Run: `node --test tests/gh-safe-post.test.js`
Expected: PASS (clean skip on hosts without Python).

---

### Task 5: Add Dedicated Windows Desktop Packaging Test Suite

**Files:**
- Create: `tests/windows-desktop-packaging.test.js`
- Modify: `docs/ROADMAP.md` (Traceability mapping)

**Interfaces:**
- Consumes: `installer/windows/setup.iss`, `packaging/winget/tamld.TuneFlow.yaml`, `packaging/scoop/tuneflow.json`
- Produces: Dedicated test suite verifying Windows Inno Setup wizard, AppUserModelID, zero-admin user scope, URL protocol registration, and package manager manifests.

- [ ] **Step 1: Create `tests/windows-desktop-packaging.test.js`**
Implement the test suite verifying:
- Inno Setup script structure, Zero-Admin privilege, SetupIconFile, Modern wizard style.
- AppUserModelID, URL protocol handler `tuneflow://`, App Paths registry.
- WinGet YAML schema compliance (user scope, silent flags).
- Scoop JSON schema compliance (architecture 64bit, autoupdate, checkver).

- [ ] **Step 2: Run new Windows test suite**
Run: `node --test tests/windows-desktop-packaging.test.js`
Expected: PASS.

---

### Task 6: Add Windows Runner to GitHub Actions CI Matrix

**Files:**
- Modify: `.github/workflows/ci.yml:10-38`

**Interfaces:**
- Consumes: GitHub Actions runner matrix `[ubuntu-latest, windows-latest]`
- Produces: Automated verification on both Linux and Windows for every push and pull request.

- [ ] **Step 1: Update `.github/workflows/ci.yml`**
Configure `strategy.matrix.os: [ubuntu-latest, windows-latest]`.

- [ ] **Step 2: Verify `tests/ci-preflight-gate.test.js` matches the new CI workflow**
Run: `node --test tests/ci-preflight-gate.test.js`
Expected: PASS.

---

### Task 7: Full Verification, Git Branch, PR Creation, and Merge

- [ ] **Step 1: Run full test suite on Windows**
Run: `npm test`
Expected: 511+ tests PASS, 0 FAIL.

- [ ] **Step 2: Run ESLint**
Run: `npm run lint`
Expected: Zero lint errors.

- [ ] **Step 3: Create git branch `fix/issue-137-windows-test-parity`**
- [ ] **Step 4: Commit changes referencing Issue #137**
- [ ] **Step 5: Push branch and create PR with `gh pr create`**
- [ ] **Step 6: Wait for CI checks to pass and merge PR**
