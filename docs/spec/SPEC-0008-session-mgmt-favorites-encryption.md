# OpenSpec SPEC-0008: Session Management, Playlist Discovery, Favorites Sync & Sensitive Data Encryption

> **Specification Standard**: OpenSpec Spec Kit Framework  
> **Status**: APPROVED (Merged into master)  
> **Authority**: TamLD (`github.com/tamld/tuneflow`)  
> **Target Audience**: Backend Engineers, Security Reviewers, QA Engineers  
> **Reference Issues**: [#80](https://github.com/tamld/tuneflow/issues/80), [#81](https://github.com/tamld/tuneflow/issues/81), [#84](https://github.com/tamld/tuneflow/issues/84)  
> **Reference PRs**: PR #83, PR #85, PR #86  
> **Release Target**: TuneFlow v2.4.0  

---

## 1. Mục Tiêu & Bối Cảnh (Context & Goals)

Phiên bản TuneFlow v2.4.0 giải quyết trọn vẹn 3 khía cạnh cốt lõi về bảo mật, trải nghiệm tìm kiếm nội dung và quản trị phiên:
1. **Khám Phá & Sắp Xếp Danh Sách Phát (Issue #80)**: Cho phép người dùng và người lớn tuổi tìm kiếm cả bài hát lẻ lẫn album/playlist hoàn chỉnh, hỗ trợ lọc theo loại (`all`, `video`, `playlist`) và sắp xếp theo độ liên quan, lượt xem hoặc ngày phát hành.
2. **Quản Trị Phiên Đăng Nhập & Kick-Out Khẩn Cấp (Issue #84)**: Bảng điều khiển Quản trị giám sát mọi thiết bị đang truy cập vào hệ thống homelab, cung cấp công cụ thu hồi phiên đơn lẻ hoặc kick-out hàng loạt theo nhóm (`guests`, `users`, `all_except_me`, `revoke-all`).
3. **Bảo Mật Tài Khoản & Đồng Bộ Yêu Thích Hai Chiều (Issue #81)**: Tự phục vụ đổi mật khẩu (kèm ngắt kết nối các thiết bị khác), Admin reset mật khẩu thành viên, lưu trữ danh mục bài hát yêu thích lên máy chủ SQLite gắn theo tài khoản, và bảo vệ thông tin nhạy cảm (IP client) bằng chuẩn mã hóa đối xứng xác thực AES-256-GCM.

---

## 2. Đặc Tả Chức Năng (Functional Specifications)

### 2.1 Khám Phá Danh Sách Phát & Bộ Lọc Kết Quả (Issue #80)
- **API Endpoint**: `GET /api/search?q=<query>&type=<all|video|playlist>&sort=<relevance|views|date>`
- **Hành vi**:
  - `type=playlist`: Truy vấn yt-dlp với cờ `--flat-playlist`, trích xuất `id`, `title`, `uploader`, `thumbnail`, `trackCount`.
  - `type=video`: Tìm kiếm các video đơn lẻ.
  - `type=all`: Kết hợp cả video và playlist.
  - `sort`: Tự động sắp xếp mảng kết quả theo `view_count` (lượt xem giảm dần) hoặc `upload_date` (ngày đăng mới nhất).
  - Tự động fallback về giá trị mặc định (`type=all`, `sort=relevance`) nếu tham số đầu vào không hợp lệ.
- **Giao diện**: Thanh nút lọc pill buttons chuẩn WCAG AAA, thẻ playlist chuyên biệt hiển thị badge số lượng bài hát và nút bấm 1-chạm tải cả danh sách hoặc xem chi tiết.

### 2.2 Quản Trị Phiên Kết Nối & Kick-Out (Issue #84)
- **Cấu trúc dữ liệu**:
  ```sql
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    user_agent TEXT,
    client_ip TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  ```
- **API Endpoints**:
  - `GET /api/admin/sessions`: Trả về danh sách các phiên đang hoạt động kèm metrics tổng số và phân bố vai trò.
  - `POST /api/admin/sessions/revoke`: Ngắt một phiên cụ thể bằng `token`.
  - `POST /api/admin/sessions/revoke-group`: Hủy phiên theo nhóm:
    - `guests`: Xóa toàn bộ khách vãng lai và đặt lại cooldown.
    - `users`: Ngắt tất cả phiên của tài khoản Gia Đình.
    - `all_except_me`: Ngắt toàn bộ phiên khác và khách, bảo tồn duy nhất phiên của Admin đang gọi API.
  - `POST /api/admin/sessions/revoke-all`: Lệnh khẩn cấp đăng xuất toàn bộ hệ thống.

### 2.3 Tự Đổi Mật Khẩu & Admin Reset Mật Khẩu (Issue #81)
- **Người dùng tự đổi mật khẩu**:
  - `POST /api/auth/change-password`
  - Yêu cầu `oldPassword` và `newPassword` (tối thiểu 4 ký tự).
  - Xác thực mật khẩu cũ bằng `scrypt` với muối ngẫu nhiên.
  - Khi đổi thành công: Tự động xóa tất cả các phiên khác của người dùng này (`deleteSessionsByUser(userId, currentToken)`), giữ lại phiên hiện tại để không làm gián đoạn trải nghiệm người dùng.
- **Admin đặt lại mật khẩu**:
  - `POST /api/admin/users/:id/reset-password`
  - Chỉ cho phép vai trò `admin`.
  - Hủy ngay lập tức toàn bộ phiên của tài khoản bị reset (`deleteSessionsByUser(userId)`), buộc thiết bị đó phải đăng nhập lại bằng mật khẩu mới.

### 2.4 Đồng Bộ Danh Sách Yêu Thích 2 Chiều (Issue #81)
- **Bảng dữ liệu**:
  ```sql
  CREATE TABLE IF NOT EXISTS user_favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    video_id TEXT NOT NULL,
    title TEXT NOT NULL,
    uploader TEXT,
    duration INTEGER DEFAULT 0,
    duration_string TEXT,
    thumbnail TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, video_id)
  );
  ```
- **API Endpoints**:
  - `GET /api/user/favorites`: Đọc danh sách bài hát yêu thích của tài khoản đang đăng nhập.
  - `POST /api/user/favorites`: Thêm bài hát vào danh sách yêu thích.
  - `DELETE /api/user/favorites/:id`: Xóa bài hát khỏi danh sách yêu thích.
  - `POST /api/user/favorites/sync`: Gửi mảng bài hát từ `localStorage` lên máy chủ, máy chủ hợp nhất và trả về danh sách tổng hợp đầy đủ.

### 2.5 Mã Hóa Dữ Liệu Nhạy Cảm Tại Chỗ (AES-256-GCM)
- **Thuật toán**: Chuẩn mã hóa đối xứng có xác thực **AES-256-GCM** (Galois/Counter Mode).
- **Khóa dẫn xuất**: Sinh từ chuỗi bí mật hệ thống qua `crypto.scryptSync(secret, salt, 32)`.
- **Cơ chế chống rò rỉ**:
  - Đối với bảng `sessions`: Mỗi dòng dùng IV ngẫu nhiên 12-byte cryptographically secure (`crypto.randomBytes(12)`).
  - Đối với bảng `guest_quotas`: Sử dụng IV xác định dẫn xuất từ HMAC-SHA256 (`HMAC(masterKey, plaintextIp)[:12]`) cho phép tìm kiếm chính xác `WHERE client_ip = ?` theo chỉ mục mà không làm lộ dữ liệu gốc.
- **Kiểm định thực tế**: Quét toàn bộ tệp nhị phân `.db` bằng regex IPv4/IPv6, xác nhận **0 byte IP plaintext** xuất hiện trên đĩa.

---

## 3. Tiêu Chí Nghiệm Thu (Acceptance Criteria - AC)

| Mã AC | Tiêu Chí Kiểm Tra | Kết Quả Thực Tế |
| :--- | :--- | :--- |
| **AC-01** | `GET /api/search` với `type=playlist` trả về các playlist có số lượng bài | PASS (`tests/search-playlist-sort.test.js`) |
| **AC-02** | `GET /api/search` với `sort=views` sắp xếp giảm dần theo lượt xem | PASS (`tests/search-playlist-sort.test.js`) |
| **AC-03** | `POST /api/admin/sessions/revoke-group` nhóm `all_except_me` giữ phiên gọi và ngắt phiên khác | PASS (`tests/admin-session-management.test.js`) |
| **AC-04** | `POST /api/admin/sessions/revoke-all` thu hồi sạch mọi phiên trong database | PASS (`tests/admin-session-management.test.js`) |
| **AC-05** | `POST /api/auth/change-password` từ chối mật khẩu cũ sai với mã 400 | PASS (`tests/security-passwords-favorites-encryption.test.js`) |
| **AC-06** | `POST /api/auth/change-password` thành công ngắt các phiên khác của chính user | PASS (`tests/security-passwords-favorites-encryption.test.js`) |
| **AC-07** | `POST /api/admin/users/:id/reset-password` chặn người dùng thường (403) và ngắt phiên user | PASS (`tests/security-passwords-favorites-encryption.test.js`) |
| **AC-08** | `POST /api/user/favorites/sync` đồng bộ 2 chiều và trả về danh sách hợp nhất | PASS (`tests/security-passwords-favorites-encryption.test.js`) |
| **AC-09** | Quét nhị phân raw binary của SQLite `.db` chứa 0 IP plaintext | PASS (`tests/security-passwords-favorites-encryption.test.js`) |
| **AC-10** | Toàn bộ 198 ca kiểm thử tự động trên 72 test suites chạy xanh 100% | PASS (`exit code 0`, 0 regressions) |
