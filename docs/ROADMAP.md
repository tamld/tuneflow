# TuneFlow Master Engineering Roadmap (v1.0.0 → v2.0.0)

> **Mục tiêu tối thượng**: Xây dựng giải pháp nghe thử và tải nhạc YouTube chất lượng cao (320kbps MP3 / MP4), tối ưu riêng cho **người lớn tuổi (bố mẹ)** với giao diện một chạm siêu dễ, đóng gói container nhẹ nhàng, chạy êm ái 24/7 trên **máy chủ gia đình (Self-Hosted / Podman / Docker)**; đồng thời vạch rõ lộ trình mở rộng **Browser Extension**, kiến trúc **Client-Side Compute**, và chiến lược **Thương mại hóa / Pháp lý bản quyền**.

---

## 🗺️ TỔNG QUAN CÁC CHẶNG ROADMAP (PHASE BREAKDOWN)

Mỗi chặng đều được thiết kế độc lập, có đầy đủ bộ hồ sơ kiểm định chất lượng:
**`PRD` (Yêu cầu sản phẩm) ➔ `SRS` (Đặc tả phần mềm) ➔ `FSM` (Máy trạng thái hữu hạn) ➔ `ADR` (Quyết định kiến trúc) ➔ `DoR` (Tiêu chuẩn sẵn sàng) ➔ `DoD` (Tiêu chuẩn hoàn thành) ➔ `AC` (Tiêu chí nghiệm thu kiểm thử)**.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 TUNEFLOW ROADMAP MATRIX                                │
├──────────┼──────────────────────────────────────────┼─────────────┼────────────────────┤
│ Phase 1  │ Core Engine & Giao Diện Người Lớn Tuổi   │ v1.0.0      │ ✅ Completed (SSoT)│
│ Phase 2  │ Container Engine, Multi-Arch & GHCR CI/CD│ v1.1.1      │ ✅ Completed       │
│ Phase 3  │ Tải Playlist, Batch Selection & Checksum │ v1.2.0      │ ✅ Completed       │
│ Phase 4  │ Phân Loại Bố & Mẹ, Curation & Zero-Login │ v1.3.0      │ ✅ Completed       │
│ Phase 5  │ Hybrid Client-Server Compute & Web Stream│ v1.4.0      │ ✅ Completed       │
│ Phase 6  │ Browser Extension MV3 & Pháp Lý Bản Quyền│ v2.0.0      │ ✅ Completed       │
│ Phase 7  │ Android TV D-Pad Leanback & Mobile Client│ v2.1.0      │ ✅ Completed       │
│ Phase 8  │ PWA Ngoại Tuyến, Giọng Nói & Ghép Nối LAN│ v2.2.0      │ ✅ Completed       │
└──────────┴──────────────────────────────────────────┴─────────────┴────────────────────┘
```

---

## 📌 CHI TIẾT TỪNG CHẶNG KỸ THUẬT

### CHẶNG 1: Nền Tảng Cốt Lõi & Trải Nghiệm Đơn Ca (v1.0.0 - Baseline)
- **Trọng tâm**: Xây dựng backend Node.js 22 LTS, bọc tiến trình `yt-dlp` và `ffmpeg`, giao diện VibeEase tương phản cao chuẩn WCAG AAA, phát nghe thử không quảng cáo, tải trực tiếp về máy client.
- **Hồ sơ tài liệu SSoT**:
  - `docs/PRD.md` (Phần 1–4)
  - `docs/SRS.md` (Phần 1–3)
  - `docs/FSM.md` (Queue Task State Machine)
  - `docs/adr/ADR-0001` đến `ADR-0006`
  - `docs/DoD.md`, `docs/DoR.md`, `docs/AC.md`
- **Kết quả kiểm chứng**: 24/24 ca kiểm thử chạy xanh, 3 issue đóng (#1 TTL Cleanup, #2 Deduplication, #3 Sanitizer).

---

### CHẶNG 2: Đóng Gói Container, Multi-Arch GHCR & Triển Khai Máy Chủ Tự Host (v1.1.1)
- **Vấn đề giải quyết**:
  - Biên dịch và xác thực trực tiếp Container OCI trên nền tảng Alpine Linux siêu nhẹ ($\le 120\text{MB}$), hỗ trợ cả Docker và Podman.
  - Cấu hình pipeline CI/CD GitHub Actions đẩy Multi-arch image (`linux/amd64`, `linux/arm64`) lên **GitHub Container Registry (`ghcr.io/tamld/tuneflow`)**.
  - Xây dựng runbook và thiết lập quyền Public Visibility cho container package trên GitHub.
  - Bộ mẫu triển khai cho Container: `docker-compose.yml`, nhãn Reverse Proxy (`tuneflow.local`).
- **Bộ hồ sơ tài liệu**:
  - **PRD**: `docs/prd/PRD-Phase2-Container-GHCR.md`
  - **SRS**: `docs/srs/SRS-Phase2-Container-GHCR.md`
  - **DoD / DoR / AC**: `docs/spec/phase2-dod-dor-ac.md`
  - **FSM**: `docs/fsm/FSM-Phase2-Container-Lifecycle.md`
  - **ADR**: `docs/adr/ADR-0007-multi-arch-ghcr-and-container-deployment.md`

---

### CHẶNG 3: Tải Playlist, Tải Nhiều Bài (Batch Queue) & Xác Thực Checksum (v1.2.0)
- **Vấn đề giải quyết**:
  - Bóc tách toàn bộ danh sách bài hát trong một YouTube Playlist (tiêu đề, thumbnail, thời lượng).
  - Giao diện người lớn tuổi hiển thị danh sách bài kèm nút chọn trực quan: "Chọn tất cả" hoặc "Chọn từng bài ưng ý".
  - Hàng đợi Bounded Queue: Giới hạn tải tối đa 2 bài song song (`MAX_CONCURRENT_DOWNLOADS = 2`), các bài còn lại xếp hàng tự động nhằm bảo vệ CPU và RAM máy chủ.
  - Khả năng **Resume** tải dở khi rớt mạng dựa trên file `.part`.
  - Cơ chế **Checksum SHA-256** tự động kiểm tra tính toàn vẹn của tệp MP3 sau khi ghép âm thanh trước khi bàn giao cho trình duyệt.
- **Bộ hồ sơ tài liệu**:
  - **PRD**: `docs/prd/PRD-Phase3-Playlist-Batch-Engine.md`
  - **SRS**: `docs/srs/SRS-Phase3-Playlist-Batch-Engine.md`
  - **DoD / DoR / AC**: `docs/spec/phase3-dod-dor-ac.md`
  - **FSM**: `docs/fsm/FSM-Phase3-Batch-Queue.md`
  - **ADR**: `docs/adr/ADR-0008-playlist-parsing-and-checksum-verification.md`

---

### CHẶNG 4: Phân Loại Bố & Mẹ, Curation Thông Minh & Zero-Login Anchor (v1.3.0)
- **Vấn đề giải quyết**:
  - **Danh mục được định hình sẵn**:
    - 🌸 **Mẹ hay nghe**: Nhạc thiền êm dịu, nhạc ngủ ngon, nhạc quê hương, niệm Phật, nhạc không lời thư giãn spa.
    - ☕ **Bố hay nghe**: Nhạc vàng trữ tình, bolero, tiền chiến, quan họ, thời sự âm nhạc.
    - 🎵 **Bộ lọc nhanh**: Nút gạt to rõ chuyển đổi giữa "Nhạc có lời" và "Nhạc không lời".
  - **Neo dữ liệu cá nhân hóa (Zero-Login Anchor)**: Bố mẹ bấm "Thích bài này" hoặc tạo mục "Yêu thích", dữ liệu được lưu trực tiếp vào LocalStorage / Persistent Session của trình duyệt, không bắt người lớn tuổi phải nhớ mật khẩu hay đăng nhập tài khoản phức tạp.
- **Bộ hồ sơ tài liệu**:
  - **PRD**: `docs/prd/PRD-Phase4-Elderly-Persona-Curation.md`
  - **SRS**: `docs/srs/SRS-Phase4-Elderly-Persona-Curation.md`
  - **DoD / DoR / AC**: `docs/spec/phase4-dod-dor-ac.md`
  - **FSM**: `docs/fsm/FSM-Phase4-Curation-Interaction.md`
  - **ADR**: `docs/adr/ADR-0009-elderly-persona-taxonomy-and-zero-login-storage.md`

---

### CHẶNG 5: Kiến Trúc Hybrid Compute & Client-Side Streaming Offloading (v1.4.0)
- **Vấn đề giải quyết**:
  - *Nguyên tắc truyền tải*: YouTube mã hóa luồng âm thanh và áp đặt chính sách CORS, do đó bắt buộc phải có backend máy chủ đứng ra giải mã URL gốc bằng `yt-dlp`.
  - *Tối ưu hóa Offloading*:
    - Luồng âm thanh được máy chủ pipe trực tiếp về client qua Web Streams API (`ReadableStream`) mà **không cần lưu giữ vĩnh viễn trên ổ cứng máy chủ** (Zero-Disk Retention mode).
    - Tích hợp **Web Audio API / WebAssembly (WASM)** trên trình duyệt: Các tác vụ như cắt đoạn nhạc (trim audio), tinh chỉnh âm lượng (normalize), gắn metadata ID3 tag được tính toán trực tiếp trên CPU của máy khách (Client Compute), giúp server đạt tải gần như bằng 0!
- **Bộ hồ sơ tài liệu**:
  - **PRD**: `docs/prd/PRD-Phase5-Hybrid-Compute-Streaming.md`
  - **SRS**: `docs/srs/SRS-Phase5-Hybrid-Compute-Streaming.md`
  - **DoD / DoR / AC**: `docs/spec/phase5-dod-dor-ac.md`
  - **FSM**: `docs/fsm/FSM-Phase5-Streaming-Pipeline.md`
  - **ADR**: `docs/adr/ADR-0010-hybrid-client-server-compute-and-wasm-offloading.md`

---

### CHẶNG 6: Browser Extension MV3, Lộ Trình Thương Mại Hóa & Pháp Lý Bản Quyền (v2.0.0)
- **Vấn đề giải quyết**:
  - **Chrome / Edge Extension (Manifest V3)**:
    - Khi bố mẹ hoặc người dùng đang xem bất kỳ video nào trên YouTube, extension sẽ tự động hiển thị nút màu xanh to rõ **"Tải MP3 TuneFlow"** ngay dưới tiêu đề video.
    - Nhấp 1 chạm: Extension gửi tín hiệu về TuneFlow server cục bộ (`http://localhost:3000` hoặc domain nội bộ) để xử lý tải và tự động lưu file về máy tính.
  - **Chiến lược Thương mại hóa & Rủi ro Bản quyền**:
    - *Rủi ro pháp lý*: Theo điều khoản dịch vụ YouTube (ToS) và luật sở hữu trí tuệ, việc bán quyền tải bài hát thuộc bản quyền của ca sĩ/nhạc sĩ là vi phạm nghiêm trọng và dễ bị khiếu nại DMCA.
    - *Mô hình thương mại hóa chuẩn mực*:
      1. **Bản cá nhân/Gia đình (Self-hosted FOSS)**: Hoàn toàn miễn phí, mã nguồn mở, người dùng tự deploy trên máy chủ cá nhân (Docker/Podman/Kubernetes).
      2. **Bản thương mại hóa (Turnkey Appliance / Personal Audio Manager)**: Bán thiết bị cắm sẵn (Plug-and-play Mini PC) hoặc bán tiện ích mở rộng cao cấp (Extension VIP) với các tính năng quản lý thư viện âm nhạc, đồng bộ đám mây cá nhân, không kinh doanh nội dung nhạc.
