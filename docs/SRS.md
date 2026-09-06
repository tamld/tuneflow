# Đặc Tả Yêu Cầu Phần Mềm (Software Requirements Specification - SRS)
## Hệ Thống: TuneFlow (YouTube to MP3 / MP4 Converter & Audio Player)

> **Mã tài liệu**: `TUNEFLOW-SRS-01`  
> **Chuẩn tuân thủ**: IEEE 830 / ISO 29148  
> **Phiên bản**: `1.0.0`  
> **Ngày phê duyệt**: 2026-09-06  

---

## 1. Giới Thiệu (Introduction)

### 1.1 Mục đích
Tài liệu này xác định đầy đủ các đặc tả chức năng, giao diện bên ngoài, hiệu năng, bảo mật và các ràng buộc thiết kế của hệ thống **TuneFlow**.

### 1.2 Phạm vi hệ thống
TuneFlow là ứng dụng Web Full-stack bao gồm:
- **Tầng Client (Frontend)**: Giao diện web đơn trang (SPA) tối ưu công thái học người cao tuổi, viết bằng HTML5/CSS3/Vanilla ES6, không phụ thuộc các framework cồng kềnh.
- **Tầng Server (Backend Engine)**: Dịch vụ Node.js Express điều phối hàng đợi tải, tích hợp các công cụ nhị phân `yt-dlp` và `FFmpeg` để xử lý âm thanh.
- **Tầng Đóng Gói (Infrastructure)**: Docker container nền tảng Alpine Linux tích hợp sẵn nhãn Traefik cho cụm máy chủ gia đình (Self-Hosted).

---

## 2. Mô Tả Tổng Quan (Overall Description)

### 2.1 Kiến trúc tổng thể (Architecture Overview)

```text
[Trình duyệt Ba Mẹ]
       │
       ▼ (HTTP / SSE)
[Traefik Reverse Proxy :80/:443]
       │
       ▼ (Private Network)
[TuneFlow Node.js Server :3000]
       ├── Express Router (/api/search, /api/preview, /api/queue, /api/download)
       ├── Download Queue Controller (Concurrency Limit = 2, Retry = 3)
       ├── yt-dlp Process Wrapper (Safe Argument Array with '--')
       └── FFmpeg Audio Transcoder (libmp3lame 320kbps + ID3v2 tags)
               │
               ▼
       [Local Temp /app/downloads/temp] ──► [Final /app/downloads]
```

### 2.2 Ràng buộc thiết kế & vận hành (Constraints)
1. **Ràng buộc phần cứng**:
   - máy chủ: Node x86_64 (x86_64 / ARM64).
   - Bộ nhớ cấp phát tối đa cho container: 256MB RAM.
   - Dung lượng ổ đĩa khả dụng: Phải có cơ chế tự dọn dẹp các tệp cũ tránh làm đầy ổ lưu trữ server.
2. **Ràng buộc tương thích**:
   - Trình duyệt khách hàng: Google Chrome $\ge 110$, Microsoft Edge $\ge 110$, Firefox $\ge 115$, Safari trên iPad $\ge 16$.
   - JavaScript Runtime: Node.js 22 LTS (Alpine Linux).

---

## 3. Đặc Tả Chi Tiết Chức Năng (Detailed Functional Requirements)

### Chức năng F-01: Tìm Kiếm Video & Danh Sách Phát YouTube (Search Engine)
- **Mã yêu cầu**: `REQ-FUNC-01`
- **Mô tả**: Cho phép người dùng tìm kiếm bài hát theo từ khóa tiếng Việt có dấu, hoặc trích xuất thông tin trực tiếp từ đường link YouTube video/playlist.
- **Đầu vào**: Chuỗi truy vấn `q` (bắt buộc), tùy chọn `sp` (sắp xếp), `limit` (mặc định 10 kết quả).
- **Xử lý**:
  - Gọi lệnh `yt-dlp` với cờ `--flat-playlist --dump-json --js-runtimes node:node`.
  - Phân tích cú pháp từng dòng JSON để chuẩn hóa: `id`, `title`, `uploader`, `duration`, `thumbnail`, `url`.
- **Đầu ra**: Mảng JSON chứa danh sách bài hát hoặc mã lỗi tiếng Việt thân thiện nếu không tìm thấy.

### Chức năng F-02: Nghe Thử Trực Tiếp Không Tải Toàn Bộ (In-App Audio Preview)
- **Mã yêu cầu**: `REQ-FUNC-02`
- **Mô tả**: Cung cấp luồng âm thanh tức thì để trình phát nhạc của trình duyệt có thể chơi nhạc sau dưới 1.5 giây mà không cần tải cả file video dung lượng lớn về server.
- **Đầu vào**: Video ID (ví dụ: `_HUpk4c9n2Y`).
- **Xử lý**:
  - Gọi `yt-dlp -g -f ba/b --js-runtimes node:node` để trích xuất URL phát lại trực tiếp từ máy chủ nội dung của YouTube (`googlevideo.com`).
  - Gửi mã HTTP `302 Found` chuyển hướng trình duyệt tới URL luồng âm thanh hoặc chuyển tiếp luồng dữ liệu âm thanh.
