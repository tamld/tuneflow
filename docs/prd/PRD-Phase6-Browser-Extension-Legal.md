# PRD — Phase 6: Browser Extension MV3, Commercialization & Legal Compliance

## 1. Mục Tiêu Sản Phẩm (Goal)
Mở rộng trải nghiệm nghe nhạc của gia đình bằng một Tiện ích mở rộng trình duyệt (Browser Extension) hoạt động trực tiếp trên trang web YouTube, cho phép bố mẹ nhấn một nút duy nhất để gửi lệnh tải về TuneFlow Server; đồng thời thiết lập khung chiến lược thương mại hóa hợp pháp, phòng ngừa rủi ro vi phạm bản quyền tác quyền và điều khoản dịch vụ của Google.

## 2. Bài Toán Nghiệp Vụ & Pháp Lý
- **Trải nghiệm**: Bố mẹ thường mở YouTube trên máy tính để xem nhạc. Việc phải copy đường link và dán sang tab TuneFlow là rào cản nhận thức lớn đối với người già.
- **Thương mại hóa & Bản quyền**: Người dùng muốn biết có thể kinh doanh thu phí được không và bản quyền xử lý thế nào.
  - *Giải pháp pháp lý*: Không bán nhạc, không bán bản quyền. Cung cấp TuneFlow theo mô hình **Phần mềm quản lý đa phương tiện cá nhân (Self-hosted FOSS / Personal Media Box)**. Thương mại hóa thông qua bán phần cứng Mini PC cài sẵn hoặc dịch vụ hỗ trợ kỹ thuật cao cấp (Pro Support & Cloud Sync), tránh hoàn toàn rủi ro kiện tụng bản quyền.

## 3. Các Tính Năng Trọng Tâm
- **Chrome / Edge Extension (Manifest V3)**:
  - Nút bấm trực quan nổi bật: **"🎧 Tải Về Cho Bố Mẹ"** chèn ngay dưới video YouTube.
  - Cửa sổ Popup hiển thị danh sách các bài đang tải trên máy chủ gia đình.
  - Tự động phát hiện địa chỉ máy chủ nội bộ trong mạng LAN (`http://tuneflow.local:3000`).
- **Legal Compliance Suite**:
  - Tuyên bố miễn trừ trách nhiệm (Disclaimer) theo chuẩn Fair Use cho mục đích cá nhân.
  - Hướng dẫn bảo mật và tuân thủ bản quyền đi kèm tài liệu sản phẩm.