- **Bộ hồ sơ tài liệu**:
  - **PRD**: `docs/prd/PRD-Phase6-Browser-Extension-Legal.md`
  - **SRS**: `docs/srs/SRS-Phase6-Browser-Extension-Legal.md`
  - **DoD / DoR / AC**: `docs/spec/phase6-dod-dor-ac.md`
  - **FSM**: `docs/fsm/FSM-Phase6-Browser-Extension.md`
  - **ADR**: `docs/adr/ADR-0011-browser-extension-mv3-and-legal-compliance-architecture.md`

---

### CHẶNG 7: Điều Hướng D-Pad Android TV & Chế Độ Tĩnh Dưỡng Ambient (v2.1.0)
- **Vấn đề giải quyết**:
  - **Trải nghiệm 10-foot Android TV (Leanback Remote D-Pad)**:
    - Cơ chế điều hướng không gian 2D ma trận (`public/js/tv-leanback.js`) hỗ trợ toàn bộ phím remote TV tiêu chuẩn: `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `Enter`, `Escape`/`Backspace`.
    - Focus Ring siêu tương phản đạt chuẩn WCAG 2.2 AAA (`.focused-tv` viền vàng 4px `#f39c12`, phóng to $1.06\times$, glow 24px) nhìn rõ từ cự ly 3 mét trên ghế sofa.
    - Cuộn mượt mà `scrollIntoView` định vị thẻ bài hát và thanh điều khiển trung tâm màn hình.
  - **Chế độ Tĩnh Dưỡng Toàn Màn Hình (Ambient Leanback Player)**:
    - Lớp phủ tràn màn hình hiển thị ảnh bìa album kích thước lớn (320px), cỡ chữ 38px–24px cho người cao tuổi thư giãn, nghe kinh Phật hoặc nhạc vàng xưa.
    - Nút chuyển đổi nhanh chế độ TV (`#btn-toggle-tv`) và tham số URL `?mode=tv`.
