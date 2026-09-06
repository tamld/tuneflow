# Tiêu Chí Nghiệm Thu Chi Tiết (Acceptance Criteria - AC)
## Dự Án: TuneFlow

Mỗi tính năng được chuẩn hóa với các kịch bản nghiệm thu cụ thể theo định dạng BDD (Given - When - Then):

---

### AC-01: Tìm Kiếm & Nút Gợi Ý Nhạc 1-Chạm (US-01)
- **Kịch bản Happy Path**:
  - *Given*: Người dùng đang ở trang chủ TuneFlow.
  - *When*: Người dùng bấm vào nút gợi ý "Nhạc Vàng 1975".
  - *Then*: Ô tìm kiếm được điền từ khóa, giao diện hiển thị trạng thái *"Dạ, máy đang tìm kiếm các bài hát hay cho Bố Mẹ..."* và render danh sách từ 10 - 12 bài hát kèm ảnh đại diện lớn, tên ca sĩ và thời lượng sau $\le 3\text{ giây}$.
- **Kịch bản Edge Case (Ký tự tiếng Việt có dấu & Ký tự đặc biệt)**:
  - *Given*: Người dùng nhập từ khóa có dấu `"Trịnh Công Sơn #1 (Tuyển Chọn)"`.
  - *When*: Người dùng bấm nút "Tìm Bài Hát".
  - *Then*: Hệ thống mã hóa URL an toàn, `yt-dlp` tìm kiếm chính xác và trả về danh sách bài hát mà không xảy ra lỗi mã hóa ký tự.
- **Kịch bản Worst Case (Từ khóa rỗng hoặc chỉ có khoảng trắng)**:
  - *Given*: Ô tìm kiếm để trống.
  - *When*: Người dùng bấm nút "Tìm Bài Hát".
  - *Then*: Hệ thống không gửi request thừa, hiển thị thông báo nhẹ nhàng: *"Dạ, Bố Mẹ vui lòng nhập tên bài hát hoặc chọn một thể loại ở trên nhé!"*.

---

### AC-02: Trình Nghe Thử Trực Tiếp (In-App Preview Player - US-02)
- **Kịch bản Happy Path**:
  - *Given*: Danh sách kết quả tìm kiếm đang hiển thị.
  - *When*: Người dùng bấm nút "▶️ Nghe Thử Trước" ở một bài hát.
  - *Then*: Thanh phát nhạc cố định màu hổ phách dưới đáy màn hình bật lên, thẻ bài hát được viền sáng màu vàng, âm thanh bắt đầu vang lên trong vòng $\le 1.5\text{ giây}$.
- **Kịch bản Edge Case (Chuyển bài liên tục)**:
  - *Given*: Một bài hát đang phát nghe thử.
  - *When*: Người dùng liên tục bấm "Nghe Thử Trước" ở một bài hát khác.
  - *Then*: Bài cũ lập tức dừng lại, audio buffer cũ bị hủy bỏ, bài mới phát lên mà không xảy ra hiện tượng chồng chéo 2 luồng âm thanh.
- **Kịch bản Worst Case (Video bị giới hạn bản quyền hoặc không lấy được stream)**:
  - *Given*: Video YouTube có thiết lập bản quyền cấm trích xuất stream trực tiếp.
  - *When*: Người dùng bấm nghe thử.
  - *Then*: Hệ thống không làm đơ giao diện, chuyển trạng thái trình phát thành *"Dạ bài này đang bị giới hạn, Bố Mẹ thử chọn bài khác nhé!"*.

---

### AC-03: Hàng Đợi Tải & Kiểm Soát Tải Đồng Thời (US-06)
- **Kịch bản Happy Path**:
  - *Given*: Hàng đợi đang trống (`activeCount = 0`).
  - *When*: Người dùng bấm "⬇️ Tải Về Máy (MP3)".
  - *Then*: Bài hát được thêm vào hàng đợi với trạng thái `queued`, sau đó chuyển ngay sang `downloading` trong vòng 100ms.
- **Kịch bản Edge Case (Xếp hàng vượt mức tối đa 2 tác vụ)**:
  - *Given*: Có 2 tác vụ đang trong trạng thái `downloading` / `converting`.
  - *When*: Người dùng bấm tải thêm bài thứ 3 và thứ 4.
  - *Then*: Bài thứ 3 và thứ 4 giữ nguyên trạng thái `queued`. Khi một trong hai bài đầu hoàn thành, bài tiếp theo tự động kích hoạt chuyển sang `downloading`.
- **Kịch bản Worst Case (Người dùng bấm Hủy tải giữa chừng)**:
  - *Given*: Bài hát đang tải được 50%.
  - *When*: Người dùng bấm nút "Hủy".
  - *Then*: Server gửi tín hiệu `SIGTERM` hủy tiến trình `yt-dlp`, giải phóng slot tải ngay lập tức, tệp dở dang `.part` được giữ nguyên để có thể tải tiếp sau này.

---

### AC-04: Mã Hóa Âm Thanh Chuẩn Phòng Thu (US-03, US-04)
- **Kịch bản Happy Path**:
  - *Given*: Luồng âm thanh tải về hoàn tất trong thư mục tạm.
  - *When*: FFmpeg thực hiện transcode.
  - *Then*: Tệp đích sinh ra trong `downloads/` có đuôi `.mp3`, tốc độ bit đạt $320\text{ kbps}$, nhúng đầy đủ thẻ ID3 `title` và `artist`.
- **Kịch bản Edge Case (Tên bài hát chứa ký tự cấm của hệ điều hành)**:
  - *Given*: Tên video YouTube chứa các ký tự `\ / : * ? " < > |`.
  - *When*: Hệ thống đặt tên tệp MP3.
  - *Then*: Hàm `sanitizeTitle()` tự động làm sạch các ký tự cấm, chuyển thành dấu gạch ngang hoặc khoảng trắng, tệp được tạo hợp lệ trên cả Windows, Linux và macOS.

---

### AC-05: Tự Động Chuyển Giao Tệp Về Máy Cá Nhân (US-03)
- **Kịch bản Happy Path**:
  - *Given*: Trình duyệt client đang mở và kết nối SSE.
  - *When*: Server thông báo sự kiện bài hát đã `completed`.
  - *Then*: Trình duyệt tự động kích hoạt tải tệp `/api/download/:id/file`, tệp MP3 xuất hiện trong thư mục `Downloads` của máy tính Bố Mẹ mà không cần bất kỳ thao tác thủ công nào.
