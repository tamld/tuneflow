# ADR-0015: Tri-Mode Deployment Architecture and Decoupled Remote Thin-Client Topology

## Status
Accepted

## Context
TuneFlow originated as a self-hosted web downloader and evolved into a bundled desktop application (ADR-0014). However, users with dedicated server infrastructure (e.g. headless Linux hosts, containers, virtual machines, network storage pools) require a clean architectural decoupling between server-side compute/storage and client-side presentation:
1. Running the entire backend on a client machine (e.g., laptop) duplicates storage, causes unnecessary SSD churn, and prevents other family members (Android TV, mobile PWA) from sharing downloaded music.
2. Conversely, requiring non-technical users to configure a remote server prevents standalone personal use.
3. Therefore, TuneFlow requires a formal architectural model supporting three distinct deployment modes: Full Standalone (with auto-registered background service), Dedicated Server (headless, POSIX storage-agnostic), and Dedicated Thin Client (featherweight native shell connecting over IP, mDNS, or public FQDN).

## Architectural Decisions
1. **Tri-Mode Deployment Model**:
   - **Mode 1 (Full Standalone)**: Deploys the complete stack (Native GUI + Express backend + SQLite + yt-dlp + ffmpeg) and automatically registers an OS-level background service (`launchd` on macOS, `systemd --user` on Linux).
   - **Mode 2 (Dedicated Headless Server)**: Deploys a 100% headless backend on any Linux/container environment. All persistence adheres to standard POSIX directory descriptors (`DATA_DIR`, `DOWNLOADS_DIR`, `TEMP_DIR`), remaining completely filesystem-agnostic (ext4, XFS, Btrfs, ZFS, NFS/SMB mounts). Zero GUI dependencies.
   - **Mode 3 (Dedicated Thin Client)**: Deploys a featherweight native client (~10 MB) without Node.js or download sidecars.
2. **Flexible Client Transport Contract**:
   - The thin client supports connecting via:
     - Direct IPv4/IPv6 (`http://192.168.x.x:3000`)
     - Local mDNS / domain (`http://tuneflow.local:3000`)
     - Public FQDN with TLS 1.3 (`https://music.example.com`)
   - Configuration is persisted in a standardized `client-config.json` with multi-profile support.
3. **Decoupled Stream Pipe & Range Forwarding**:
   - Client requests media streams via `/api/preview/:id` and `/api/stream/pipe/:id`. The server manages YouTube extraction and forwards Range byte chunks, enabling instant client playback without intermediate disk storage.

## Consequences
- **Positive**: Eliminates resource duplication; protects client SSDs from write churn; centralizes media libraries on dedicated host storage; allows seamless family access across desktop, TV, and mobile clients.
- **Negative**: Thin client requires network connectivity to the host server (mitigated by optional fallback to standalone mode).
