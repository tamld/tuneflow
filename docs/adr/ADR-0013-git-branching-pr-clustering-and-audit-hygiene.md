# ADR-0013: Topic Branching, PR Issue-Clustering, and Git Audit Hygiene Standard

## Status
Accepted

## Context
During initial development cycles (`v1.0.0` to `v1.3.0`), direct commits were occasionally pushed to `master` (trunk-based cowboy commits) to accelerate releases. While tests passed and issues were closed via CLI, this introduced notable engineering risks:
1. **Audit Trail Breakdown**: Loss of bidirectional traceability between Pull Requests, code diffs, and issue tracking on GitHub.
2. **Monolithic Commits**: A single commit bundling 10–15 unrelated issues across Security, Memory Optimization, UI Accessibility, and CI/CD made independent review and verification impossible.
3. **Regression Risk**: When an issue emerged, `git revert` or `git bisect` would unintentionally roll back unrelated features bundled into the same commit.

---

## Architectural Decisions

### 1. Absolute Prohibition of Direct Commits to `master` (Trunk Protection)
- From `v1.4.0` onward, all human developers and Autonomous AI Agents (Claude, Codex, Antigravity) **MUST NOT** commit or push directly to `master`.
- All engineering activities must originate on dedicated, isolated topic branches.

### 2. Topic Branch Taxonomy
Every branch follows the standardized naming schema: `<type>/<short-description>`
- `feat/`: New UI capabilities, new API endpoints (e.g., `feat/android-tv-leanback-dpad`).
- `fix/`: Bug fixes, security patches (e.g., `fix/stream-proxy-range-headers`).
- `perf/`: Performance optimizations, resource reduction (e.g., `perf/direct-pipe-ffmpeg`).
- `chore/`: CI/CD, linters, test harnesses, container builds (e.g., `chore/ci-release-preflight-gate`).
- `docs/` or `refactor/`: Technical documentation, ADRs, PRD/SRS updates (e.g., `docs/adr-git-pr-hygiene`).

### 3. PR Issue-Clustering Rule
When resolving multiple related issues, developers and agents **MUST cluster issues by functional domain into dedicated PRs**, strictly avoiding kitchen-sink pull requests:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               PULL REQUEST CLUSTERING STANDARD                         │
├─────────────────────┬──────────────────────────┬───────────────────────────────────────┤
│ PR Classification   │ Clustering Criteria      │ Title Format & Closing Syntax         │
├─────────────────────┼──────────────────────────┼───────────────────────────────────────┤
│ Security & Core     │ OWASP, SSRF, XSS, Buffer,│ `fix(security-core): harden engine`   │
│                     │ I/O Pipe, Disk Quota     │ `Closes #4, Closes #5, Closes #6`     │
├─────────────────────┼──────────────────────────┼───────────────────────────────────────┤
│ UI / UX             │ Elderly UI, Drawer,      │ `feat(ux): enhance SilverMelody a11y` │
│                     │ Modals, Font Size, i18n  │ `Closes #9, Closes #10, Closes #12`   │
├─────────────────────┼──────────────────────────┼───────────────────────────────────────┤
│ CI/CD & Platform    │ GitHub Actions, Build APK│ `chore(ci-arch): add automated gates` │
│                     │ Docker Smoke, Test gates │ `Closes #13, Closes #14, Closes #18`  │
└─────────────────────┴──────────────────────────┴───────────────────────────────────────┘
```

### 4. The 5-Step PR Ritual
1. **Branch Creation**: `git checkout -b <type>/<topic>`.
2. **Atomic Commits**: Structured commits with Conventional Commit messages.
3. **Quality Gates**: Local verification running `npm run lint && npm test` passing 100% before push.
4. **Pull Request Creation**: Opened via `gh pr create` with test evidence and explicit `Closes #X, Closes #Y` links.
5. **Merge & History Flattening**: Squash-and-merge on GitHub to close linked issues and maintain clean repository history.

---

## Consequences

### Positive
1. **Clean, Traceable Git History**: Complete visibility into why changes were made and which PR introduced them.
2. **Maximum Safety**: Eliminates accidental regressions on the production `master` branch.
3. **Industry Alignment**: Standardizes collaboration protocols between AI agents and human engineers.

### Trade-Offs
- Requires branching and PR opening overhead compared to direct pushes, justified by safety and audit integrity.
