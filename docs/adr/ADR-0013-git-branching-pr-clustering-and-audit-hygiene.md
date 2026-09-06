# ADR-0013: Topic Branching, PR Issue-Clustering, and Git Audit Hygiene Standard

## Trạng thái
Đã chấp thuận (Accepted)

## Bối cảnh
Trong các phiên bản đầu tiên (`v1.0.0` đến `v1.3.0`), dự án TuneFlow đôi khi áp dụng phương thức commit trực tiếp lên nhánh `master` (Trunk-based cowboy committing) để phát hành nhanh. Mặc dù các tính năng và bài test đều được hoàn thiện và các GitHub Issues được đóng qua CLI, phương thức này bộc lộ những rủi ro kỹ thuật lớn:
1. **Mất dấu vết kiểm toán (Audit Trail Breakdown)**: Thiếu sự liên kết trực tiếp hai chiều giữa Pull Request, mã diff chi tiết và trạng thái issue trên giao diện GitHub.
2. **Commit nguyên khối (Monolithic Commits)**: Một commit đơn lẻ gom 10–15 issues trải dài từ Bảo mật OWASP, Tối ưu bộ nhớ, UX người cao tuổi đến CI/CD khiến việc code review và kiểm thử độc lập trở nên bất khả thi.
3. **Rủi ro hồi quy (Regression Risk)**: Khi một tính năng nhỏ phát sinh lỗi, việc hoàn tác (git revert) hoặc tìm kiếm lỗi bằng nhị phân (git bisect) sẽ làm ảnh hưởng dây chuyền đến các tính năng khác nằm chung trong commit đó.

---

## Quyết định Kiến Trúc

### 1. Cấm Tuyệt Đối Commit & Push Trực Tiếp Lên `master` (Trunk Protection)
- Từ phiên bản `v1.4.0` trở đi, toàn bộ lập trình viên con người và Autonomous AI Agents (Claude, Codex, Antigravity) **BẮT BUỘC KHÔNG ĐƯỢC PHÉP** commit hoặc push trực tiếp lên nhánh `master`.
- Mọi công việc đều phải bắt đầu trên một nhánh chủ đề (Topic Branch) độc lập.

### 2. Quy Chuẩn Đặt Tên Nhánh (Topic Branch Taxonomy)
Mỗi nhánh làm việc phải tuân theo cú pháp: `<loại>/<mô-tả-ngắn>`
- `feat/`: Tính năng giao diện mới, endpoint API mới (VD: `feat/android-tv-leanback-dpad`).
- `fix/`: Sửa lỗi, vá lỗ hổng bảo mật (VD: `fix/stream-proxy-range-headers`).
- `perf/`: Tối ưu hiệu năng, giảm tải CPU/RAM/Disk (VD: `perf/direct-pipe-ffmpeg`).
- `chore/`: CI/CD, linter, test runner, cấu hình container (VD: `chore/ci-release-preflight-gate`).
- `docs/`: Tài liệu kỹ thuật, ADR, OpenSpec, PRD/SRS (VD: `docs/adr-git-pr-hygiene`).

### 3. Quy Tắc Gom Nhóm Issues Theo Epic (PR Issue-Clustering)
Khi giải quyết nhiều issue cùng lúc, agent hoặc developer **PHẢI gom nhóm các issues cùng lĩnh vực chức năng (Functional Domain) vào một PR riêng biệt**, tuyệt đối không tạo PR "nồi lẩu thập cẩm" (Kitchen-Sink PR):

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               QUY CHUẨN GOM NHÓM PULL REQUESTS                        │
├─────────────────────┬──────────────────────────┬───────────────────────────────────────┤
│ Phân loại PR        │ Tiêu chí Gom Nhóm        │ Mẫu Tiêu Đề PR & Cú Pháp Đóng Issue   │
├─────────────────────┼──────────────────────────┼───────────────────────────────────────┤
│ **PR Bảo Mật & Lõi**│ OWASP, SSRF, XSS, Buffer,│ `fix(security-core): harden engine`   │
│                     │ I/O Pipe, Quota đĩa      │ `Closes #4, Closes #5, Closes #6`     │
├─────────────────────┼──────────────────────────┼───────────────────────────────────────┤
│ **PR Giao Diện UX** │ Giao diện Bố Mẹ, Drawer, │ `feat(ux): enhance SilverMelody a11y` │
│                     │ Modal, Cỡ chữ, i18n      │ `Closes #9, Closes #10, Closes #12`   │
├─────────────────────┼──────────────────────────┼───────────────────────────────────────┤
│ **PR CI/CD & Nền Tảng**│ GitHub Actions, Build APK,│ `chore(ci-arch): add automated gates` │
│                     │ Docker Smoke, Test gates │ `Closes #13, Closes #14, Closes #18`  │
└─────────────────────┴──────────────────────────┴───────────────────────────────────────┘
```

### 4. Quy Trình 5 Bước Mở PR & Nghiệm Thu (The 5-Step PR Ritual)
1. **Khởi tạo nhánh**: `git checkout -b <type>/<topic>`.
2. **Commit nguyên tử**: Commit có thông điệp Conventional Commit rõ ràng.
3. **Vượt qua cổng chất lượng**: Chạy `npm run lint && npm test` đạt 100% xanh cục bộ trước khi push.
4. **Mở Pull Request**: Dùng lệnh `gh pr create` với phần thân (body) ghi rõ tóm tắt, bằng chứng test và từ khóa `Closes #X, Closes #Y`.
5. **Merge & Flatten History**: Thực hiện merge qua PR trên GitHub, đảm bảo GitHub tự động đóng các issues và cập nhật timeline minh bạch.

---

## Hệ quả

### Tích cực
1. **Lịch sử Git sạch đẹp & có cấu trúc**: Dễ dàng truy vết tại sao một dòng code lại thay đổi và thuộc PR nào.
2. **An toàn tối đa**: Tránh nguy cơ vô tình làm hỏng bản dựng `master` đang chạy trong môi trường production.
3. **Phù hợp với tiêu chuẩn doanh nghiệp**: Chuẩn hóa quy trình làm việc giữa AI Agent và lập trình viên con người.

### Bất tiện được chấp nhận
- Tăng thêm thao tác tạo nhánh và mở PR so với việc commit thẳng. Bù lại, sự an toàn và tính minh bạch của dự án tăng gấp nhiều lần.
