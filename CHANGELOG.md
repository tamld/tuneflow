# Nhật Ký Thay Đổi (Changelog)
Mọi thay đổi đáng chú ý của dự án **TuneFlow** sẽ được ghi chép chi tiết trong tệp này theo chuẩn [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) và tuân thủ [Semantic Versioning](https://semver.org/).

---

## [1.1.0] - 2026-09-06

### Đã Thêm (Added)
- **Bộ tài liệu kỹ thuật & quản trị toàn diện**:
  - `docs/PRD.md`: Tài liệu Yêu cầu Sản phẩm cho Ba Mẹ & Quản trị viên Homelab.
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
