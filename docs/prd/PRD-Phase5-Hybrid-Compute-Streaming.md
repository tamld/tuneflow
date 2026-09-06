# PRD — Phase 5: Hybrid Client-Server Compute & WebAssembly Audio Offloading

## 1. Mục Tiêu Sản Phẩm (Goal)
Tối ưu hóa triệt để tài nguyên máy chủ bằng cách phân định ranh giới tính toán rõ ràng giữa Server và Client: Server chịu trách nhiệm vượt rào cản CORS và giải mã cipher của YouTube, còn Client nhận luồng stream trực tiếp và xử lý các tác vụ hậu kỳ (cắt đoạn, chuẩn hóa âm thanh, gắn thẻ tag) thông qua WebAssembly (WASM).

## 2. Giải Quyết Vấn Đề (Problem Statement)
- Trả lời thắc mắc của người dùng: *"Khi xử lý download, nhạc có phải stream về server không? Hay nguyên tắc là nó compute trên trực tiếp máy client? Server chỉ cung cấp backend để xử lý mọi thứ?"*
- Nếu mọi tác vụ mux âm thanh phức tạp đều dồn lên CPU máy chủ, máy chủ sẽ bị nghẽn khi có nhiều người cùng tải. Bằng cách offload sang CPU máy khách (Client Compute), máy chủ giữ được mức sử dụng CPU tối thiểu.

## 3. Các Tính Năng Trọng Tâm
- **Chế độ Zero-Disk Streaming**: Máy chủ nhận luồng âm thanh từ YouTube CDN và pipe thẳng tới kết nối HTTP của trình duyệt client qua `ReadableStream`, không cần ghi tạm tệp ra đĩa SSD Container Host.
- **Client WebAudio Player & Visualizer**: Sóng âm thanh trực quan, điều khiển âm lượng lớn, tăng cường bass/treble trực tiếp trên trình duyệt bằng Web Audio API.
- **Client-Side Audio Trimming (WASM)**: Cho phép cắt 30 giây làm nhạc chuông điện thoại cho ba mẹ, tính toán hoàn toàn trên trình duyệt máy khách bằng `ffmpeg.wasm`.
