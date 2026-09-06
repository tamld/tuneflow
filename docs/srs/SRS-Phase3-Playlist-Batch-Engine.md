# SRS — Phase 3: Software Requirements Specification (Playlist & Batch Engine)

## 1. Yêu Cầu Chức Năng (Functional Requirements)
- **FR-301 (Playlist Metadata Extraction Endpoint)**:
  - Endpoint: `POST /api/playlist/parse`
  - Input: `{ "url": "https://www.youtube.com/playlist?list=..." }`
  - Output: Mảng các bài hát `[ { "id", "title", "duration", "thumbnail", "channel" } ]`.
  - Command: `yt-dlp --flat-playlist --dump-single-json --playlist-end 50 -- <url>`.
- **FR-302 (Batch Queue Ingestion Endpoint)**:
  - Endpoint: `POST /api/queue/batch-add`
  - Input: `{ "items": [ { "id", "title", "url" } ], "format": "mp3" }`
  - Xử lý: Duyệt mảng, kiểm tra trùng lặp (deduplication), đẩy vào hàng đợi với trạng thái `queued`.
- **FR-303 (SHA-256 Checksum Calculation)**:
  - Sau khi FFmpeg xuất xong tệp `.mp3`, hệ thống tính toán mã băm SHA-256 qua stream:
    `crypto.createHash('sha256').update(fileBuffer).digest('hex')`.
  - Gắn giá trị vào thuộc tính `item.checksum`.
- **FR-304 (Client Attachment Stream with Checksum Header)**:
  - Endpoint: `GET /api/download/:id/file`
  - Response Headers:
    - `Content-Disposition: attachment; filename="..."`
    - `ETag: "<sha256>"`
    - `x-tuneflow-checksum: "<sha256>"`

## 2. Yêu Cầu Phi Chức Năng (Non-Functional Requirements)
- **NFR-301 (Thời gian bóc tách)**: Trích xuất 50 bài hát từ Playlist $\le 3.0\text{ giây}$.
- **NFR-302 (Độ toàn vẹn)**: 100% tệp tải về máy khách phải khớp mã băm SHA-256 được tính toán tại server.
- **NFR-303 (Giới hạn tải song song)**: Số lượng tiến trình con tải cùng lúc không bao giờ vượt quá 2 (`MAX_CONCURRENT_DOWNLOADS = 2`).
