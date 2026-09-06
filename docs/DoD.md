# Tiêu Chuẩn Hoàn Thành (Definition of Done - DoD)
## Dự Án: TuneFlow

Một tính năng, một bản vá hoặc một phiên bản chỉ được coi là **HOÀN THÀNH (DONE)** khi và chỉ khi thỏa mãn đầy đủ các điều kiện tiên quyết sau:

---

## 1. Tiêu Chuẩn Mã Nguồn & Kiến Trúc (Code & Architecture)
- [ ] Mã nguồn được viết theo chuẩn Clean Code, không có biến thừa hoặc hàm không sử dụng.
- [ ] Mọi lời gọi lệnh CLI bên ngoài (`yt-dlp`, `ffmpeg`) phải sử dụng mảng tham số an toàn với cờ `--` phân cách URL để chống Argument Injection.
- [ ] Tài nguyên tiến trình con (`child_process`) phải được giải phóng và dọn dẹp sạch sẽ khi hủy tác vụ (`SIGTERM`).
- [ ] Không chứa mã token, mật khẩu, đường dẫn tuyệt đối nhạy cảm trong repository.

## 2. Tiêu Chuẩn Kiểm Thử Tự Động (Automated Testing)
- [ ] **Bộ kiểm thử đơn vị (Unit Tests)**: 100% ca kiểm thử format, state machine và helper functions chạy đạt.
- [ ] **Bộ kiểm thử tích hợp (API Tests)**: 100% endpoints `/api/health`, `/api/search`, `/api/preview/:id`, `/api/queue/add`, `/api/queue/list` trả về đúng mã trạng thái HTTP và định dạng JSON.
- [ ] **Bộ kiểm thử toàn trình & Khả năng tiếp cận (E2E & A11y Tests)**:
  - Kiểm thử Puppeteer trên Chrome headless xác nhận luồng: Tìm kiếm ➔ Nghe thử ➔ Tải về.
  - Chiều cao các nút bấm tương tác đo đạc thực tế trên DOM phải đạt $\ge 50\text{px}$.
  - Tương phản màu sắc giữa văn bản và nền phải đạt chuẩn WCAG 2.2 AAA ($\ge 7:1$).
- [ ] Không có bất kỳ ca kiểm thử nào bị lỗi (0 failed, 0 skipped unannounced).

## 3. Tiêu Chuẩn Trải Nghiệm & Ngôn Ngữ (UX & Language)
- [ ] Toàn bộ văn bản hiển thị cho người dùng phải là 100% tiếng Việt tự nhiên, ấm áp, lịch sự.
- [ ] Không hiển thị bất kỳ mã lỗi kỹ thuật thuần túy nào (`Error 500`, `SIGSEGV`, `stack trace`) ra ngoài giao diện người dùng.

## 4. Tiêu Chuẩn Đóng Gói & CI/CD (Packaging & CI/CD)
- [ ] Dockerfile biên dịch thành công hình ảnh Alpine Linux với dung lượng $\le 120\text{ MB}$.
- [ ] Container chạy dưới người dùng không đặc quyền (`USER node`).
- [ ] Pipeline GitHub Actions (`ci.yml`, `release.yml`) chạy xanh 100% trên cả kiến trúc `amd64` và `arm64`.

## 5. Tiêu Chuẩn Bằng Chứng Thực Tế (Evidence Before Assertions)
- [ ] Có nhật ký kiểm thử thực tế với exit code 0.
- [ ] Có tệp âm thanh MP3 thực tế được chuyển đổi thành công ra thư mục `downloads/` với dung lượng và bit-rate chuẩn 320kbps.
- [ ] Có ảnh chụp màn hình xác thực giao diện lưu trong thư mục artifacts.