- **Đầu ra**: Trình phát nhạc dưới đáy màn hình chuyển sang trạng thái đang chơi và hiển thị thanh thời gian.

### Chức năng F-03: Hàng Đợi Tải & Kiểm Soát Tải Đồng Thời (Asynchronous Queue)
- **Mã yêu cầu**: `REQ-FUNC-03`
- **Mô tả**: Quản lý các yêu cầu tải bài hát, khống chế số lượng tác vụ đồng thời để bảo vệ CPU máy chủ.
- **Quy tắc nghiệp vụ**:
  - Số tác vụ tải/convert tối đa chạy cùng lúc: `MAX_CONCURRENT_DOWNLOADS = 2`.
  - Trạng thái chuyển đổi: `queued` ➔ `downloading` ➔ `converting` ➔ `completed`.
  - Nếu xảy ra lỗi mạng: Tự động thử lại tối đa 3 lần với khoảng thời gian chờ tăng dần.
  - Tệp tải dở dang (`*.part`) được giữ lại trong thư mục tạm `downloads/temp/` để tiếp tục tải bù.

### Chức năng F-04: Mã Hóa Âm Thanh Chuẩn Phòng Thu & ID3 Tags (Audio Transcoding)
- **Mã yêu cầu**: `REQ-FUNC-04`
- **Mô tả**: Chuyển đổi luồng âm thanh tải về sang định dạng MP3 chất lượng cao nhất phục vụ người lớn tuổi nghe trên loa và ô tô.
- **Tham số FFmpeg**:
  - Codec: `libmp3lame`.
  - Bitrate: `320 kbps` hằng số (CBR) hoặc chất lượng cao nhất VBR Q0.
  - Tần số lấy mẫu (Sample Rate): `44.1 kHz` chuẩn CD âm thanh.
  - Siêu dữ liệu ID3: Gắn thẻ `title` (Tên bài hát), `artist` (Tên nghệ sĩ/kênh tải), `album` ("TuneFlow Tuyển Chọn").

### Chức năng F-05: Đồng Bộ Trạng Thái Thời Gian Thực (Real-Time SSE Stream)
- **Mã yêu cầu**: `REQ-FUNC-05`
- **Mô tả**: Cập nhật tiến độ tải theo thời gian thực tới tất cả các trình duyệt đang mở mà không cần polling liên tục.
- **Cơ chế**: Sử dụng giao thức **Server-Sent Events (SSE)** tại endpoint `/api/queue/stream`.
- **Dữ liệu truyền**: JSON snapshot của toàn bộ hàng đợi mỗi khi có thay đổi trạng thái hoặc tiến độ tải tăng lên.

### Chức năng F-06: Tự Động Chuyển Giao Tệp Về Trình Duyệt Khách (Client Delivery)
- **Mã yêu cầu**: `REQ-FUNC-06`
- **Mô tả**: Đảm bảo tệp MP3 lưu trên máy chủ Homelab được chuyển tự động vào thư mục `Downloads` của máy tính Ba Mẹ.
- **Cơ chế**:
  - Khi nhận sự kiện SSE với trạng thái `completed`, client tự động tạo một thẻ neo ẩn `<a download href="/api/download/:id/file">` và kích hoạt sự kiện click.
  - Server phản hồi với các tiêu đề HTTP chuẩn:
    ```http
    Content-Type: audio/mpeg
    Content-Disposition: attachment; filename="[Ten_Bai_Hat].mp3"
    ```

---

## 4. Đặc Tả Giao Diện Người Dùng (UI / UX Specifications)

- **Chuẩn công thái học**: **SilverMelody Design System**.
- **Kích thước nút bấm**: Chiều cao $\ge 50\text{px}$, độ dày viền $\ge 2\text{px}$, hiệu ứng phản hồi xúc giác cơ học `transform: scale(0.98)`.
- **Độ tương phản màu sắc**:
  - Nền chính: `#13141c` (Đen than chì ấm).
  - Khối chứa: `#1e202b` (Tối dịu mắt).
  - Văn bản chính: `#f3f4f6` (Trắng ngà, tỷ lệ tương phản $13.5:1$).
  - Điểm nhấn Tải về: `#f59e0b` (Hổ phách ấm, tỷ lệ $8.2:1$).
  - Điểm nhấn Nghe thử: `#10b981` (Xanh ngọc lục bảo, tỷ lệ $7.4:1$).
- **Ngôn ngữ**: 100% tiếng Việt đại chúng, không thuật ngữ lập trình.
