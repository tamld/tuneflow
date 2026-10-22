# TuneFlow Documentation Index & Information Architecture

Welcome to the comprehensive documentation tree for **TuneFlow**, the self-hosted media indexing and download engine. TuneFlow documentation is structured around a rigorous 4-lane information taxonomy designed for human engineers, automated governance validators, and agentic coding workflows.

---

## 1. Documentation Taxonomy (4-Lane Architecture)

TuneFlow partitions documentation into four functional lanes to separate invariant principles, technical contracts, evolutionary trajectory, and user enablement:

1. **Governance Lane**: Establishes core system invariants, non-negotiable rules, development directives, and machine-verifiable operational claims.
2. **OpenSpec & Specifications Lane**: Contains formal capability contracts, functional requirements, technical specifications, and system requirement definitions.
3. **Architecture & Campaign Goals Lane**: Captures Architectural Decision Records (ADRs), state machine transitions (FSMs), milestone campaign goals, and specialized superpower guides.
4. **Manuals & Assets Lane**: Provides end-user manuals, production reverse-proxy recipes, configuration references, compliance guidelines, and architectural visual diagrams.

---

## 2. Primary Documentation Subdirectories

The table below lists every first-level directory under `docs/` along with its architectural purpose:

| Directory | Purpose | Link |
| :--- | :--- | :--- |
| `adr/` | Architectural Decision Records capturing structural decisions and rationale | [docs/adr/](adr/) |
| `assets/` | Diagrams, architecture schemas, and visual documentation assets | [docs/assets/](assets/) |
| `fsm/` | Finite State Machine specifications for media queue and player lifecycles | [docs/fsm/](fsm/) |
| `goals/` | Campaign goals, milestone deliverables, and target outcome definitions | [docs/goals/](goals/) |
| `handoffs/` | Multi-agent F1/F2 sealed evidence handoffs and verification reports | [docs/handoffs/](handoffs/) |
| `lessons/` | Ratified operational lesson ledger for verifier-driven remediation | [docs/lessons/](lessons/) |
| `openspec/` | OpenSpec formal change proposals, capability schemas, and specs | [docs/openspec/](openspec/) |
| `prd/` | Product Requirements Documents detailing user stories and functional scope | [docs/prd/](prd/) |
| `spec/` | Technical specifications, protocol contracts, and component interfaces | [docs/spec/](spec/) |
| `srs/` | Software Requirements Specifications defining system constraints and SLAs | [docs/srs/](srs/) |
| `superpowers/` | Operational playbooks, debugging blueprints, and advanced tool workflows | [docs/superpowers/](superpowers/) |

---

## 3. Core Governance & Reference Documents

The root documentation directory maintains key operational references and governance documents:

### Governance & Verification Contracts
- [constitution.md](constitution.md) — Fundamental invariants, architectural axioms, and non-negotiables.
- [RULES.md](RULES.md) — Operational and coding standards enforced across all contributions.
- [directives.md](directives.md) — Agentic execution guidelines and workflow directives.
- [claims.yml](claims.yml) — Machine-verifiable claims checked via automated test gates.
- [DoD.md](DoD.md) — Definition of Done checklist for slices, issues, and releases.
- [DoR.md](DoR.md) — Definition of Ready criteria before active development commences.

### Product & Operational Manuals
- [ROADMAP.md](ROADMAP.md) — Strategic release schedule and product trajectory.
- [USER_GUIDE.md](USER_GUIDE.md) — Comprehensive end-user instructions and usage guidelines.
- [CONFIG.md](CONFIG.md) — Server, worker, and engine configuration parameter reference.
- [REVERSE_PROXY.md](REVERSE_PROXY.md) — Production reverse proxy guides (Nginx, Traefik, Caddy).
- [LEGAL_COMPLIANCE.md](LEGAL_COMPLIANCE.md) — Fair use guidelines, licensing, and compliance disclosures.
