# ADR-0019: Governance and OpenSpec Adoption

## Status
Accepted

## Context
TuneFlow requires deterministic governance mechanisms and continuous verification to prevent specification drift, documentation rot, and regression of system invariants across autonomous agent dispatches and developer contributions. We need a standardized governance framework and automated verification gates that treat policy as machine-verifiable code.

## Decision
We adopt the `g8s` Offer Bundle with the `utility` profile and establish a strict governance contract across the repository:

1. **Governance Trio**:
   - `constitution.md`: Core system invariants, non-negotiables, and high-level architectural axioms.
   - `RULES.md`: Prescriptive coding and workflow constraints enforced during agent execution.
   - `directives.md`: Agent operational directives, state synchronizations, and execution protocols.

2. **Automated Claims Verification**:
   - `claims.yml`: Machine-readable repository assertion specifications.
   - `tools/claims_check.sh`: Automated test runner validating that all architectural claims remain verifiable.

3. **OpenSpec Verification Pins**:
   - Formal capability specifications reside under `docs/openspec/`.
   - Structural and specification integrity are continuously enforced through automated CI gates:
     - `tools/ci_spec_code_sync.sh`: Enforces synchronization between OpenSpec contracts and production code.
     - `tools/ci_structure_sync.sh`: Verifies repository filesystem structure matches governance layouts.
     - `tools/ci_link_integrity.sh`: Validates cross-document reference integrity and prevents dead links.

## Consequences
- **Positive**: Complete automated verification of repository claims and specification compliance during CI/CD.
- **Positive**: Consistent execution protocol for AI agents and human contributors under clear guardrails.
- **Negative**: Adds mandatory verification checks to contribution workflows, requiring CI scripts to be kept green.
