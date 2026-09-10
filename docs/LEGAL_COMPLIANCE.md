# Legal Compliance & Safe Operation Architecture
## Project: TuneFlow

> **Standard**: Personal Non-Commercial Use, DMCA Fair Use Principles, and Homelab Boundary  
> **Status**: APPROVED (Active SSoT)  

---

## 1. Regulatory Context & Intended Scope

TuneFlow is designed strictly as a self-hosted, private homelab application for family accessibility. It is engineered to assist elderly individuals in listening to music without being exposed to deceptive pop-ups, malware, or phishing advertisements.

### Prohibited Uses
- Commercial redistribution, resale, or subscription streaming.
- Public broadcasting or unlicensed monetization of downloaded media.
- Bypassing DRM protections on encrypted or subscriber-gated content.

---

## 2. Technical Safeguards

1. **Zero Public Cloud Relay**:
   - TuneFlow operates strictly on the user's private local infrastructure.
   - The application does not centralize or mirror audio files on external servers.
2. **Client-Side Media Ownership**:
   - Media files are transferred directly to the user's local browser storage.
   - The server employs automated FIFO pruning (`STORAGE_MAX_MB`) to prevent accumulation of persistent archives.
3. **Respect for Origin Content**:
   - When streaming preview audio, TuneFlow acts as a pass-through proxy to YouTube's public streams.
   - No modifications are made to underlying audio tracks during streaming.

---

## 3. Licensing & Statutory Framework

1. **Open Source Licensing**:
   - TuneFlow software code is distributed under the [MIT License](https://opensource.org/licenses/MIT).
2. **Personal Fair Use**:
   - The software is intended exclusively for private, non-commercial **Personal Fair Use** under 17 U.S.C. § 107.
3. **DMCA Safe Harbor Principles**:
   - TuneFlow operates as a decentralized, self-hosted software utility with zero centralized media hosting or content distribution infrastructure, adhering to **DMCA Safe Harbor** provisions under 17 U.S.C. § **512**.
