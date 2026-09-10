# Definition of Done (DoD)
## Project: TuneFlow

A feature, fix, or release is considered **DONE** if and only if all following prerequisite criteria are satisfied:

---

## 1. Code Quality & Architectural Integrity
- [ ] Code strictly follows Clean Code principles with zero orphaned variables or dead helper methods.
- [ ] External CLI commands (`yt-dlp`, `ffmpeg`) use isolated argument arrays with explicit `--` parameter separators to prevent argument injection.
- [ ] Child processes are safely managed and terminated on cancellation (`SIGTERM` / `SIGKILL`).
- [ ] Zero secrets, API keys, private tokens, or hardcoded passwords exist in git history or files.

## 2. Automated Testing Gate
- [ ] **Unit Tests**: 100% of formatting, state machine, and helper tests pass.
- [ ] **Integration & Security Tests**: All REST endpoints (`/api/health`, `/api/search`, `/api/stream/pipe/:id`, `/api/queue/*`, `/api/auth/*`) return valid HTTP status codes and adhere to JSON schemas.
- [ ] **Security Fuzzing**: Path traversal, SSRF IP validation, and SQL/SQLite injection test suites execute with zero failures.
- [ ] **Test Coverage**: 218/218 tests pass with 0 failures and 0 unannounced skips.

## 3. Accessibility & Multi-Platform Standards
- [ ] SilverMelody UI targets meet or exceed $\ge 56\text{px}$ touch boundaries.
- [ ] Text contrast conforms to WCAG 2.2 AAA ($\ge 7:1$ contrast ratio).
- [ ] Android TV Leanback D-Pad navigation verified with spatial navigation engine (`tv-leanback.js`).
- [ ] iOS 18 WebKit Standalone mode verified for background audio and Picture-in-Picture.

## 4. Container & Remote Packaging
- [ ] Docker multi-arch image (`linux/amd64`, `linux/arm64`) builds under 120MB on Alpine Linux.
- [ ] Container operates under non-privileged user (`USER node`).
- [ ] Android APKs (Mobile and TV Leanback) are signed and verified with SHA-256 manifests.
- [ ] GitHub Actions release pipeline runs cleanly with sequential job dependencies.

## 5. Documentation & Language Boundary
- [ ] All architectural, engineering, and specification documentation is maintained in 100% English.
- [ ] Dual bilingual separation maintained between `README.md` (EN) and `README.vi.md` (VI).
- [ ] No mixed languages within any single technical document.
