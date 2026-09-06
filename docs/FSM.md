# Đặc Tả Máy Trạng Thái Hữu Hạn (Finite State Machine - FSM)
## Dự Án: TuneFlow

> **Mã tài liệu**: `TUNEFLOW-FSM-01`  
> **Phiên bản**: `1.0.0`  
> **Mục tiêu**: Định nghĩa hình thức và trực quan hóa các chu kỳ trạng thái của hệ thống tải, trình phát nhạc và luồng chuyển giao tệp.

---

## 1. Máy Trạng Thái Hàng Đợi Tải Xuống (Download Queue FSM)

Mỗi tác vụ tải trong hệ thống tuân thủ một chu trình trạng thái đơn hướng có điểm dừng và khả năng phục hồi lỗi nghiêm ngặt:

```mermaid
stateDiagram-v2
    [*] --> QUEUED: Người dùng bấm "Tải Về Máy"
    
    QUEUED --> DOWNLOADING: Hàng đợi kích hoạt (Đồng thời < 2)
    QUEUED --> CANCELLED: Người dùng bấm "Hủy"
    
    state DOWNLOADING {
        [*] --> FETCH_METADATA
        FETCH_METADATA --> DOWNLOAD_STREAM: Lấy link stream
        DOWNLOAD_STREAM --> WRITE_PART_FILE: Ghi vào downloads/temp/*.part
        WRITE_PART_FILE --> DOWNLOAD_STREAM: Cập nhật tiến độ 0% - 85%
    }
    
    DOWNLOADING --> CONVERTING: Tải luồng thô hoàn tất (100%)
    DOWNLOADING --> RETRYING: Lỗi mạng / Timeout (Lần thử <= 3)
    DOWNLOADING --> CANCELLED: Người dùng hủy tiến trình (SIGTERM)
    DOWNLOADING --> FAILED: Lỗi nghiêm trọng / Không có quyền
    
    RETRYING --> DOWNLOADING: Chờ lũy tiến (Exponential Backoff)
    RETRYING --> FAILED: Vượt quá 3 lần thử
    
    state CONVERTING {
        [*] --> FFMPEG_TRANSCODE: Mã hóa libmp3lame 320kbps
        FFMPEG_TRANSCODE --> WRITE_ID3_TAGS: Nhúng ảnh bìa & nghệ sĩ
        WRITE_ID3_TAGS --> MOVE_FINAL_FILE: Di chuyển sang /app/downloads/
    }
    
    CONVERTING --> COMPLETED: Tệp MP3 sẵn sàng
    CONVERTING --> FAILED: Lỗi phân tích định dạng / Đầy đĩa
    
    COMPLETED --> [*]: Client nhận tệp qua HTTP
    FAILED --> [*]
    CANCELLED --> [*]
```

### Bảng Chuyển Trạng Thái Hàng Đợi (Queue State Transition Matrix)

| Trạng thái hiện tại | Sự kiện kích hoạt (Event) | Điều kiện bảo vệ (Guard) | Trạng thái tiếp theo | Hành động thực thi (Action) |
| :--- | :--- | :--- | :--- | :--- |
| `INITIAL` | `ENQUEUE_TASK` | URL hợp lệ, chưa đầy hàng đợi | `QUEUED` | Thêm vào Map, phát sự kiện SSE `broadcast()` |
| `QUEUED` | `DISPATCH_WORKER` | `activeCount < MAX_CONCURRENT_DOWNLOADS` | `DOWNLOADING` | Khởi chạy `yt-dlp` spawn child process |
| `QUEUED` | `USER_CANCEL` | Task ID tồn tại trong hàng đợi | `CANCELLED` | Cập nhật status, giải phóng tài nguyên |
| `DOWNLOADING` | `STREAM_CHUNK_RECEIVED`| Luồng stream đang tải | `DOWNLOADING` | Cập nhật phần trăm tiến độ, tốc độ MB/s |
| `DOWNLOADING` | `STREAM_FINISHED` | `code === 0` | `CONVERTING` | Gọi `FFmpeg` transcode 320kbps |
| `DOWNLOADING` | `PROCESS_ERROR` | `retries < 3` | `RETRYING` | Tăng biến đếm `retries++`, giữ nguyên tệp `.part` |
| `DOWNLOADING` | `PROCESS_ERROR` | `retries >= 3` | `FAILED` | Ghi log lỗi, gửi thông báo tiếng Việt |
| `CONVERTING` | `TRANSCODE_SUCCESS` | Tệp MP3 tồn tại trên đĩa | `COMPLETED` | Lưu đường dẫn tệp hoàn tất, phát SSE |
| `CONVERTING` | `FFMPEG_ERROR` | FFmpeg thoát mã $\ne 0$ | `FAILED` | Dọn dẹp tệp tạm, báo lỗi |

