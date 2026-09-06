# PRD — Phase 3: Playlist Batch Parsing, Multi-Select & Checksum Verification

## 1. Mục Tiêu Sản Phẩm (Goal)
Cung cấp khả năng tải toàn bộ danh sách phát (Playlist) hoặc chọn lọc hàng loạt bài hát theo ý thích của bố mẹ, hiển thị danh sách bài trực quan, xếp hàng tải thông minh có giới hạn tải song song để không làm nghẽn Container Host, và tự động kiểm tra tính toàn vẹn Checksum SHA-256 của từng bài hát.

## 2. Trải Nghiệm Người Dùng (UX Flow)
1. **Dán link**: Bố mẹ hoặc con cái dán đường dẫn YouTube Playlist vào ô tìm kiếm.
2. **Hiển thị danh sách phát**: Ứng dụng tự động bóc tách và liệt kê các bài hát kèm ảnh thu nhỏ, thời lượng, và ô đánh dấu chọn (checkbox).
3. **Lựa chọn**:
   - Nút to: **"Tải tất cả danh sách (X bài)"**
   - Hoặc tích chọn các bài ưng ý ➔ Bấm **"Tải các bài đã chọn (Y bài)"**.
4. **Theo dõi tiến độ**: Bảng trạng thái hiển thị từng bài: *Đang chờ ➔ Đang tải ➔ Đang ghép nhạc ➔ Đã xong (Tự động tải về máy)*.

## 3. Các Tính Năng Cốt Lõi
- **Bóc tách Playlist siêu tốc**: Dùng chế độ flat-playlist không tải video để hiển thị danh sách trong $< 2$ giây.
- **Hàng đợi Bounded Queue**: Giới hạn tối đa 2 bài tải đồng thời (`MAX_CONCURRENT_DOWNLOADS = 2`).
- **Resumable Download**: Hỗ trợ tiếp tục tải tệp dở dang khi kết nối bị chập chờn.
- **Checksum SHA-256**: Tự động tính hash của tệp MP3 sau khi mux, chống bàn giao file lỗi cho người dùng.
