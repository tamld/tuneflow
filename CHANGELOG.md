# Nhật Ký Thay Đổi (Changelog)
Mọi thay đổi đáng chú ý của dự án **TuneFlow** sẽ được ghi chép chi tiết trong tệp này theo chuẩn [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) và tuân thủ [Semantic Versioning](https://semver.org/).

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
  - Bản ghi Quyết định Kiến trúc [ADR-0012](file:///docs/adr/ADR-0012-android-mobile-and-tv-leanback-architecture.md) và Đặc tả [SPEC-0007](file:///docs/spec/SPEC-0007-android-tv-and-mobile-client.md) cho Android Phone & Android TV D-Pad remote navigation ([Issue #17](https://github.com/tamld/tuneflow/issues/17)).
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
