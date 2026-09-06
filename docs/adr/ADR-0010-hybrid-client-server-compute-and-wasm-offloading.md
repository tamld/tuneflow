# ADR-0010: Hybrid Client-Server Compute, Stream Pipelining, and WASM Audio Offloading

## Trạng thái
Đã chấp thuận (Accepted)

## Bối cảnh
Người dùng đặt câu hỏi về nguyên lý truyền tải: *"Khi xử lý download, nhạc có phải stream về server không? Hay nguyên tắc là nó compute trên trực tiếp máy client? Server chỉ cung cấp backend để xử lý mọi thứ?"* Cần làm rõ ranh giới kiến trúc giữa Server Compute và Client Compute.

## Quyết định Kiến Trúc
1. **Ranh giới Bắt buộc của Server Compute (Lý do kỹ thuật)**:
   - YouTube áp dụng chính sách CORS (Cross-Origin Resource Sharing) nghiêm ngặt trên trình duyệt; trình duyệt web client KHÔNG THỂ fetch trực tiếp luồng stream video/audio từ YouTube CDN.
   - YouTube sử dụng mã hóa bot-detection và n-sig cipher phức tạp mà chỉ các engine phía máy chủ (như `yt-dlp` có Node.js runtime) mới giải mã được.
   - Do đó, **Server BẮT BUỘC phải thực hiện giai đoạn giải mã URL và trích xuất stream**.
2. **Kiến trúc Hybrid Client-Server Stream Pipelining**:
   - **Giai đoạn 1 (Server)**: Backend giải mã URL âm thanh và pipe trực tiếp luồng stream về máy khách thông qua giao thức HTTP Chunked Transfer Encoding (`ReadableStream`), gắn header `Content-Disposition: attachment; filename="bai_hat.mp3"`.
   - **Tùy chọn Zero-Disk Retention**: Máy chủ có thể stream trực tiếp từ YouTube CDN về thẳng trình duyệt client mà không cần lưu lại byte nào vào ổ cứng của Proxmox, giải phóng 100% rủi ro đầy bộ nhớ đệm.
3. **Phân tải tính toán cho Client (Client Compute via WebAssembly)**:
   - Đối với các tác vụ hậu kỳ: Cắt nhạc chuông (Trim audio), cân bằng âm lượng (Audio Normalization), hoặc đính kèm ảnh bìa ID3 tag, trình duyệt phía client sử dụng thư viện `ffmpeg.wasm` hoặc Web Audio API để tính toán trực tiếp trên CPU của máy khách.
   - Giảm tải 100% năng lượng xử lý hậu kỳ cho máy chủ Proxmox.

## Hệ quả
- Giải đáp triệt để nguyên lý kỹ thuật: Server giải mã & pipe luồng; Client nhận stream và xử lý hiển thị/lưu trữ/hậu kỳ.
- Proxmox chỉ tốn băng thông trung chuyển mạng LAN, CPU gần như nhàn rỗi.
