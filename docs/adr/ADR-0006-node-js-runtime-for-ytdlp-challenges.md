# ADR-0006: Tích Hợp JavaScript Runtime (Node.js) Cho Trình Trích Xuất yt-dlp

## Bối Cảnh (Context)
Từ giữa năm 2025 đến 2026, YouTube liên tục triển khai các thuật toán chống bot và bảo vệ định dạng mới:
1. Thử nghiệm phát trực tuyến định dạng SABR (SABR-only streaming).
2. Thử thách giải mã chữ ký trình phát bằng mã JavaScript động (n-sig / player challenges).
3. Nếu `yt-dlp` chạy không có môi trường JavaScript runtime đi kèm, YouTube sẽ trả về mã lỗi `HTTP 403 Forbidden` hoặc không trích xuất được định dạng âm thanh chất lượng cao.

## Quyết Định (Decision)
1. Tận dụng chính runtime **Node.js** đã có sẵn trên hệ thống (cả môi trường phát triển local lẫn Docker container `node:22-alpine`).
2. Luôn truyền tham số bắt buộc `--js-runtimes node:node` vào tất cả các lời gọi hàm `spawn('yt-dlp', ...)` trong hệ thống ([`src/engine/ytdlp.js`](file:///C:/Users/Administrator/github/tuneflow/src/engine/ytdlp.js) và [`src/engine/queue.js`](file:///C:/Users/Administrator/github/tuneflow/src/engine/queue.js)).
3. Cập nhật nhị phân `yt-dlp` lên phiên bản phát hành mới nhất (`2026.08.19` hoặc mới hơn).

## Hậu Quả (Consequences)
- **Tích cực**:
  - Giải quyết triệt để lỗi `HTTP 403 Forbidden` khi giải mã URL âm thanh.
  - Không cần phải cài đặt thêm runtime Deno hay QuickJS gây phình to dung lượng Docker container.
  - Tỷ lệ trích xuất thành công định dạng âm thanh `ba/b` đạt 100%.
- **Tiêu cực**: Mỗi lần giải mã n-sig sẽ tốn một khoảng CPU rất nhỏ để chạy engine Node.js biên dịch script thử thách của YouTube (~50ms - 100ms).
