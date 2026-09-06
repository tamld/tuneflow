# ADR-0011: Browser Extension MV3 Integration, Commercialization Models, and Legal Compliance Strategy

## Trạng thái
Đã chấp thuận (Accepted)

## Bối cảnh
Người dùng đặt ra 3 yêu cầu chiến lược:
1. Có thể phát triển một Browser Extension để ba mẹ đang lướt YouTube bấm tải nhạc trực tiếp được không?
2. Có thể thương mại hóa thu phí người dùng ngoài việc phục vụ gia đình được không?
3. Có dính líu đến vấn đề tác quyền, bản quyền YouTube không?

## Quyết định Kiến Trúc & Chiến Lược

### 1. Kiến Trúc Browser Extension (Manifest V3)
- Sử dụng chuẩn Chrome/Edge WebExtension Manifest V3.
- `content_scripts`: Chạy trên miền `*://*.youtube.com/*`, chèn 1 nút bấm màu xanh nổi bật: **"🎧 Tải MP3 TuneFlow"** ngay cạnh nút Like/Share của YouTube video player.
- `background service worker`: Lấy ID video hiện tại, gửi lệnh POST tới máy chủ TuneFlow qua mạng LAN (`http://nhac.lan:3000/api/queue/add` hoặc URL public).
- Thông báo Toast hiển thị trực quan: "Đang tải bài hát cho ba mẹ... Tải xong sẽ lưu vào thư mục Downloads".

### 2. Đánh Giá Pháp Lý & Bản Quyền (Legal Risk Assessment)
- **Điều khoản YouTube (YouTube ToS)**: Khoản 5.B trong ToS cấm người dùng tải về bất kỳ nội dung nào nếu không có nút download chính thức của YouTube hoặc văn bản cho phép từ chủ sở hữu.
- **Rủi ro khi thu phí dịch vụ tải nhạc**:
  - Nếu thu tiền trực tiếp từ việc cho phép người dùng tải nhạc có bản quyền của các ca sĩ/hãng đĩa: Đây là hành vi phân phối nội dung có bản quyền trái phép nhằm trục lợi thương mại $\rightarrow$ Rủi ro bị khởi kiện DMCA, khóa cổng thanh toán (Stripe/PayPal), và đình chỉ tên miền.
- **Chiến lược Tuân thủ Pháp lý (Legal Safe Harbor)**:
  - **Mục tiêu gia đình (Private Homelab Use)**: Hoàn toàn an toàn, sử dụng cá nhân theo nguyên tắc Fair Use cho người thân trong gia đình, không thu lợi nhuận.
  - **Mô hình Thương mại hóa Hợp Pháp**:
    1. **Mô hình FOSS Core + Turnkey Hardware (Appliance)**: Tương tự Home Assistant, Calibre, Jellyfin, TrueNAS. Cung cấp mã nguồn mở miễn phí; thương mại hóa bằng việc bán Mini PC cấu hình sẵn cắm điện là chạy (Plug-and-play music box cho người cao tuổi).
    2. **Mô hình Bán Phần Mềm Tiện Ích Quản Lý (BYO-Server / Tool Licensing)**: Bán tiện ích mở rộng (Browser Extension) hoặc ứng dụng quản lý bộ sưu tập âm nhạc cá nhân (Personal Audio Organizer). Người dùng tự cấu hình server backend của họ. Nhà phát triển chỉ bán giải pháp phần mềm, không kinh doanh hay lưu trữ nhạc.

## Hệ quả
- Xác lập lộ trình Extension rõ ràng, an toàn tuyệt đối về mặt pháp lý cho chủ dự án.
