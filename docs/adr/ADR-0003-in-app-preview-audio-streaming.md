# ADR-0003: Cơ Chế Phát Nghe Thử Trực Tiếp (Direct Audio Stream Redirect vs Server Proxy)

## Bối Cảnh (Context)
Người lớn tuổi muốn nghe thử bài hát để xác nhận đúng ca khúc và ca sĩ trước khi tải. Nếu server tải toàn bộ video về server rồi mới cho nghe thử:
1. Sẽ mất từ 30 giây đến 2 phút chờ đợi tải xuống.
2. Làm lãng phí băng thông và chiếm dụng hàng đợi CPU của Homelab server cho một bài hát mà người dùng có thể bấm nghe 5 giây rồi tắt.

## Quyết Định (Decision)
Triển khai endpoint `/api/preview/:id` sử dụng tính năng trích xuất luồng trực tiếp của `yt-dlp`:
1. Chạy `yt-dlp -g -f ba/b --js-runtimes node:node` để lấy URL luồng âm thanh gốc từ CDN Google Video (`googlevideo.com`).
2. Server phản hồi HTTP `302 Found` chuyển hướng trực tiếp trình duyệt đến URL này.
3. Đối tượng HTML5 `Audio()` của trình duyệt trực tiếp streaming các dải byte âm thanh về máy để phát.

## Hậu Quả (Consequences)
- **Tích cực**:
  - Âm thanh phát lên sau chưa đầy **1.5 giây**.
  - Server Homelab hoàn toàn không phải tốn dung lượng đĩa và CPU để chuyển mã trong bước nghe thử.
- **Tiêu cực**: URL của Google Video có gắn kèm thời hạn token hết hạn (`expire=...`) và IP hash, chỉ có giá trị phát trong phiên hiện tại.