- **Bộ hồ sơ tài liệu**:
  - **ADR**: `docs/adr/ADR-0012-android-mobile-and-tv-leanback-architecture.md`
  - **SPEC**: `docs/spec/SPEC-0007-android-tv-and-mobile-client.md`

---

### CHẶNG 8: PWA Ngoại Tuyến, Tìm Kiếm Giọng Nói & Ghép Nối LAN (v2.2.0)
- **Vấn đề giải quyết**:
  - **Progressive Web App (PWA) & Bộ Nhớ Đệm Ngoại Tuyến (Cache API)**:
    - Web App Manifest (`public/manifest.webmanifest`) hỗ trợ cài đặt trực tiếp lên màn hình chính (Add to Home Screen) trên Android TV, điện thoại Android và Desktop.
    - Service Worker (`public/sw.js`) chiến lược Cache-first lưu trữ vỏ ứng dụng tĩnh, cho phép mở ứng dụng tức thì ngay cả khi mất kết nối mạng Wi-Fi gia đình.
  - **Tìm Kiếm Bằng Giọng Nói Tiếng Việt (Web Speech API Voice Search)**:
    - Nút micro lớn (`#btn-voice-search`) trợ năng cho người cao tuổi ngại gõ phím.
    - Tự động nhận diện phát âm tiếng Việt (`vi-VN`) với hiệu ứng nhịp đập ghi âm trực quan (`.recording`), tự động điền từ khóa và kích hoạt tìm kiếm chỉ với 1 chạm.
  - **Ghép Nối Mạng Cục Bộ LAN & Chẩn Đoán Không Cần Cấu Hình**:
    - API `GET /api/system/network` tự động quét các giao diện mạng IPv4, cung cấp URL mạng LAN gia đình và tải trọng mã QR để thiết bị di động quét kết nối nhanh.