---

## 2. Máy Trạng Thái Trình Nghe Thử Trực Tiếp (In-App Audio Player FSM)

Trình phát nhạc dưới đáy màn hình điều khiển đối tượng HTML5 `Audio()` chạy trên trình duyệt:

```mermaid
stateDiagram-v2
    [*] --> IDLE: Mở ứng dụng lần đầu
    
    IDLE --> RESOLVING_STREAM: Bấm "Nghe Thử Trước"
    
    RESOLVING_STREAM --> BUFFERING: Server trả về HTTP 302 Redirect URL
    RESOLVING_STREAM --> ERROR: Lỗi trích xuất (SABR / Format 403)
    
    BUFFERING --> PLAYING: Audio buffer sẵn sàng (canplay)
    BUFFERING --> ERROR: Mạng gián đoạn / URL hết hạn
    
    PLAYING --> PAUSED: Bấm nút Pause / Chuyển tab
    PAUSED --> PLAYING: Bấm nút Play
    
    PLAYING --> ENDED: Nghe hết thời lượng bài hát
    
    PLAYING --> RESOLVING_STREAM: Bấm "Nghe Thử" một bài hát khác
    PAUSED --> RESOLVING_STREAM: Bấm "Nghe Thử" một bài hát khác
    
    ERROR --> IDLE: Đóng thông báo lỗi / Chọn bài khác
    ENDED --> IDLE: Hết bài
```

---

## 3. Máy Trạng Thái Luồng Chuyển Giao Tệp Về Máy Cá Nhân (Client Delivery Pipeline FSM)

Đảm bảo tệp MP3 sau khi xử lý tại máy chủ sẽ tự động lưu vào máy của Ba Mẹ:

```mermaid
stateDiagram-v2
    [*] --> LISTENING_SSE: Trình duyệt duy trì kết nối /api/queue/stream
    
    LISTENING_SSE --> TASK_PROCESSING: Nhận event SSE trạng thái 'downloading' / 'converting'
    TASK_PROCESSING --> LISTENING_SSE: Cập nhật thanh tiến độ % trên giao diện
    
    TASK_PROCESSING --> TRIGGER_DOWNLOAD: Nhận event SSE trạng thái 'completed'
    
    state TRIGGER_DOWNLOAD {
        [*] --> CREATE_HIDDEN_ANCHOR: Tạo thẻ <a download href="/api/download/:id/file">
        CREATE_HIDDEN_ANCHOR --> DISPATCH_CLICK: Tự động kích hoạt sự kiện click()
        DISPATCH_CLICK --> REMOVE_ANCHOR: Xóa thẻ neo khỏi DOM
    }
    
    TRIGGER_DOWNLOAD --> HTTP_STREAMING: Trình duyệt gửi GET /api/download/:id/file
    
    state HTTP_STREAMING {
        [*] --> SEND_HEADERS: Gửi Content-Disposition: attachment
        SEND_HEADERS --> PIPE_STREAM: Server đọc tệp và pipe vào phản hồi HTTP
        PIPE_STREAM --> BROWSER_SAVED: Trình duyệt lưu tệp vào thư mục Downloads
    }
    
    HTTP_STREAMING --> TOAST_NOTIFICATION: Hiển thị thông báo "Đã tải xong về máy rồi ạ!"
    TOAST_NOTIFICATION --> [*]
```
