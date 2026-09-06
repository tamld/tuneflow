# ADR-0008: Playlist Batch Parsing, Bounded Concurrency Queue, and SHA-256 Checksum Verification

## Trạng thái
Đã chấp thuận (Accepted)

## Bối cảnh
Người lớn tuổi thường có thói quen nghe cả một danh sách tuyển tập (ví dụ: "Tuyển tập 20 bài nhạc thiền ngủ ngon", "Tuyển tập ca khúc tiền chiến"). Nếu hệ thống tải cùng lúc 20–50 bài hát, CPU và RAM máy chủ sẽ bị quá tải, gây nghẽn mạng gia đình. Ngoài ra, việc tải nhiều bài dễ gặp lỗi rớt mạng giữa chừng hoặc file bị lỗi ghép âm thanh.

## Quyết định Kiến Trúc
1. **Bóc tách Playlist hai giai đoạn**:
   - Giai đoạn 1: Trích xuất danh sách siêu dữ liệu nhanh (`yt-dlp --flat-playlist -J`) trong $< 2$ giây, trả về mảng danh sách bài hát cho client lựa chọn.
   - Giai đoạn 2: Cho phép người dùng chọn "Tải tất cả" hoặc tích chọn từng bài ưng ý.
2. **Hàng đợi Bounded Queue Concurrency**:
   - Giới hạn tối đa 2 tác vụ tải song song (`MAX_CONCURRENT_DOWNLOADS = 2`).
   - Các bài còn lại duy trì trạng thái `queued` và tự động kích hoạt khi có slot trống.
3. **Cơ chế khôi phục (Resumable)**:
   - Giữ lại tệp tạm `.part` khi gián đoạn mạng. Khi tải lại, yt-dlp sẽ tiếp tục tải từ byte tiếp theo thay vì tải lại từ đầu.
4. **Xác thực toàn vẹn Checksum**:
   - Sau khi FFmpeg mux xong tệp MP3, hệ thống tự động tính mã băm **SHA-256** của tệp và ghi nhận vào metadata.
   - Client nhận stream tải về kèm header `ETag: <sha256>` hoặc `x-checksum-sha256: <hash>` để xác nhận tệp hoàn chỉnh 100%.

## Hệ quả
- Đảm bảo an toàn tuyệt đối cho CPU của Container Host.
- Không bao giờ giao tệp nhạc bị hỏng hoặc mất nửa bài cho bố mẹ.
