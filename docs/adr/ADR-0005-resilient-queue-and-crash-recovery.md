# ADR-0005: Thiết Kế Hàng Đợi Bền Vững & Chống Mất Dữ Liệu Khi Rớt Mạng (Resilient Queue)

## Bối Cảnh (Context)
Môi trường mạng gia đình hoặc Wi-Fi có thể bị chập chờn, mất kết nối ngắn hoặc mất điện đột ngột. Nếu một bài hát dài 2 tiếng (ví dụ: Tuyển tập Nhạc Vàng 50 bài) đang tải đến 90% mà bị đứt mạng và hệ thống xóa sạch dữ liệu dở dang thì sẽ gây ức chế cực lớn cho người dùng và lãng phí băng thông.

## Quyết Định (Decision)
1. **Phân vùng tệp lưu trữ**:
   - Tách bạch hoàn toàn giữa thư mục tạm `downloads/temp/` và thư mục tệp hoàn chỉnh `downloads/`.
2. **Bảo tồn tệp tải tạm dở dang (`*.part`, `*.ytdl`)**:
   - `yt-dlp` khi tải sẽ ghi dữ liệu vào tệp tạm dạng `downloads/temp/<id>.part`.
   - Các hàm dọn dẹp hàng đợi hoặc khởi động lại server **tuyệt đối không được phép xóa tệp `.part`**.
   - Khi tác vụ tải được thử lại (Retry) hoặc người dùng bấm tải lại, `yt-dlp` sẽ tự động nhận diện tệp `.part` và tiếp tục tải từ byte bị đứt đoạn thay vì tải lại từ đầu (HTTP Range Resume).
3. **Cơ chế giới hạn tải đồng thời (Concurrency Throttling)**:
   - Cố định `MAX_CONCURRENT_DOWNLOADS = 2`.
   - Ngăn chặn tình trạng nhiều bài hát được xếp hàng làm quá tải CPU và IOPS của ổ cứng máy chủ Proxmox.

## Hậu Quả (Consequences)
- **Tích cực**: Hệ thống có khả năng phục hồi 100% sau sự cố mạng. Tiết kiệm băng thông tối đa.
- **Tiêu cực**: Các tệp tạm dở dang có thể chiếm dụng dung lượng đĩa nếu tác vụ bị hủy vĩnh viễn. Cần bổ sung cơ chế quét dọn tệp tạm mồ côi (Orphan Cleanup TTL) cho các tệp có thời gian tạo quá 24 giờ.
