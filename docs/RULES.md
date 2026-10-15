# TuneFlow Operational Rules & Iron Laws

> **Status**: Active Operational Invariants  
> **Authority**: Derived from [TuneFlow Constitution (constitution.md)](constitution.md).  
> **Related Documents**: [Directive Clocks Ledger (directives.md)](directives.md) | [Definition of Done (DoD.md)](DoD.md) | [Definition of Ready (DoR.md)](DoR.md) | [Claims Registry (claims.yml)](claims.yml)

---

## ⚖️ Iron Laws Table

| Rule ID | Standard | Enforcement | CI Gate |
| :--- | :--- | :--- | :--- |
| **RULE-01** | **Markdown Link Integrity**: All relative links across documentation and README files must resolve to existing files on disk. No dead links permitted. | Automated relative link scanner validates all markdown links in configured content roots. | `tools/ci_link_integrity.sh` |
| **RULE-02** | **Spec-Code Synchronization**: Every scenario in an enforced OpenSpec delta with a test pin must map to existing test implementations. | Automated AST / regex scanner validates test bindings and pin completeness. | `tools/ci_spec_code_sync.sh` |
| **RULE-03** | **Machine-Verifiable Claims**: Every registered architectural claim in `docs/claims.yml` must link to active test and source files that exist on disk. | Automated claims checker iterates through registry entries and asserts file presence. | `tools/claims_check.sh` |
| **RULE-04** | **Strict Lockfile & Package Management**: Exclusively use `pnpm` and `pnpm-lock.yaml`. Committing or retaining `package-lock.json` is strictly forbidden. | Working tree audit fails if `package-lock.json` is present or non-pnpm commands are run. | `PROCESS-ENFORCED` |
| **RULE-05** | **Zero-Trust Agent Receipts**: AI agents must operate under explicit cryptographically tracked write receipts and within bounded worktrees. No writes outside receipt scope. | Worktree isolation and commit guard inspection before push to durable ZFS storage. | `PROCESS-ENFORCED` |
| **RULE-06** | **Zero Skipped Tests & TDD Discipline**: 100% of test suites must execute and pass cleanly. Silently skipping or bypassing tests without formal deprecation is forbidden. | Native test runner (`pnpm run test:unit`, `pnpm test`) must finish with 0 fails and 0 unannounced skips. | `PROCESS-ENFORCED` |
| **RULE-07** | **Senior-First Ergonomics**: Interactive targets must meet or exceed $\ge 56\text{px}$, and color contrast must satisfy WCAG 2.2 AAA ($\ge 7:1$). | Validated by SilverMelody CSS specifications and automated UI test assertions. | `PROCESS-ENFORCED` |
| **RULE-08** | **Child Process Argument Isolation**: All CLI child process invocations (`yt-dlp`, `ffmpeg`) must pass isolated argument arrays with explicit `--` parameter delimiters. | Verified by code security reviews and child process execution test suites. | `PROCESS-ENFORCED` |
| **RULE-09** | **100% Free & Open-Source Asset Policy**: All bundled fonts, icons, graphics, and static assets must use approved open-source licenses (`OFL-1.1`, `MIT`, `ISC`, `BSD`, `CC0-1.0`, `Unlicense`) with co-located license texts (`public/fonts/OFL.txt`). Proprietary OS fonts and paid CDNs are strictly forbidden ([ADR-0020](adr/ADR-0020-open-source-asset-governance-and-typography-licensing.md)). | Automated asset provenance scanner verifies license headers, `OFL.txt` presence, and absence of proprietary fonts/CDNs. | `tests/open-source-asset-compliance.test.js` |

---

## Operational Procedures

1. **Pre-Push Validation**:
   Developers and AI agents must run all automated CI gates prior to requesting review or pushing to the durable ZFS remote (`ct122`):
   ```bash
   bash tools/claims_check.sh
   ./tools/ci_link_integrity.sh
   pnpm run test:unit
   ```
2. **Defect Escalation**:
   Any violation of the Iron Laws halts the deployment pipeline immediately. Temporary exemptions must be logged in [directives.md](directives.md) with an explicit simplification clock.
