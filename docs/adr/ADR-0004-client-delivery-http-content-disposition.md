# ADR-0004: Cơ Chế Tự Động Chuyển Giao Tệp Về Trình Duyệt Khách (Content-Disposition Attachment)

## Bối Cảnh (Context)
Các giải pháp self-hosted Homelab thông thường lưu tệp sau khi tải về ổ đĩa của server (ví dụ: thư mục `/srv/music/` trên server node).
Rào cản lớn nhất: Bố Mẹ đang ngồi máy tính cá nhân trong phòng khách và không có kỹ năng truy cập SMB/NFS share hay dùng WinSCP/SSH để lấy tệp về máy tính của mình.

## Quyết Định (Decision)
Tích hợp quy trình chuyển giao tự động khép kín giữa Server-Sent Events (SSE) và HTTP Download:
1. Server sau khi hoàn thành chuyển mã FFmpeg sẽ lưu tệp trong `/app/downloads/` và phát sóng sự kiện SSE `{ status: 'completed', id: '...' }`.
2. Trình duyệt client khi nhận được sự kiện này sẽ tự động khởi tạo một thẻ HTML `<a>` ẩn:
   ```javascript
   const link = document.createElement('a');
   link.href = `/api/download/${song.id}/file`;
   link.download = `${song.title}.mp3`;
   link.click();
   ```
3. Endpoint `/api/download/:id/file` trên server gắn cờ tiêu đề:
   ```http
   Content-Type: audio/mpeg
   Content-Disposition: attachment; filename="[Tên bài hát].mp3"
   ```
4. Trình duyệt của Bố Mẹ nhận diện luồng binary và tự động kích hoạt tiến trình tải về thư mục `Downloads` của máy tính cá nhân.

## Hậu Quả (Consequences)
- **Tích cực**: Bố Mẹ chỉ cần bấm "Tải Về", sau khi nhạc chuyển đổi xong là tệp tự động rơi vào máy tính cá nhân. Xóa bỏ hoàn toàn khoảng cách giữa Server nội bộ và Client.
- **Tiêu cực**: Trình duyệt có thể hỏi quyền "Allow multiple downloads" nếu tải cả danh sách phát nhiều bài cùng lúc. Cần cơ chế đóng gói tệp ZIP nếu người dùng tải toàn bộ playlist (được lên kế hoạch trong v1.1).
