# AGENTS.md — TuneFlow Development & Execution Directives

> **SYSTEM DIRECTIVE FOR AI AGENTS (Antigravity CLI / agy, Claude Code, OpenCode, Orca)**:  
> Read this file first upon entering this workspace. This document establishes the operational invariants, compute-storage topology, and verification standards for the TuneFlow project.

---

## 1. Project Overview

* **Name**: TuneFlow (`tuneflow`)
* **Type**: Self-hosted YouTube to MP3/MP4 music downloader with in-app audio preview player.
* **Stack**: Node.js (>=20.0.0, CommonJS), Express 4.x, Puppeteer, Vanilla JS/CSS (zero heavy front-end framework bloat), Docker/Podman container ready.
* **Test Framework**: Native Node.js Test Runner (`node --test`).

---

## 2. Asymmetric Compute & Storage Invariants (Strict Mandate)

This workspace operates under the **Asymmetric Edge-Compute Topology**:

1. **Compute Engine (Apple Silicon M4)**:
   - All compilation, test execution, AST parsing, and AI Agent reasoning run **natively on Mac Mini M4 APFS**.
   - Path: `/Users/tamld/Documents/github/tuneflow`.
   - Never run recursive file watchers (`tsc --watch`, `fsevents`) across network mounts (`smbfs` / `~/github-remote`) to prevent macOS kernel lock deadlocks.

2. **Storage Churn Suppression (`pnpm` Law)**:
   - **MANDATORY**: Always use `pnpm` (`/opt/homebrew/bin/pnpm`) instead of `npm`.
   - Dependencies are hardlinked from the global content-addressable store (`~/.pnpm-store/v11`), keeping local disk consumption under 50 MB and eliminating SSD wear.
   - Command: `pnpm install` or `pnpm approve-builds --all && pnpm install`.

3. **Dual-Remote Git Topology (Durable SSoT on Proxmox ZFS)**:
   - **`origin`**: `https://github.com/tamld/tuneflow` (GitHub open-source repository).
   - **`ct122`**: `dev-workspace:/home/tamld/github/tuneflow` (Proxmox Container CT122 on ZFS with automated snapshot protection).
   - **Sync Standard**: After completing and verifying a change locally, push to CT122 ZFS:
     ```bash
     git push ct122 <branch>
     ```

---

## 3. Standard Operational Commands

| Action | Command | Expected Output / SLA |
| :--- | :--- | :--- |
| **Hydrate Packages** | `pnpm install` | Instant hardlink (< 1s) |
| **Run Unit Tests** | `npm run test:unit` | 8/8 tests pass (< 4s) |
| **Run API Tests** | `npm run test:api` | Integration endpoints pass |
| **Start Dev Server** | `npm run dev` | Auto-reloading Express server on port 3000 |
| **Lint Code** | `npm run lint` | ESLint 10.x pass |
| **Git Push to ZFS SSoT** | `git push ct122 master` | Verified push to Proxmox ZFS |

---

## 4. Key Directory & Code Map

```text
tuneflow/
├── src/
│   ├── server.js          # Express app entry point, security headers, middleware
│   ├── config.js          # Configuration (port, paths, download limits)
│   ├── engine.js          # Core downloader queue, yt-dlp wrapper, track search
│   └── routes/api.js      # REST API endpoints (/search, /download, /preview, /queue)
├── public/                # Static assets (HTML, CSS, Vanilla JS player)
├── tests/                 # Native Node.js test suites (*.test.js)
│   ├── engine.test.js     # Core engine unit tests (format duration, queue management)
│   └── api.test.js        # API endpoint tests
├── docker-compose.yml     # Self-hosted homelab container spec (Traefik labels)
├── Dockerfile             # Alpine/Debian slim Node container definition
├── package.json           # Scripts and dependencies
└── AGENTS.md              # This directive file
```

---

## 5. Agent Verification Protocol (Red-Green-Refactor)

Before declaring any task complete:
1. Run `npm run test:unit` and verify all tests remain 100% green.
2. Ensure no untracked build artifacts or temporary downloads contaminate the Git tree (`git status -s`).
3. Commit with semantic commit messages (`feat:`, `fix:`, `refactor:`, `test:`).
4. Push durable state to `ct122`.

---

## 6. g8s Offer Gates (Wave-4 onboarded 2026-10-14)

This repository is onboarded to the g8s offer bundle (`utility` profile):

- **Registries**: `.g8s/lane-bundles.yml` (lane R/F + D gates) + `.g8s/trust-boundaries.yml` (utility boundary) + `.g8s/effort-classes.yml` (effort defaults resolved by `g8s submit` for dispatches scoped under this root — `docs→low`, `test→medium`).
- **Generic Gates**: `tools/ci_spec_code_sync.sh`, `tools/ci_structure_sync.sh`, `tools/ci_link_integrity.sh` (run via `g8s offer check`).
- **Principle**: gates are evidence, not ceremony — a FAIL is a catch (M2 metric), a pass is a claim with proof.

