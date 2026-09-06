# Phase 3 Governance: Definition of Ready, Definition of Done & Acceptance Criteria

## 1. Definition of Ready (DoR)
- [x] Đã có ADR-0008 xác lập kiến trúc flat-playlist và băm SHA-256.
- [x] Đã có SRS và FSM quy định rõ ràng luồng chuyển trạng thái và bounded pool concurrency.
- [x] Thiết kế UI danh sách chọn bài hát tuân thủ kích thước tương tác tối thiểu $\ge 48\text{px}$.

## 2. Definition of Done (DoD)
- [ ] Endpoint `/api/playlist/parse` bóc tách được playlist thực tế dưới 3 giây.
- [ ] Endpoint `/api/queue/batch-add` tiếp nhận mảng bài hát và duy trì tối đa 2 tiến trình chạy đồng thời.
- [ ] 100% tệp MP3 hoàn thành đều có mã băm SHA-256 lưu trong trường `checksum`.
- [ ] Thử nghiệm ngắt kết nối mạng giả lập xác nhận tệp `.part` được nối tiếp tải (resumed) thành công.
- [ ] Bộ kiểm thử `tests/playlist.test.js` và `tests/checksum.test.js` chạy đạt 100% xanh.

## 3. Acceptance Criteria (AC)
- **AC-301**: Gửi link playlist 10 bài vào `/api/playlist/parse` trả về đúng 10 đối tượng JSON có đủ tiêu đề và thumbnail.
- **AC-302**: Khi gửi batch 10 bài vào hàng đợi, tại mọi thời điểm lệnh `ps aux | grep -E 'yt-dlp|ffmpeg'` không bao giờ vượt quá 2 tiến trình.
- **AC-303**: Tải tệp hoàn tất bằng `curl -i /api/download/:id/file` trả về header `x-tuneflow-checksum` khớp chính xác với `sha256sum <file>`.
