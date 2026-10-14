# Goal Campaign: Monorepo Split & Tri-Mode Workspace Architecture (#140, #148)

## Owner Intent

The objective of this campaign is to decouple the monolithic TuneFlow codebase into a modular, tri-mode workspace monorepo architecture while preserving strict zero-regression invariants, zero heavy front-end bloat, and offline-first edge compute efficiency. By partitioning shared domain logic, API contracts, web presentation, and target client distributions into dedicated workspaces, TuneFlow achieves clean architectural boundaries, modular release lifecycles, and independent deployability across self-hosted and multi-device platforms.

## Target Workspace Topology

The target monorepo topology is organized under pnpm workspace protocols:

- **`packages/core`**: Core download management, yt-dlp execution engine, ffmpeg transcoding wrappers, queue management, and media export orchestration.
- **`packages/web`**: Lightweight vanilla JavaScript and CSS audio player UI, state components, and browser-facing presentation logic.
- **`packages/contract`**: Shared API contracts, schema definitions, RPC interfaces, and wire-format data transfer models shared between server and client applications.
- **`apps/desktop`**: Native desktop launcher, client configurations, desktop FSM runtime, and local bridge integration.
- **`apps/android`**: Mobile companion application and casting endpoint receiver.
- **`apps/extension`**: Browser extension for one-click URL capture and background queuing.
- **`distros/selfhost`**: Self-hosted Docker and Podman container distribution artifacts, Traefik ingress definitions, homelab templates, and standalone server packaging.

## Authority & Proof Oracles

Verification and authority validation are governed by strict automated gates:

1. **`pnpm run test:unit`**: Validates native unit test suites across all core engines, state machines, and utility modules without regressions.
2. **`bash tools/claims_check.sh`**: Verifies invariant claims, cross-package boundary integrity, and architectural constraints across the workspace.
3. **`g8s offer check`**: Executes g8s offer gate checks including specification-to-code synchronization (`ci_spec_code_sync.sh`), structural alignment (`ci_structure_sync.sh`), and markdown link integrity (`ci_link_integrity.sh`).

## Diagnostic Ladder

The diagnostic ladder provides a structured escalation path for debugging monorepo boundary violations and build failures:

1. **L1 - Workspace Graph & Link Verification**: Ensure pnpm workspace resolution and dependency hardlinks resolve cleanly without cycle violations or dangling references.
2. **L2 - Contract & Interface Conformance**: Verify that consumers in `apps/*` and `distros/*` adhere strictly to the shared schemas defined in `packages/contract`.
3. **L3 - Test Suite Isolation**: Run isolated test passes on individual packages (`packages/core`, `packages/web`) followed by end-to-end integration tests.
4. **L4 - Invariant & Claim Auditing**: Execute `bash tools/claims_check.sh` and `g8s offer check` to detect any cross-layer leakage, undeclared file access, or structural drift.