- **Bộ hồ sơ tài liệu**:
  - **SPEC**: `docs/spec/SPEC-0007-android-tv-and-mobile-client.md`
  - **ADR**: `docs/adr/ADR-0012-android-mobile-and-tv-leanback-architecture.md`

---

## 📋 TRẠNG THÁI TRIỂN KHAI VÀ THEO DÕI (TRACEABILITY MATRIX)

| Mã Yêu Cầu | Hạng Mục Công Việc | Tài Liệu Quy Chiếu | Mã Kiểm Thử / Artifact |
| :--- | :--- | :--- | :--- |
| **RM-01** | Core yt-dlp & FFmpeg engine | `docs/SRS.md` #3.1 | `tests/engine.test.js` |
| **RM-02** | Elderly high-contrast UI ($\ge 50$px) | `docs/SRS.md` #3.2 | `tests/e2e.test.js` |
| **RM-03** | In-app Audio Preview Player | `docs/adr/ADR-0003` | `tests/api.test.js` |
| **RM-04** | Client direct delivery attachment | `docs/adr/ADR-0004` | `tests/api.test.js` |
| **RM-05** | Deduplication & TTL Cleanup | `docs/SRS.md` #3.4 | `tests/edge-cases.test.js` |
| **RM-06** | Container Alpine Build & GHCR | `docs/adr/ADR-0007` | `.github/workflows/release.yml` |
| **RM-07** | Playlist & Batch selection queue | `docs/adr/ADR-0008` | `tests/playlist.test.js` (Phase 3) |
| **RM-08** | SHA-256 Checksum integrity | `docs/spec/phase3` | `tests/checksum.test.js` (Phase 3) |
| **RM-09** | Persona presets (Bố/Mẹ/Thiền) | `docs/adr/ADR-0009` | `tests/playlist.test.js` (Phase 4) |
| **RM-10** | Hybrid Client-Side WASM Compute | `docs/adr/ADR-0010` | `tests/wasm-stream.test.js` (Phase 5)|
| **RM-11** | Browser Extension MV3 Integration | `docs/adr/ADR-0011` | `tests/extension.test.js` (Phase 6) |
| **RM-12** | Android TV D-Pad Leanback & Ambient Player | `docs/adr/ADR-0012` | `tests/tv-leanback.test.js` (Phase 7) |
| **RM-13** | PWA Offline Shell, Voice Search & LAN QR | `docs/spec/SPEC-0007` | `tests/pwa-voice.test.js` (Phase 8) |
