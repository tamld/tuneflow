# Nhật Ký Thay Đổi (Changelog)
Mọi thay đổi đáng chú ý của dự án **TuneFlow** sẽ được ghi chép chi tiết trong tệp này theo chuẩn [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) và tuân thủ [Semantic Versioning](https://semver.org/).

## [2.5.0-alpha] - Unreleased

### Đã Thêm (Added)
- **Bộ Kiểm Thử & Chốt Chặn Xác Thực 4 Tầng (4-Tier Validation Gates Suite - Issue #124)**:
  - **Gate 1 - YouTube Innertube Contract Fragility & Fallback Mocking** (`tests/innertube-fallback.test.js`): Kiểm thử bắt buộc chuyển đổi dự phòng sang `yt-dlp` khi YouTube trả về mã lỗi HTTP 429, 403, HTML cảnh báo Captcha hoặc cấu trúc phản hồi bị thay đổi; bọc kín khối parse JSON trong `parsePlaylistInnertube()` ngăn ngừa vỡ tiến trình do lỗi cú pháp.
  - **Gate 2 - Headless Browser Puppeteer Real DOM E2E Integration** (`tests/puppeteer-e2e.test.js`): Kiểm thử E2E không đầu trên trình duyệt Chromium thực tế, xác minh trạng thái giao diện, kiểm định 100% thẻ hình ảnh có thuộc tính `referrerpolicy="no-referrer"`, kiểm tra tính toàn vẹn của nút phát danh sách liên tục và cơ chế chuyển đổi ngôn ngữ Anh - Việt.
  - **Gate 3 - Audio Stream Pipe MIME & SSRF Guard** (`tests/stream-security.test.js`): Phòng thủ chống tấn công Server-Side Request Forgery (SSRF) và ép kiểu nội dung giả mạo trên các endpoint `/api/preview/:id` và `/api/stream/pipe/:id`; xác thực chặt chẽ giao thức `https:`, từ chối địa chỉ IP Loopback/Private/Cloud Metadata, và trả về HTTP 415 khi MIME type trả về không phải là tệp âm thanh hợp lệ (`audio/*`, `application/ogg`).
  - **Gate 4 - Desktop Installer Integrity & Binary Checksum Gate** (`tests/release-integrity.test.js`): Kiểm định tính hợp lệ của script đóng gói Windows Inno Setup 6 (`setup.iss`) với cờ Zero-Admin `PrivilegesRequired=lowest`, tệp Linux Desktop entry (`tuneflow.desktop`), và đối soát mã băm nhị phân SHA-256 theo cơ chế Fail-Closed trong `binary_guard.js`.
- **Phát Tuyển Tập / Playlist Liên Tục & Nút Phát Hành Động Header (Continuous Playlist Playback & Header Play Action - Issue #119)**:
  - Bổ sung nút `▶️ Phát Danh Sách` (`#btn-play-playlist`) và huy hiệu số lượng bài (`#batch-play-count`) trên thanh tác vụ của `#playlist-panel`.
  - Hỗ trợ chuyển đổi trạng thái động giữa `▶️ Phát Danh Sách`, `⏸️ Tạm Dừng Tuyển Tập`, và `▶️ Tiếp Tục Phát`.
  - Cơ chế tự động chuyển bài thông minh (`playNextTrack` / `playPreviousTrack`): chỉ phát tuần tự các bài được tích chọn trong danh sách.
  - Chuẩn hóa giao diện `btn-panel-play` SilverMelody Design (nút bấm lớn $\ge 48\text{px}$, tương phản WCAG AAA, hỗ trợ phím bấm và ARIA).
- **Đóng Gói Cài Đặt Desktop Bản Địa & Wizard Inno Setup (Desktop Packaging Suite - SPEC-0010, ADR-0014)**:
  - Bản thiết kế cài đặt Windows Inno Setup 6 `installer/windows/setup.iss` cài đặt vào `%LOCALAPPDATA%\Programs\TuneFlow` không đòi quyền Administrator (Zero-Admin, né còi báo động UAC).
  - Bản đăng ký FreeDesktop chuẩn Linux `installer/linux/tuneflow.desktop`.
  - Tích hợp Stage 3 `windows-desktop-build` vào `.github/workflows/release.yml` biên dịch trực tiếp file `.exe` trên GitHub Actions runner.
- **Bộ Công Cụ Nhận Diện Thương Hiệu & Sinh Icon Đa Tầng (Authoritative Icon Generator Suite - Issue #113)**:
  - Script tự động hóa `scripts/generate_icons.py` sinh file `favicon.ico` đa tầng gồm 7 độ phân giải (`16x16` đến `256x256`) từ ảnh gốc `512x512`.
  - Thiết lập kho lưu trữ thương hiệu SSoT tại `assets/branding/` (`icon.ico`, `icon-512.png`, `icon-192.png`, `README.md`).
- **Phòng Thủ Nhị Phân Chủ Động & Tránh False Positive Antivirus (Binary Guard & CAS - SPEC-0008, Issue #109)**:
  - Module `src/security/binary_guard.js` thực hiện Content-Addressable Storage (CAS) đối soát SHA-256 trước khi thực thi `yt-dlp` và `ffmpeg`.
  - Lọc sạch biến môi trường độc hại (`NODE_OPTIONS`, `PYTHONPATH`) ngăn ngừa inject subprocess.
  - Cơ chế tráo file nguyên tử `atomicSwapExecutable()` né lỗi khóa file Windows File Lock.
- **Tách Danh Sách Phát Tốc Độ Cao Bằng YouTube Innertube API (Zero-Subprocess Playlist Extraction - Issue #122)**:
  - Tích hợp hàm `parsePlaylistInnertube()` trong `src/engine/ytdlp.js` gọi trực tiếp YouTube Innertube Browse API (`VL` + `playlistId`), giảm độ trễ trích xuất playlist từ 8–15s xuống còn dưới 400ms không cần gọi tiến trình con `yt-dlp`.
  - Hỗ trợ cơ chế dự phòng thông minh: tự động chuyển sang `yt-dlp` khi Innertube gặp danh sách định dạng đặc thù.
  - Phản hồi trực quan tức thì: Nút `btn-open-playlist` chuyển sang trạng thái disabled hiển thị biểu tượng tải xoay vòng, cuộn trang mượt mà (`scrollIntoView`) đến danh sách bài hát mà không xóa trắng vùng kết quả tìm kiếm.
- **Quy Chuẩn Vận Hành Superpowers Bắt Buộc (Superpowers 8 Mandatory Steps Governance - Issue #115)**:
  - Ban hành `docs/superpowers/plans/2026-09-11-superpowers-tuneflow-mandatory-steps.md` quy định 8 bước bắt buộc và cơ chế chống stale docs.

### Đã Sửa (Fixed)
- **Bổ Sung Referrer Policy Cho Ảnh Nền Ambient Cover (Ambient Cover Referrer Policy - Issue #124)**:
  - Bổ sung thuộc tính `referrerpolicy="no-referrer"` cho thẻ `#ambient-cover` trong `public/index.html`, ngăn chặn trình duyệt gửi tiêu đề Referrer làm vỡ ảnh nền khi tải từ CDN của Google.
- **Bản Địa Hóa Động Toàn Diện Tiếng Anh & Khắc Phục Lỗi Ngôn Ngữ Hỗn Hợp (Dynamic English Localization Engine - Issue #121)**:
  - Bổ sung các token dịch thuật còn thiếu trong `public/js/i18n.js` cho nhãn bộ lọc tìm kiếm (`filter_content_label`, `filter_sort_label`), các chip định dạng (`filter_song_type`, `filter_playlist_type`), huy hiệu thẻ bài hát/album và tiêu đề kết quả tìm kiếm.
  - Cung cấp hàm `window.reRenderActiveCards()` đồng bộ lại giao diện thẻ bài hát và danh sách phát tức thời khi chuyển đổi qua lại giữa tiếng Việt và tiếng Anh.
- **Khắc Phục Lỗi Tải Ảnh Thu Nhỏ & Chặn Hotlink Trình Duyệt (Thumbnail Resilience, CSP & Anti-Hotlink Guard - Issue #122)**:
  - Bổ sung thẻ `<meta name="referrer" content="no-referrer">` và thuộc tính `referrerpolicy="no-referrer"` trên toàn bộ thẻ `<img>` và module phát nhạc `player.js`, vô hiệu hóa cơ chế chặn hotlink của Google/YouTube CDN khi truy cập qua Reverse Proxy/Cloudflare Tunnel.
  - Mở rộng chính sách bảo mật CSP (`Content-Security-Policy`) trong `src/server.js` cho phép nạp ảnh từ `*.ggpht.com` và `*.googleusercontent.com`.
  - Thay thế khối xám `#2e323e` đơn điệu khi lỗi ảnh bằng SVG âm nhạc mang biểu tượng `🎵` và gradient màu thương hiệu SilverMelody.
- **Chuẩn Hóa Đường Dẫn Đa Nền Tảng Trên Linux & Windows (Cross-Platform Path Determinism - Issue #115)**:
  - Ép buộc sử dụng `path.win32` cho Windows và `path.posix` cho POSIX trong `binary_guard.js` và `tests/portable-binary-security.test.js`, khắc phục triệt để lỗi gãy CI trên Ubuntu runner.
  - Tối ưu hóa `scripts/generate_icons.py` sử dụng Lazy Import thư viện Pillow, cho phép cờ `--check` chạy mượt mà trên môi trường headless container.
  - Nới lỏng regex phụ thuộc trong `tests/ci-cd-unified-pipeline.test.js` tương thích với quy trình release đa giai đoạn.

---

## [2.4.3] - 2026-09-11

### Đã Thêm (Added)
- **Dọn Dẹp Phiên Hết Hạn Tự Động Theo Chu Kỳ (Automated Periodic Session Cleanup - Issue #103)**:
  - Bổ sung luồng tác vụ bảo trì ngầm `src/engine/maintenance.js` chạy định kỳ mỗi 1 giờ (`unref()` timer) để tự động xóa sạch các bản ghi phiên đăng nhập (`sessions`) đã quá hạn ([Issue #103](https://github.com/tamld/tuneflow/issues/103)).
  - Bổ sung chỉ mục hiệu năng `idx_sessions_expires_at` và `idx_sessions_user_id` tối ưu tốc độ truy vấn dọn dẹp $O(\log N)$.
  - Tích hợp vòng đời tắt máy an toàn (`gracefulShutdown`) giải phóng timer bảo trì và ngắt kết nối an toàn.
- **Động Cơ Di Trú Lược Đồ SQLite Động Nguyên Tử (Atomic SQLite Schema Migrations Engine - Issue #105)**:
  - Bổ sung module `src/db/migrations.js` quản lý lược đồ dữ liệu tự động dựa trên `PRAGMA user_version` ([Issue #105](https://github.com/tamld/tuneflow/issues/105)).
  - Thay thế cơ chế đọc tệp `schema.sql` thô bằng pipeline di trú tự động bọc trong giao dịch `db.transaction()` bảo đảm tính toàn vẹn ACID.
  - Di trú v1: Khởi tạo toàn bộ bảng cốt lõi (`users`, `sessions`, `guest_quotas`, `user_favorites`).
  - Di trú v2: Tự động đánh chỉ mục hiệu năng cao (`idx_sessions_expires_at`, `idx_sessions_user_id`, `idx_user_favorites_video`).
- **Đóng Gói & Phát Hành Đa Nền Tảng Khách Quan (Objective Multi-Host Deployment & Remote CI/CD Alignment - Issue #101)**:
  - Rà soát và chuẩn hóa tài liệu `README.md`, `README.vi.md`, `USER_GUIDE.md` loại bỏ các hướng dẫn chủ quan, mở rộng hỗ trợ triển khai linh hoạt (Docker, Podman, Compose, VPS, Cloud, Local) ([Issue #101](https://github.com/tamld/tuneflow/issues/101)).
  - Cố định phiên bản Gradle 8.6 trong `release.yml` và `gradle-wrapper.properties` tương thích hoàn hảo với Android Gradle Plugin 8.2.2, giải quyết triệt để lỗi biên dịch APK trên GitHub Actions runners.
  - Bổ sung cơ chế sinh thẻ kép `type=semver,pattern={{version}}` và `pattern=v{{version}}` cho Docker metadata action đẩy lên GHCR.
- **Tối Ưu Hóa Thiết Kế Hệ Thống & Token Pipeline (System Design & Token Optimization - Issue #97)**:
  - Tách biệt ranh giới trách nhiệm kiến trúc (Separation of Concerns) giữa tầng Router, Controller, Service và Repository ([Issue #97](https://github.com/tamld/tuneflow/issues/97)).
  - Tối ưu hóa chuỗi xử lý token và nâng cao hiệu suất phản hồi cho các API tìm kiếm và tải nhạc.

### Đã Sửa (Fixed)
- **Khắc Phục Vấn Đề Chuyển Trang & Modal Đổi Mật Khẩu Khi Đang Phát Nhạc (Issue #99)**:
  - Khắc phục lỗi xung đột trạng thái giữa bộ phát nhạc và modal tự phục vụ đổi mật khẩu ([Issue #99](https://github.com/tamld/tuneflow/issues/99)).
  - Bổ sung bộ kiểm thử tự động hóa toàn diện bao phủ các ca kiểm thử xác thực, trạng thái modal và luồng phát nhạc.
- **Đồng Bộ Phiên Bản Toàn Diện v2.4.3 (Version Synchronization - Issue #107)**:
  - Đồng bộ mã phiên bản `2.4.3` (`versionCode 243`) trên toàn bộ các tệp cấu hình cốt lõi (`package.json`, `manifest.json`, `build.gradle`, `sw.js`, `README.md`, `release.yml`) ([Issue #107](https://github.com/tamld/tuneflow/issues/107)).

### Kiểm Thử & Đảm Bảo Chất Lượng
- Nâng tổng số ca kiểm thử tự động hóa lên **257/257 bài test chạy xanh 100%** (81 test suites, 0 lỗi linter ESLint).

---

## [2.4.2] - 2026-09-10

### Đã Thêm (Added)
- **Bộ Điều Khiển Cửa Sổ Nổi Picture-in-Picture (PiP Floating Controller - Issue #88)**:
  - Tích hợp tính năng Picture-in-Picture chuẩn HTML5/WebKit thông qua luồng Canvas thời gian thực 512x512 (`canvas.captureStream(10)`) nối vào thẻ video ngầm có cờ `playsinline` ([Issue #88](https://github.com/tamld/tuneflow/issues/88)).
  - Hiển thị trực quan bìa đĩa bài hát, tiêu đề, tên ca sĩ và thanh tiến trình trong cửa sổ nổi thu nhỏ khi chuyển ứng dụng trên iPhone và máy tính.
  - Nút bấm `📺 PiP` chuyên dụng trên thanh phát nhạc với trạng thái kích hoạt nổi bật.
- **Vòng Đời Phát Hành 3 Giai Đoạn Chuẩn Hóa Trên GitHub Remote (Issue #90)**:
  - Hợp nhất quy trình phát hành thành pipeline duy nhất tại `.github/workflows/release.yml`:
    1. **Stage 1**: Đóng gói multi-arch container image (`linux/amd64`, `linux/arm64`) đẩy lên GitHub Container Registry (`ghcr.io/tamld/tuneflow`).
    2. **Stage 2**: Biên dịch, đóng gói và ký số file cài đặt Android APK độc lập cho cả thiết bị Di động (`tuneflow-mobile.apk`) và Android TV Leanback (`tuneflow-tv.apk`) kèm mã băm chống giả mạo SHA-256.
    3. **Stage 3**: Tự động xuất bản GitHub Release đính kèm đầy đủ tài nguyên APK và nhật ký thay đổi.
  - Loại bỏ hoàn toàn nợ kỹ thuật pseudo-APK (file zip đổi tên) và triệt tiêu xung đột race condition giữa hai workflow độc lập.
- **Mã Nguồn Khung Android Native & Android TV Leanback Wrapper (Issue #90)**:
  - Bổ sung thư mục `android/` với cấu trúc Gradle tiêu chuẩn, khai báo hai biến thể sản phẩm `mobile` và `tv`.
  - Khai báo cờ `android.software.leanback` và `android.hardware.touchscreen` tùy chọn theo đúng chuẩn SPEC-0007 và ADR-0012.

### Đã Sửa (Fixed)
- **Khắc Phục Vỡ Giao Diện PWA Trên iPhone & Vùng An Toàn Màn Hình (Issue #87)**:
  - Thêm `viewport-fit=cover` vào thẻ `<meta name="viewport">` ([Issue #87](https://github.com/tamld/tuneflow/issues/87)).
  - Áp dụng đầy đủ `env(safe-area-inset-*)` để tránh xung đột với Dynamic Island, Tai thỏ và thanh gạt Home của iPhone.
  - Tái cấu trúc thanh tác vụ Header thành dải cuộn ngang mượt mà (Horizontal Action Chips Bar), chấm dứt tình trạng gãy dòng thành 5 hàng lộn xộn trên màn hình hẹp.
  - Tái thiết kế thanh phát nhạc dưới cùng (Bottom Player) thành dạng lưới 2 tầng đáp ứng tiêu chuẩn tiếp cận người cao tuổi WCAG 2.2 AAA (nút bấm $\ge 44\text{px}$).
  - Căn chỉnh chính xác các nút tìm kiếm giọng nói `🎙️` và xóa `✕` vào giữa ô tìm kiếm (`top: 28px`).
- **Khắc Phục Lỗi Tắt Nhạc Nền Trên iOS WebKit (Issue #88)**:
  - Tự động phát hiện thiết bị iOS và chuyển sang chế độ phát trực tiếp phần cứng (Direct Audio Bypass), ngăn chặn việc Apple cưỡng chế treo Web Audio `AudioContext` khi tắt màn hình ([Issue #88](https://github.com/tamld/tuneflow/issues/88)).
  - Đồng bộ toàn diện `navigator.mediaSession.playbackState`, `setPositionState` và các phím điều khiển từ màn hình khóa, trung tâm điều khiển và tai nghe Bluetooth.

### Kiểm Thử & Đảm Bảo Chất Lượng
- Bổ sung 3 bộ kiểm thử tự động:
  - `tests/ios-pwa-responsive.test.js` (Issue #87)
  - `tests/ios-background-audio-pip.test.js` (Issue #88)
  - `tests/ci-cd-unified-pipeline.test.js` (Issue #90)
- Nâng tổng số ca kiểm thử tự động lên **218/218 bài test chạy xanh 100%** (75 test suites, 0 lỗi linter ESLint).

---

## [2.4.0] - 2026-09-10

### Đã Thêm (Added)
- **Khám Phá Danh Sách Phát, Bộ Lọc & Sắp Xếp Nâng Cao (Playlist Discovery & Advanced Sorting - Issue #80)**:
  - Bổ sung bộ lọc loại kết quả tìm kiếm đa năng (`type=all`, `type=video`, `type=playlist`) hỗ trợ bóc tách danh sách phát độc lập với video đơn lẻ ([Issue #80](https://github.com/tamld/tuneflow/issues/80)).
  - Bổ sung 3 chế độ sắp xếp linh hoạt: Theo độ liên quan (`sort=relevance`), Theo lượt xem cao nhất (`sort=views`), và Theo ngày đăng mới nhất (`sort=date`).
  - Giao diện người dùng: Tích hợp thanh nút lọc pill buttons chuẩn SilverMelody WCAG AAA, thẻ danh sách phát chuyên biệt với huy hiệu bài hát (`📂 Playlist (N bài)`), nút 1-chạm tải hàng loạt hoặc mở danh sách chi tiết.
- **Quản Trị Phiên Đăng Nhập, Thu Hồi Quyền Theo Nhóm & Nuclear Kick-Out (Session Management - Issue #84)**:
  - Quản lý trạng thái phiên kết nối bền vững trong SQLite (`sessions`), theo dõi IP, User-Agent, thời gian kết nối và hạn dùng ([Issue #84](https://github.com/tamld/tuneflow/issues/84)).
  - API kiểm soát phiên: `GET /api/admin/sessions`, `POST /api/admin/sessions/revoke` (ngắt phiên đơn lẻ), `POST /api/admin/sessions/revoke-group` (kick-out theo nhóm: `guests`, `users`, `all_except_me`), và `POST /api/admin/sessions/revoke-all` (lệnh khẩn cấp nuclear purge).
  - Bảng điều khiển Quản trị: Thêm Tab `⚡ Phiên & Thiết Bị` với thanh công cụ kick-out nhanh và bảng tra cứu danh sách thiết bị đang hoạt động.
- **Tự Phục Vụ Đổi Mật Khẩu & Admin Reset Mật Khẩu (Password Self-Service - Issue #81)**:
  - Cho phép người dùng tự đổi mật khẩu qua `POST /api/auth/change-password`, xác thực mật khẩu cũ bằng `scrypt`, tự động hủy các phiên trên thiết bị cũ để bảo vệ tài khoản ([Issue #81](https://github.com/tamld/tuneflow/issues/81)).
  - Cho phép Quản trị viên đặt lại mật khẩu cho bất kỳ thành viên nào qua `POST /api/admin/users/:id/reset-password` kèm ngắt kết nối bắt buộc.
  - Nút bấm và modal `🔑 Đổi MK` trực quan trên thanh tiêu đề và trong bảng Accounts.
- **Lưu Trữ & Đồng Bộ Bài Hát Yêu Thích 2 Chiều (Server-side Favorites Sync - Issue #81)**:
  - Bảng cơ sở dữ liệu `user_favorites` lưu trữ danh mục bài hát yêu thích theo từng tài khoản người dùng ([Issue #81](https://github.com/tamld/tuneflow/issues/81)).
  - API `/api/user/favorites` (GET, POST, DELETE, POST /sync) tự động đồng bộ 2 chiều giữa `localStorage` và SQLite khi đăng nhập, duy trì trải nghiệm Zero-Login mượt mà cho khách vãng lai.
- **Mã Hóa Dữ Liệu Nhạy Cảm Tại Chỗ (AES-256-GCM Encryption at Rest - Issue #81)**:
  - Module mã hóa đối xứng có xác thực `src/auth/crypto_utils.js` bảo vệ toàn bộ IP người dùng và khách vãng lai trong SQLite `sessions` và `guest_quotas` ([Issue #81](https://github.com/tamld/tuneflow/issues/81)).
  - Cơ chế băm HMAC cho vector khởi tạo IV bảo đảm khả năng lập chỉ mục truy vấn mà không làm rò rỉ bất kỳ byte IP dạng thô (plaintext) nào trong tệp nhị phân `.db`.

### Kiểm Thử & Đảm Bảo Chất Lượng
- Bổ sung 3 bộ kiểm thử tự động toàn diện:
  - `tests/search-playlist-sort.test.js` (Issue #80)
  - `tests/admin-session-management.test.js` (Issue #84)
  - `tests/security-passwords-favorites-encryption.test.js` (Issue #81)
- Nâng tổng số ca kiểm thử tự động từ 134 lên **198/198 bài test chạy xanh 100%** (72 test suites, 0 regressions).

---

## [2.3.0] - 2026-09-09

### Đã Thêm (Added)
- **Hệ Quản Trị Dữ Liệu SQLite & Xác Thực Phân Quyền (RBAC - Issue #52)**:
  - Tích hợp động cơ cơ sở dữ liệu SQLite nhúng trực tiếp qua module gốc của Node.js: `node:sqlite` (`DatabaseSync`), kích hoạt chế độ WAL (`PRAGMA journal_mode = WAL;`) và toàn vẹn khóa ngoại `foreign_keys = ON` mà không cần cài đặt thêm dependency bên ngoài ([Issue #52](https://github.com/tamld/tuneflow/issues/52)).
  - Thiết kế kiến trúc phân tách ranh giới rõ ràng (SoC):
    - `src/db/`: Quản lý kết nối, di chuyển lược đồ bảng `users`, `sessions`, `guest_quotas`, `system_config`.
    - `src/db/repositories/`: Tách biệt các kho truy vấn dữ liệu `user_repo.js`, `session_repo.js`, `guest_repo.js`.
    - `src/auth/`: Tiện ích mã hóa mật khẩu bằng `scrypt` với muối ngẫu nhiên 16-byte (`crypto_utils.js`), phòng chống tấn công dò thời gian bằng `crypto.timingSafeEqual`, và dịch vụ quản trị xác thực `auth_service.js`.
  - Phân định 3 bậc truy cập (Three-Tier RBAC) bảo vệ máy chủ khi đưa ra Internet:
    - **Tier 1: Admin (Quản trị viên)**: Quyền quản lý người dùng (CRUD), cập nhật yt-dlp nóng, xem thông số chẩn đoán hệ thống và đặt lại thời gian chờ (cooldown) cho khách.
    - **Tier 2: User (Thành viên Gia Đình)**: Thưởng thức âm nhạc không giới hạn thời gian, nghe thử và đưa bài hát vào hàng đợi tải về máy chủ.
    - **Tier 3: Guest (Khách vãng lai)**: Được nghe thử tích lũy tối đa **30 phút (1800 giây)**. Khi hết thời lượng, luồng phát tự động ngắt kết nối và kích hoạt chế độ làm mới (cooldown 60 phút). Chống gian lận bằng cách liên kết địa chỉ IP và mã băm vân tay trình duyệt. Chặn quyền đưa bài hát vào hàng đợi tải để chống spam cạn kiệt tài nguyên.
  - Giao diện người dùng:
    - Huy hiệu tài khoản trực quan trên thanh tiêu đề (`👑 Quản trị`, `👤 Gia Đình`, `⏱️ Khách: 28:30`).
    - Hộp thoại đăng nhập hiện đại, trợ năng.
    - Cảnh báo tự động ngắt nhạc và thông báo cooldown êm ái khi khách dùng hết 30 phút nghe thử.
- **Hẹn Giờ Tắt Nhạc Cấp Số Nhân (Exponential 2x Sleep Timer - Issue #50)**:
  - Bổ sung các mốc hẹn giờ theo quy tắc $\times 2$: `15m`, `30m`, `1h`, `2h`, `4h` ([Issue #50](https://github.com/tamld/tuneflow/issues/50)).
  - Cơ chế giảm dần âm lượng nhẹ nhàng (Smooth Volume Fade-Out) trong 30 giây trước khi tắt hẳn, tự khôi phục âm lượng gốc sau đó.
- **Thu Phóng Cỡ Chữ Động Trợ Năng (Dynamic Accessibility Font Scaler - Issue #49)**:
  - Khắc phục triệt để lỗi cỡ chữ không đổi trên Android TV và Web khi bấm cụm nút `A-` / `A` / `A+` bằng cách chuyển đổi toàn bộ kiểu chữ sang biến số CSS `--user-font-scale` kết hợp hàm `calc()` ([Issue #49](https://github.com/tamld/tuneflow/issues/49)).

### Kiểm Thử & Đảm Bảo Chất Lượng
- Bổ sung 5 bộ kiểm thử tự động toàn diện:
  - `tests/font-scaler-and-sleep-timer.test.js`
  - `tests/auth-db-repositories.test.js`
  - `tests/auth-service.test.js`
  - `tests/auth-middleware.test.js`
  - `tests/auth-api-endpoints.test.js`
  - `tests/auth-security-fuzzing.test.js`
- Nâng tổng số ca kiểm thử tự động từ 107 lên **134/134 bài test chạy xanh 100%** (`exit 0`).

---

## [2.2.0] - 2026-09-09

### Đã Thêm (Added)
- **Progressive Web App (PWA) & Lưu Trữ Ngoại Tuyến (Cache API - Phase 8)**:
  - Bản kê khai ứng dụng web chuẩn PWA `public/manifest.webmanifest` hỗ trợ cài đặt ứng dụng độc lập (Add to Home Screen / Standalone PWA) trên Android TV, điện thoại Android và máy tính bảng ([Issue #45](https://github.com/tamld/tuneflow/issues/45)).
  - Service Worker `public/sw.js` áp dụng chiến lược Cache-first cho toàn bộ vỏ giao diện tĩnh (HTML/CSS/JS/Icons), đảm bảo mở ứng dụng tức thì và duy trì trải nghiệm khi mất kết nối mạng ([Issue #45](https://github.com/tamld/tuneflow/issues/45)).
- **Tìm Kiếm Bằng Giọng Nói Tiếng Việt (Web Speech API Voice Search)**:
  - Nút micro lớn (`#btn-voice-search`) trợ năng cho người cao tuổi ngại gõ phím ảo ([Issue #45](https://github.com/tamld/tuneflow/issues/45)).
  - Tự động nhận diện phát âm tiếng Việt (`vi-VN`) với hiệu ứng ghi âm nhịp đập trực quan (`.recording`), tự động điền từ khóa và kích hoạt tìm kiếm chỉ với 1 chạm ([Issue #45](https://github.com/tamld/tuneflow/issues/45)).
- **Ghép Nối Mạng Nội Bộ LAN & Chẩn Đoán Không Cần Cấu Hình**:
  - API `GET /api/system/network` tự động quét các giao diện mạng IPv4, cung cấp URL mạng LAN gia đình và tải trọng mã QR để thiết bị di động quét kết nối nhanh ([Issue #45](https://github.com/tamld/tuneflow/issues/45)).
- **Kiểm Thử & Đảm Bảo Chất Lượng**:
  - Bổ sung bộ kiểm thử tự động `tests/pwa-voice.test.js` kiểm tra cấu trúc PWA manifest, service worker lifecycle, network API và nhận diện giọng nói.
  - Toàn bộ 101/101 ca kiểm thử tự động trong 27 bộ test suite chạy xanh 100%.

---

## [2.1.0] - 2026-09-09

### Đã Thêm (Added)
- **Điều Hướng Không Gian Remote TV D-Pad (Android TV Leanback - Phase 7)**:
  - Triển khai động cơ điều hướng không gian 2D ma trận (`public/js/tv-leanback.js`) chuyên dụng cho remote Android TV với các phím tiêu chuẩn: `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `Enter`, `Escape`/`Backspace`, `MediaPlayPause` ([Issue #43](https://github.com/tamld/tuneflow/issues/43)).
  - Trạng thái tiêu điểm trực quan chuẩn WCAG 2.2 AAA (`.focused-tv`) với viền vàng sáng 4px (`--accent-gold`), hiệu ứng phóng to phần cứng $1.06\times$, quầng sáng vàng 24px nhìn rõ ràng từ khoảng cách 3 mét trên ghế sofa ([Issue #43](https://github.com/tamld/tuneflow/issues/43)).
  - Nút chuyển đổi nhanh chế độ TV (`#btn-toggle-tv`) trên thanh điều hướng và tự động nhận diện chế độ qua tham số URL `?mode=tv` hoặc bộ nhớ `localStorage` ([Issue #43](https://github.com/tamld/tuneflow/issues/43)).
  - Bổ sung chế độ tĩnh dưỡng toàn màn hình (Ambient Leanback Player Overlay `#tv-ambient-player`) với ảnh bìa khổ lớn 320px, kích thước chữ 38px–24px chống mỏi mắt cho người cao tuổi ([Issue #43](https://github.com/tamld/tuneflow/issues/43)).
  - Cập nhật đa ngôn ngữ i18n hỗ trợ đầy đủ các thuật ngữ TV Mode và Ambient Player ([Issue #43](https://github.com/tamld/tuneflow/issues/43)).
- **Kiểm Thử & Đảm Bảo Chất Lượng**:
  - Bổ sung bộ kiểm thử tự động `tests/tv-leanback.test.js` kiểm tra điều hướng không gian, giới hạn biên và bộ chuyển trạng thái máy.
  - Toàn bộ 95/95 ca kiểm thử tự động trong 26 bộ test suite chạy xanh 100%.

---

## [2.0.0] - 2026-09-09

### Đã Thêm (Added)
- **Tiện Ích Mở Rộng Trình Duyệt Browser Extension (Manifest V3 - Phase 6)**:
  - Triển khai trọn bộ Chrome/Edge Browser Extension (`extension/`) đạt chuẩn Manifest V3 không xâm phạm quyền riêng tư ([Issue #42](https://github.com/tamld/tuneflow/issues/42)).
  - Content script (`extension/content.js`) tự động tiêm nút tải 1-chạm màu vàng nổi bật ("🎵 Tải MP3 TuneFlow") trực tiếp dưới tiêu đề video trên trang phát YouTube (`youtube.com/watch?v=...`).
  - Background Service Worker (`extension/background.js`) giao tiếp nền với máy chủ TuneFlow cục bộ (`http://localhost:3000` / `http://tuneflow.local:3000`), bắt lỗi mất kết nối máy chủ và hiển thị thông báo tiến độ trực quan.
  - Giao diện Popup cài đặt thân thiện (`extension/popup.html`, `extension/popup.js`, `extension/popup.css`) hỗ trợ cấu hình địa chỉ máy chủ tùy biến, kiểm tra tình trạng kết nối thời gian thực và theo dõi danh sách bài đang tải.
  - Bộ biểu tượng nhận diện thương hiệu độ phân giải cao (`extension/icons/` 16px, 48px, 128px) chuẩn Chrome Web Store.
- **Khung Pháp Lý Bản Quyền & Chính Sách Vận Hành (Legal Compliance & Safe Harbor)**:
  - Tài liệu pháp lý toàn diện `docs/LEGAL_COMPLIANCE.md` quy định rõ ranh giới bản quyền MIT License, quyền sử dụng hợp pháp cá nhân (Personal Fair Use), điều khoản dịch vụ YouTube ToS và cơ chế gỡ bỏ bản quyền DMCA 512 Safe Harbor ([Issue #42](https://github.com/tamld/tuneflow/issues/42)).
  - Phân định rõ chiến lược thương mại hóa Appliance/Tooling phần cứng gia đình, cấm kinh doanh thương mại nội dung âm thanh có bản quyền.
- **Kiểm Thử & Đảm Bảo Chất Lượng**:
  - Bổ sung bộ kiểm thử tự động `tests/extension.test.js` kiểm tra cấu trúc Manifest V3, phân quyền tối thiểu (zero-intrusive permissions), tệp nội dung và tài liệu tuân thủ pháp lý.
  - Toàn bộ 87/87 ca kiểm thử tự động trong 25 bộ suite chạy xanh 100%.

---

## [1.4.0] - 2026-09-09

### Đã Thêm (Added)
- **Kiến trúc Hybrid Client-Server Compute & Web Audio API (Phase 5)**:
  - Tích hợp bộ xử lý âm thanh số Web Audio API (3-Band BiquadFilter Equalizer) với các chế độ tùy biến: "🗣️ Trong Rõ" (tăng giọng hát, giảm ù rè), "☕ Trầm Ấm" (tối ưu cho Bolero, nhạc quê hương), "🎛️ Chuẩn" ([Issue #38](https://github.com/tamld/tuneflow/issues/38)).
  - Bổ sung bộ khuếch đại âm lượng (Volume Booster 100% - 150%) kết hợp `DynamicsCompressorNode` chống méo tiếng/rè loa ([Issue #38](https://github.com/tamld/tuneflow/issues/38)).
  - Trình hiển thị sóng âm phổ động (Real-time Canvas Frequency Visualizer) trên thanh phát nhạc với giao diện tương phản cao SilverMelody ([Issue #38](https://github.com/tamld/tuneflow/issues/38)).
  - Nâng cấp luồng Zero-Disk Direct Stream `GET /api/stream/pipe/:id` hỗ trợ Range headers và ngắt luồng an toàn khi đóng kết nối ([Issue #38](https://github.com/tamld/tuneflow/issues/38)).
  - Đa ngôn ngữ i18n cho các nút điều khiển âm thanh mới trên thanh phát nhạc ([Issue #38](https://github.com/tamld/tuneflow/issues/38)).
- **Vận Hành Container & Tự Động Cập Nhật yt-dlp (Container Ops & Maintenance)**:
  - API chẩn đoán hệ thống `GET /api/system/status` cung cấp thông tin thời gian thực về phiên bản `yt-dlp`, FFmpeg, Node.js, bộ nhớ RAM, thời gian chạy và dung lượng lưu trữ đĩa ([Issue #39](https://github.com/tamld/tuneflow/issues/39)).
  - API cập nhật nóng `POST /api/system/update-ytdlp` cho phép cập nhật nhị phân `yt-dlp` ngay trên máy chủ container mà không cần rebuild container image ([Issue #39](https://github.com/tamld/tuneflow/issues/39)).
  - Bổ sung script bảo trì `scripts/update-ytdlp.sh` và `scripts/update-ytdlp.ps1` cho quản trị viên homelab ([Issue #39](https://github.com/tamld/tuneflow/issues/39)).
  - Cấu hình phân quyền `node` user trong Dockerfile và bổ sung `healthcheck` chuẩn trong `docker-compose.yml` ([Issue #39](https://github.com/tamld/tuneflow/issues/39)).
- **Kiểm Thử & Đảm Bảo Chất Lượng**:
  - Bổ sung bộ kiểm thử `tests/stream-webaudio.test.js` và `tests/system-ops.test.js` nâng tổng số bài test tự động lên 48/48 ca kiểm thử xanh 100%.

---

## [1.3.0] - 2026-09-06

### Đã Thêm (Added)
- **Bảo mật & Phòng vệ OWASP (Security Hardening)**:
  - Khắc phục triệt để DOM-based XSS trong giao diện với cơ chế `textContent` và `escapeHtml` an toàn ([Issue #4](https://github.com/tamld/tuneflow/issues/4)).
  - Bổ sung xác thực Whitelist Domain và regex ID video chống tấn công SSRF & command injection ([Issue #5](https://github.com/tamld/tuneflow/issues/5)).
  - Tích hợp Helmet bảo mật HTTP headers, sliding-window rate limiting chống lạm dụng API và path traversal protection cho tệp tải về ([Issue #6](https://github.com/tamld/tuneflow/issues/6)).
  - Pinned phiên bản nhị phân `yt-dlp` kiểm tra mã băm SHA-256 trong Dockerfile và lá chắn bắt lỗi toàn cục `uncaughtException`/`unhandledRejection` ([Issue #25](https://github.com/tamld/tuneflow/issues/25)).
  - Hỗ trợ cơ chế nạp cookies (`YTDLP_COOKIES_PATH`), proxy và extractor arguments để vượt qua kiểm tra chống bot YouTube ([Issue #23](https://github.com/tamld/tuneflow/issues/23)).
- **Tối ưu Hiệu năng Lõi (Core Performance & Resiliency)**:
  - Giảm tải Event Loop CPU với throttle SSE broadcast 300ms/2% tiến độ ([Issue #7](https://github.com/tamld/tuneflow/issues/7)).
  - Quản lý hạn mức dung lượng đĩa `MAX_STORAGE_MB` (FIFO pruning) và bộ nhớ đệm tìm kiếm LRU Cache ([Issue #8](https://github.com/tamld/tuneflow/issues/8)).
  - Loại bỏ nhân đôi Disk I/O bằng cách pipe stream trực tiếp `yt-dlp stdout -> ffmpeg stdin` ([Issue #21](https://github.com/tamld/tuneflow/issues/21)).
  - Graceful shutdown toàn diện với tín hiệu SIGTERM/SIGINT dọn dẹp tiến trình con mồ côi và tệp `.part` dở dang ([Issue #22](https://github.com/tamld/tuneflow/issues/22)).
- **Nâng cấp Trải nghiệm SilverMelody UX & Trợ Năng Cho Bố Mẹ (Elderly UX/A11y)**:
  - Modal hướng dẫn 3 bước trực quan thay thế hộp thoại alert mặc định ([Issue #10](https://github.com/tamld/tuneflow/issues/10)).
  - Khay trượt hàng đợi tải cố định (Persistent Queue Drawer) theo dõi tiến độ tải mọi lúc ([Issue #9](https://github.com/tamld/tuneflow/issues/9)).
  - Tải 1-click toàn bộ bài hát yêu thích về máy tính Bố Mẹ ([Issue #11](https://github.com/tamld/tuneflow/issues/11)).
  - Nút xóa từ khóa tìm kiếm nhanh, nút điều chỉnh âm lượng/lặp lại trên thanh phát nhạc và bộ phóng to cỡ chữ 4 cấp độ (90% - 130%) cho người viễn thị ([Issue #12](https://github.com/tamld/tuneflow/issues/12)).
  - Chế độ tự động phát liên tục (Autoplay/Radio), tích hợp MediaSession API hiển thị trên màn hình khóa và hẹn giờ ngủ tắt dần âm lượng ([Issue #16](https://github.com/tamld/tuneflow/issues/16)).
  - Stream proxy trung gian hỗ trợ HTTP 206 Partial Content và Range headers loại bỏ triệt để lỗi 403 Forbidden từ CDN YouTube ([Issue #20](https://github.com/tamld/tuneflow/issues/20)).
  - Khử trùng race condition tìm kiếm bằng `AbortController` và xử lý an toàn lỗi `AbortError` của Audio playback ([Issue #24](https://github.com/tamld/tuneflow/issues/24)).
  - Hỗ trợ bấm trực tiếp vào ảnh bìa (thumbnail) hoặc tiêu đề bài hát để phát nhạc ngay lập tức với hiệu ứng viền vàng nổi bật ([Issue #26](https://github.com/tamld/tuneflow/issues/26)).
  - Hệ thống đa ngôn ngữ Tiếng Việt & Tiếng Anh (i18n) với các bộ sưu tập nhạc bản địa hóa dành riêng cho Bố và Mẹ ([Issue #19](https://github.com/tamld/tuneflow/issues/19)).
- **Mở rộng Kiến trúc Di động & Android TV (Mobile & TV Ecosystem)**:
  - Bản ghi Quyết định Kiến trúc [ADR-0012](docs/adr/ADR-0012-android-mobile-and-tv-leanback-architecture.md) và Đặc tả [SPEC-0007](docs/spec/SPEC-0007-android-tv-and-mobile-client.md) cho Android Phone & Android TV D-Pad remote navigation ([Issue #17](https://github.com/tamld/tuneflow/issues/17)).
- **Tự động hóa CI/CD & Cổng Kiểm Thử Chất Lượng (Quality Gates & CI/CD)**:
  - Tích hợp chuẩn linter ESLint 10, đo lường độ bao phủ kiểm thử (`npm run test:coverage`) và dynamic port trong Puppeteer E2E test ([Issue #15](https://github.com/tamld/tuneflow/issues/15)).
  - Bổ sung kiểm thử smoke test tự động build container và kiểm tra healthcheck trong GitHub Actions CI ([Issue #14](https://github.com/tamld/tuneflow/issues/14)).
  - Thiết lập cổng kiểm thử Pre-Flight Gate bắt buộc trước khi tạo GitHub Release tự động ([Issue #13](https://github.com/tamld/tuneflow/issues/13)).
  - Workflow GitHub Actions tự động build APK, ký số Keystore, sinh bảng băm SHA-256 và đính kèm vào bản phát hành ([Issue #18](https://github.com/tamld/tuneflow/issues/18)).

---

## [1.2.0] - 2026-09-06

### Đã Thêm (Added)
- **Trích xuất & Tải hàng loạt danh sách phát YouTube (Playlist Batch Download)**:
  - API `POST /api/playlist/parse`: Trích xuất danh sách video nhanh (tối đa 50 mục) qua `yt-dlp --flat-playlist` mà không cần tải video thô.
  - API `POST /api/queue/batch-add`: Đưa nhiều bài hát vào hàng đợi xử lý nền có kiểm soát giới hạn tài nguyên máy chủ (`MAX_CONCURRENT_DOWNLOADS = 2`).
  - Giao diện người dùng: Tự động phát hiện liên kết danh sách phát (`list=...`), hiển thị bảng xem trước (modal/panel), cho phép chọn lọc tất cả hoặc từng bài hát, và tải hàng loạt chỉ với 1 chạm.
- **Tính toán & Xác thực Tính toàn vẹn tệp (SHA-256 Checksum)**:
  - Tự động tính toán mã băm SHA-256 (`crypto.createHash('sha256')`) ngay sau khi FFmpeg chuyển mã MP3 hoàn tất.
  - Đính kèm mã băm vào siêu dữ liệu hàng đợi và trả về qua HTTP headers: `x-tuneflow-checksum` và `ETag` khi client tải tệp về.
  - Đảm bảo tính toàn vẹn 100%, không bị hỏng tệp hay đứt gãy trong quá trình truyền tải.
- **Bộ Lọc Persona & Thể Loại Cho Gia Đình (Family Persona & Mood Filtering)**:
  - 3 Persona lớn: "🌸 Mẹ Hay Nghe" (Nhạc Vàng, Dân Ca, Tân Cổ), "☕ Bố Hay Nghe" (Nhạc Trịnh, Tiền Chiến, Bolero Trữ Tình), "❤️ Bài Đã Thích" (Danh sách bài hát yêu thích cá nhân).
  - Chip lọc nhanh "🎤 Nhạc có lời" / "🎻 Nhạc không lời (Hòa tấu/Guitar/Saxophone)" thích hợp cho người cao tuổi thư giãn, uống trà hoặc tập dưỡng sinh.
  - API `GET /api/curation/presets`: Cung cấp cấu hình các danh mục nhạc mặc định chuẩn hóa.
- **Quản lý Bài hát Yêu thích Cục bộ (Zero-Login LocalStorage Favorites)**:
  - Lưu trữ và đồng bộ danh sách bài hát yêu thích trực tiếp trên trình duyệt của người dùng qua `localStorage` (`tuneflow_favorites`).
  - Đảm bảo quyền riêng tư tuyệt đối, hoạt động tức thì mà không cần tài khoản hay cơ sở dữ liệu cồng kềnh.
- **Bộ kiểm thử tự động mới (Automated Test Suites)**:
  - `tests/checksum.test.js`: Kiểm thử trích xuất hash SHA-256, kiểm tra tính toàn vẹn và HTTP response header.
  - `tests/playlist.test.js`: Kiểm thử phân tích metadata danh sách phát, giới hạn trích xuất, và batch queue ingestion.

### Đã Sửa (Fixed)
- Đóng toàn bộ kết nối keep-alive và hủy tiến trình yt-dlp nền kịp thời trong các test hook (`queue.cancel()` + `server.closeAllConnections()`) giúp tối ưu thời gian chạy toàn bộ bộ test.
- Tối ưu hóa phản hồi giao diện khi tải hàng loạt mà không làm giật lag trình duyệt.

---

## [1.1.0] - 2026-09-06

### Đã Thêm (Added)
- **Bộ tài liệu kỹ thuật & quản trị toàn diện**:
  - `docs/PRD.md`: Tài liệu Yêu cầu Sản phẩm cho Bố Mẹ & Quản trị viên Homelab.
  - `docs/SRS.md`: Đặc tả Yêu cầu Phần mềm chuẩn IEEE 830 / ISO 29148.
  - `docs/FSM.md`: Đặc tả Máy Trạng Thái Hữu Hạn cho Hàng đợi, Trình phát nhạc và Luồng chuyển giao tệp (kèm sơ đồ Mermaid).
  - `docs/DoD.md`: Tiêu chuẩn Hoàn thành (Definition of Done) nghiêm ngặt.
  - `docs/DoR.md`: Tiêu chuẩn Sẵn sàng (Definition of Ready).
  - `docs/AC.md`: Tiêu chí Nghiệm thu BDD (Given - When - Then) cho 5 nhóm tính năng cốt lõi.
  - Bộ 6 bản ghi Quyết định Kiến trúc (`docs/adr/ADR-0001` đến `ADR-0006`).
- **Bộ Kiểm Thử Toàn Diện (Happy, Edge, Worst Cases)**:
  - `tests/suite-happy.test.js`: Kiểm thử đường thuận (Format duration, API Health, Xếp hàng tải, Đồng bộ danh sách).
  - `tests/suite-edge.test.js`: Kiểm thử trường hợp biên (Tiếng Việt có dấu, tiêu đề dài > 200 ký tự, ký tự đặc biệt, khử trùng tên tệp Windows reserved, deduplication tức thì, dọn dẹp bộ nhớ đệm).
  - `tests/suite-worst.test.js`: Kiểm thử sự cố (Từ khóa rỗng, URL không hợp lệ, giới hạn đồng thời `MAX_DOWNLOADS = 2`, hủy tác vụ đang chạy, xử lý lỗi an toàn).
- **Tính năng & Khắc phục nợ kỹ thuật (Technical Debt Resolved)**:
  - Tự động dọn dẹp tệp cũ sau 24 giờ (`cleanupOldFiles` theo cấu hình `DOWNLOAD_TTL_HOURS`) để chống đầy đĩa máy chủ ([Issue #1](https://github.com/tamld/tuneflow/issues/1)).
  - Tự động phát hiện tệp MP3 đã tồn tại để trả kết quả `completed` ngay lập tức trong < 100ms mà không cần tải lại ([Issue #2](https://github.com/tamld/tuneflow/issues/2)).
  - Chuẩn hóa và bảo vệ tên tệp chống lỗi hệ điều hành Windows/Linux với các từ khóa `CON`, `PRN`, `AUX`, `NUL` và giới hạn tối đa 120 ký tự ([Issue #3](https://github.com/tamld/tuneflow/issues/3)).
  - Nâng cấp `formatDuration` hỗ trợ hiển thị đầy đủ định dạng `HH:MM:SS` cho các tuyển tập nhạc dài trên 1 tiếng.

### Đã Sửa (Fixed)
- Khắc phục lỗi vòng lặp hẹn giờ (Spinlock `setTimeout`) trong bộ điều phối hàng đợi `processNext()`, chuyển đổi sang cơ chế kích hoạt phản xạ (Reactive Promise Chaining).
- Đóng toàn bộ kết nối keep-alive (`server.closeAllConnections`) trong teardown hook của bộ test để bảo đảm tiến trình thoát sạch sẽ.

---

## [1.0.0] - 2026-09-06

### Đã Thêm (Added)
- Phát hành phiên bản đầu tiên của **TuneFlow**:
  - Giao diện người cao tuổi **SilverMelody** (WCAG 2.2 AAA, nút bấm $\ge 56\text{px}$, 100% tiếng Việt).
  - 5 nút gợi ý thể loại nhạc quen thuộc 1-chạm (Nhạc Vàng 1975, Tân Cổ, Nhạc Trịnh, Nhạc Thiền, Ca Cổ).
  - Trình phát nghe thử trực tiếp dưới đáy màn hình (Sticky Bottom Audio Player) với luồng stream tức thì qua `yt-dlp -g`.
  - Công cụ chuyển mã âm thanh chất lượng cao MP3 320kbps chuẩn phòng thu nhúng ID3 tags qua `FFmpeg`.
  - Cơ chế tự động chuyển giao tệp về máy tính người dùng qua HTTP `Content-Disposition: attachment`.
  - Docker container siêu nhẹ (<120MB) dựa trên Alpine Linux 3.21 và Node.js 22 LTS với người dùng non-root `node`.
  - Pipeline GitHub Actions CI tự động và Release đa kiến trúc (`linux/amd64`, `linux/arm64`) đẩy lên GitHub Container Registry (`ghcr.io/tamld/tuneflow`).
