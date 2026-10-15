# TuneFlow Directive Clocks Ledger

> **Status**: Active Architectural Directives Ledger  
> **Authority**: Derived from [TuneFlow Constitution (constitution.md)](constitution.md) and [Operational Rules (RULES.md)](RULES.md).  
> **Related Documents**: [Roadmap (ROADMAP.md)](ROADMAP.md) | [Definition of Done (DoD.md)](DoD.md) | [Definition of Ready (DoR.md)](DoR.md) | [Claims Registry (claims.yml)](claims.yml)

---

## 🕒 Directive Clocks Ledger Table

| ID | Directive | Born from | Clock / simplify-if | Status |
| :--- | :--- | :--- | :--- | :--- |
| **D-01** | **Version single-source 2.5.0 vs 3.0.0**: Enforce `2.5.0` as the authoritative project version in `package.json` and build manifests via `scripts/sync-versions.js` until an official higher release is tagged. | Discrepancy between master branch version tags (`2.5.0` in `package.json`) and forward roadmap milestones (`v3.0.0`). | Simplify when Phase 16 Tauri v2 desktop shell is formally cut and published as GitHub release tag `v3.0.0`. | Enforced (`scripts/sync-versions.js`) |
| **D-02** | **Hardcoded tunnel URL removal**: Prohibit hardcoding remote tunnel endpoints or ephemeral proxy URLs in client/server source files; require dynamic runtime config (`SharedPreferences` + QR pairing). | Leakage of temporary development tunnel endpoints into client configuration files. | Simplify when dynamic auto-discovery or local zero-conf mDNS service resolution is fully deployed. | Enforced (`tests/android-qr-pairing-and-d02.test.js`) |
| **D-03** | **ROADMAP release-tag truth baseline #144**: Explicitly distinguish unreleased master code milestones from published GitHub releases; mark Phases 14–19 as unreleased. | Issue #144: Roadmap claiming future milestones (Phases 14–18) were published releases rather than code on master. | Simplify when release CI pipeline automatically updates `docs/ROADMAP.md` based on `gh release list`. | Enforced (`docs/ROADMAP.md`) |
| **D-04** | **Single lockfile pnpm law & AGENTS.md sync**: Strictly enforce `pnpm` usage, remove `package-lock.json`, and keep operational documentation and CI workflows aligned with `pnpm`. | Dual lockfiles (`package-lock.json` and `pnpm-lock.yaml`) causing repository drift and SSD wear. | Simplify when pre-commit and pre-push hooks automatically reject any npm lockfile additions repo-wide. | Enforced (`tests/ci-preflight-gate.test.js`) |

---

## Maintenance Policy

Directives in this ledger represent temporary or compensatory architectural constraints born out of specific operational incidents. Each directive must maintain a clear "Clock / simplify-if" condition under which the constraint can either be automated away or retired.
