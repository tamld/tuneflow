# 🎶 TuneFlow Engineering Implementation Proposal for PIC Agent
> **Dành cho**: PIC Agent (Person In Charge Agent) phụ trách hiện thực hóa mã nguồn  
> **Phiên bản mục tiêu**: `v1.2.1` ➔ `v1.3.0` ➔ `v1.4.0` ➔ `v2.0.0`  
> **Kho lưu trữ**: `https://github.com/tamld/tuneflow`  
> **Mã quy chiếu Issues**: [#4](https://github.com/tamld/tuneflow/issues/4) đến [#18](https://github.com/tamld/tuneflow/issues/18)  
> **Phương pháp luận**: TDD (Test-Driven Development), YAGNI, Atomic Commits, WCAG 2.2 AAA.

---

## 🧭 Tổng quan Kiến trúc & Mục tiêu Dự án

TuneFlow là ứng dụng tự host (Self-Hosted Homelab) tải và nghe nhạc chất lượng cao từ YouTube tối ưu riêng cho **người lớn tuổi (Bố & Mẹ 55–75+ tuổi)**.  
Proposal này cung cấp cho PIC Agent kế hoạch hành động từng bước (Bite-sized Tasks), hướng dẫn sửa đổi chính xác từng tệp tin, viết bài kiểm thử trước khi viết code (TDD), tiêu chí nghiệm thu và liên kết tới các GitHub Issues tương ứng.

---

## 📌 PHẦN 1: GLOBAL CONSTRAINTS & THÔNG SỐ KỸ THUẬT BẮT BUỘC

1. **Runtime & Ngôn ngữ**: Node.js $\ge 20.0.0$ (Mặc định Node 22 LTS). Module system: CommonJS (`require`).
2. **Tiêu chuẩn UI/UX người lớn tuổi (SilverMelody)**:
   - Chiều cao vùng bấm (Touch/Click target): Luôn $\ge 56$px cho tất cả các nút bấm chính.
   - Độ tương phản màu sắc: Đạt chuẩn WCAG 2.2 AAA ($\ge 7:1$ cho chữ thông thường, $\ge 4.5:1$ cho chữ lớn).
   - Tuyệt đối không dùng thuật ngữ kỹ thuật khó hiểu (không hiển thị "Error 500", "Exception", "Timeout").
3. **Môi trường Container**:
   - Dockerfile Alpine Linux siêu nhẹ, phân quyền `node:node` không chạy dưới quyền `root`.
   - Giới hạn RAM mặc định: `256M` (Theo `docker-compose.yml`). Mọi tác vụ phải kiểm soát bộ nhớ để tránh OOMKill.
4. **Quy tắc Kiểm thử (TDD)**:
   - Trước khi sửa mã nguồn tính năng hay sửa lỗi, bắt buộc phải viết bài test fail trước, sau đó viết code để test pass.
   - Không được sửa hay mock bài test để ép qua build.

---

## 🗺️ PHÂN RÃ CÁC CHẶNG THỰC THI (PHASE BREAKDOWN)

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   LỘ TRÌNH THỰC THI CHO PIC AGENT                                     │
├─────────────┬────────────────────────────┬─────────────────────────────┬───────────────────────────────┤
│ Phase       │ Trọng tâm Phiên bản        │ GitHub Issues Phụ trách     │ Output cốt lõi                │
├─────────────┼────────────────────────────┼─────────────────────────────┼───────────────────────────────┤
│ **Phase 1** │ v1.2.1: Security & Perf    │ #4, #5, #6, #7, #8          │ Đóng các lỗ hổng OWASP & OOM  │
│ **Phase 2** │ v1.3.0: Streaming & UX     │ #16, #9, #10, #11, #12      │ Nghe liên tục, Hẹn giờ, Drawer│
│ **Phase 3** │ v1.4.0: CI/CD & Test Gates │ #13, #14, #15               │ Smoke CI, Coverage, Auto-Rel  │
│ **Phase 4** │ v2.0.0: Android Phone & TV │ #17, #18                    │ File APK, D-Pad TV, Checksums │
└─────────────┴────────────────────────────┴─────────────────────────────┴───────────────────────────────┘
```

---

## 🛡️ PHASE 1: VÁ BẢO MẬT & TỐI ƯU HIỆU NĂNG LÕI (v1.2.1)

### Task 1.1: Khắc phục DOM-based XSS trong `public/js/app.js`
* **Issue**: [#4](https://github.com/tamld/tuneflow/issues/4) (OWASP A03:2021 - Injection / DOM XSS)
* **Tệp tác động**: `public/js/app.js`
* **Mô tả**: Dữ liệu `item.title`, `song.title`, `uploader` lấy từ YouTube đang được nội suy trực tiếp vào chuỗi HTML gán cho `.innerHTML` tại dòng 201-208, 272-293 và 458.
* **Các bước thực hiện**:
  - [ ] **Step 1**: Tạo hàm tiện ích `escapeHtml(str)` trong `public/js/app.js` hoặc chuyển sang xây dựng DOM bằng `document.createElement()` và gán text qua `.textContent`.
  - [ ] **Step 2**: Thay thế toàn bộ các điểm gán `.innerHTML` chứa metadata bài hát thành text node an toàn.
  - [ ] **Step 3**: Trong `showToast()`, thay `toast.innerHTML = ...` bằng `toast.textContent = message`.
  - [ ] **Step 4**: Chạy `npm test` để xác nhận giao diện và test E2E không bị phá vỡ.
  - [ ] **Step 5**: Commit: `fix(security): sanitize metadata to prevent DOM-based XSS (#4)`

---

### Task 1.2: Xác thực Đầu vào & Whitelist Domain chống SSRF
* **Issue**: [#5](https://github.com/tamld/tuneflow/issues/5) (OWASP A10:2021 - SSRF)
* **Tệp tác động**: `src/routes/api.js`, `src/engine/ytdlp.js`, `tests/api.test.js`
* **Mô tả**: Các endpoint `/api/preview/:id`, `/api/info`, `/api/queue/add`, `/api/playlist/parse` chưa kiểm tra domain hợp lệ, cho phép truyền URL mạng nội bộ hoặc scheme nguy hiểm vào `yt-dlp`.
* **Các bước thực hiện**:
  - [ ] **Step 1 (Test)**: Viết unit test trong `tests/api.test.js` gửi URL nội bộ (`http://127.0.0.1:8080`, `http://192.168.1.1`, `file:///etc/passwd`) và ID video chứa ký tự lạ `../evil` ➔ Kỳ vọng trả về HTTP 400 Bad Request.
  - [ ] **Step 2**: Tạo helper `isValidYouTubeUrl(url)` xác thực protocol `https:` và hostname thuộc `youtube.com`, `www.youtube.com`, `youtu.be`, `music.youtube.com`.
  - [ ] **Step 3**: Thêm regex kiểm tra `id` video trong `/api/preview/:id`: `/^[a-zA-Z0-9_-]{11}$/`. Nếu không khớp, trả về HTTP 400 ngay.
  - [ ] **Step 4**: Chạy `npm test` xác nhận test chuyển sang màu xanh.
  - [ ] **Step 5**: Commit: `fix(security): enforce domain whitelisting and video ID regex to prevent SSRF (#5)`

---

### Task 1.3: Thêm Rate Limiting, Helmet Headers & Bảo vệ Path Download
* **Issue**: [#6](https://github.com/tamld/tuneflow/issues/6) (OWASP A04 & A05)
* **Tệp tác động**: `package.json`, `src/server.js`, `src/routes/api.js`
* **Các bước thực hiện**:
  - [ ] **Step 1**: Cài đặt `helmet` và `express-rate-limit`:
    ```bash
    npm install helmet express-rate-limit
    ```
  - [ ] **Step 2**: Cấu hình `helmet` trong `src/server.js` cho phép tải ảnh thumbnail từ domain YouTube (`img-src 'self' data: https://*.ytimg.com`).
  - [ ] **Step 3**: Cấu hình rate limiter:
    - `/api/search` & `/api/playlist/parse`: Giới hạn 30 reqs/phút/IP.
    - `/api/queue/add`: Giới hạn 60 reqs/phút/IP.
  - [ ] **Step 4**: Trong `/api/download/:id/file`, thêm kiểm tra bảo vệ đường dẫn:
    ```js
    const safePath = path.resolve(item.completedFilePath);
    if (!safePath.startsWith(path.resolve(DOWNLOADS_DIR))) {
      return res.status(403).send('Truy cập tệp không hợp lệ');
    }
    ```
  - [ ] **Step 5**: Commit: `feat(security): add helmet, rate limiting and path traversal guards (#6)`

---

### Task 1.4: Throttle phát sự kiện SSE trong `src/engine/queue.js`
* **Issue**: [#7](https://github.com/tamld/tuneflow/issues/7) (Event Loop Lag & CPU Churn)
* **Tệp tác động**: `src/engine/queue.js`
* **Mô tả**: Sự kiện tiến độ tải từ `yt-dlp` stdout phát ra hàng chục lần/giây. Mỗi lần đều chạy `JSON.stringify(this.getAll())` gửi tới tất cả client SSE, làm nghẽn CPU Node.js.
* **Các bước thực hiện**:
  - [ ] **Step 1**: Trong class `DownloadQueue`, tạo cơ chế throttle `broadcastThrottleTimer`.
  - [ ] **Step 2**: Chỉ phát sóng broadcast khi tiến độ bài hát thay đổi $\ge 2\%$ hoặc chuyển trạng thái (downloading ➔ converting ➔ completed ➔ failed), hoặc tối đa 300ms/lần.
  - [ ] **Step 3**: Chạy kiểm thử tải song song trong `tests/suite-edge.test.js` để kiểm tra độ ổn định.
  - [ ] **Step 4**: Commit: `perf(queue): throttle SSE broadcasts to eliminate event loop lag (#7)`

---

### Task 1.5: Cưỡng chế Hạn Mức `MAX_STORAGE_MB` & Cache Tìm Kiếm
* **Issue**: [#8](https://github.com/tamld/tuneflow/issues/8) (Storage Quota & Audio Bitrate)
* **Tệp tác động**: `src/config.js`, `src/engine/queue.js`, `src/routes/api.js`, `src/engine/ffmpeg.js`
* **Các bước thực hiện**:
  - [ ] **Step 1**: Thêm hàm `enforceStorageQuota()` trong `src/engine/queue.js`. Tính tổng dung lượng thư mục `downloads/`. Nếu vượt quá `MAX_STORAGE_MB` (2048MB), tự động xóa file cũ nhất (FIFO theo `mtime`) về mức an toàn (< 80%).
  - [ ] **Step 2**: Tạo bộ nhớ đệm In-Memory LRU Cache đơn giản cho `/api/search` với TTL 15 phút để tránh gọi subprocess `yt-dlp` lặp lại các bài quen thuộc của Bố Mẹ.
  - [ ] **Step 3**: Trong `src/engine/ffmpeg.js`, điều chỉnh tham số ffmpeg từ `-b:a 320k` sang `-q:a 2` (VBR 190kbps) để giảm 45% dung lượng file mà không mất chất lượng.
  - [ ] **Step 4**: Commit: `perf(storage): enforce MAX_STORAGE_MB quota, cache search results, and optimize audio bitrate (#8)`

---

### Task 1.6: Proxy Luồng Nghe Thử Với Hỗ Trợ HTTP 206 Range (Tránh Lỗi 403 CDN YouTube)
* **Issue**: [#20](https://github.com/tamld/tuneflow/issues/20) (Streaming & Range Requests)
* **Tệp tác động**: `src/routes/api.js`, `src/engine/ytdlp.js`, `public/js/player.js`
* **Mô tả**: `res.redirect(streamUrl)` khiến trình duyệt client gọi thẳng vào YouTube CDN bị lỗi HTTP 403 do khác biệt IP máy chủ/client, đồng thời không hỗ trợ tua nhạc mượt mà.
* **Các bước thực hiện**:
  - [ ] **Step 1**: Chuyển `/api/preview/:id` thành stream proxy trung gian trên server.
  - [ ] **Step 2**: Đọc `req.headers.range` và chuyển tiếp yêu cầu Range lên stream YouTube CDN, trả về HTTP 206 Partial Content kèm `Accept-Ranges: bytes`.
  - [ ] **Step 3**: Ngắt kết nối upstream ngay khi client dừng nghe hoặc đổi bài (`req.on('close')`).
  - [ ] **Step 4**: Commit: `fix(stream): proxy audio preview with HTTP 206 Range to fix YouTube CDN 403 (#20)`

---

### Task 1.7: Loại Bỏ Nhân Đôi Disk I/O: Pipe Stream yt-dlp Trực Tiếp Sang ffmpeg
* **Issue**: [#21](https://github.com/tamld/tuneflow/issues/21) (Pipeline Acceleration & Flash Endurance)
* **Tệp tác động**: `src/engine/queue.js`, `src/engine/ffmpeg.js`
* **Mô tả**: Hiện tại quy trình ghi file tạm xuống đĩa (`.webm`), ffmpeg đọc lại để encode ra `.mp3`, rồi xóa file tạm, gây x3 tải I/O làm chậm và hại ổ cứng/thẻ nhớ Homelab.
* **Các bước thực hiện**:
  - [ ] **Step 1**: Cấu hình `yt-dlp` xuất audio trực tiếp ra stdout (`-o -`).
  - [ ] **Step 2**: Pipe `stdout` của `yt-dlp` vào `stdin` của `ffmpeg` (`-i pipe:0`) và ghi một lần duy nhất ra file MP3 đích.
  - [ ] **Step 3**: Giảm 50% thời gian xử lý và triệt tiêu hoàn toàn rác file tạm khi tải hàng loạt.
  - [ ] **Step 4**: Commit: `perf(pipeline): pipe yt-dlp stdout directly to ffmpeg stdin to eliminate double disk I/O (#21)`

---

### Task 1.8: Xử Lý Graceful Shutdown Toàn Diện & Dọn Dẹp Tiến Trình Con Mồ Côi
* **Issue**: [#22](https://github.com/tamld/tuneflow/issues/22) (Process Lifecycle & Zombie Cleanup)
* **Tệp tác động**: `src/server.js`, `src/engine/queue.js`
* **Mô tả**: Khi container dừng (`SIGTERM`), các tiến trình `yt-dlp` và `ffmpeg` đang chạy không được dừng, khiến container bị treo đến khi Docker gửi `SIGKILL` làm hỏng file tải dở.
* **Các bước thực hiện**:
  - [ ] **Step 1**: Bổ sung phương thức `queue.shutdown()` duyệt qua `this.activeProcesses` và gửi tín hiệu `SIGTERM` tắt sạch các tiến trình con.
  - [ ] **Step 2**: Gọi `queue.shutdown()` trong hàm `gracefulShutdown()` tại `src/server.js` trước khi thoát.
  - [ ] **Step 3**: Xóa các file `.part` hoặc file hỏng dở dang khi tắt server.
  - [ ] **Step 4**: Commit: `resilience(server): implement process-level graceful shutdown and orphan process cleanup (#22)`

---

### Task 1.9: Hỗ Trợ File Cookies, Proxy & Extractor Arguments Vượt Bot Challenge YouTube
* **Issue**: [#23](https://github.com/tamld/tuneflow/issues/23) (Bypass Bot Challenges & Extensibility)
* **Tệp tác động**: `src/config.js`, `src/engine/ytdlp.js`, `docker-compose.yml`
* **Mô tả**: Cung cấp cơ chế cứu cánh khi IP gia đình bị YouTube gắn cờ chống bot đòi hỏi đăng nhập hoặc mã n-sig mới.
* **Các bước thực hiện**:
  - [ ] **Step 1**: Thêm cấu hình biến môi trường: `YTDLP_COOKIES_PATH`, `YTDLP_PROXY`, `YTDLP_EXTRACTOR_ARGS`.
  - [ ] **Step 2**: Tự động chèn cờ `--cookies`, `--proxy`, `--extractor-args` vào mọi lời gọi `yt-dlp` khi có cấu hình.
  - [ ] **Step 3**: Cập nhật mẫu `docker-compose.yml` hỗ trợ mount file `cookies.txt`.
  - [ ] **Step 4**: Commit: `feat(ytdlp): add cookies, proxy, and extractor args support for bot challenge bypass (#23)`

---

### Task 1.10: Triệt Tiêu Race Condition Tìm Kiếm & Bắt Lỗi Audio.play() AbortError
* **Issue**: [#24](https://github.com/tamld/tuneflow/issues/24) (Frontend Race Conditions)
* **Tệp tác động**: `public/js/app.js`, `public/js/player.js`
* **Mô tả**: Bấm nhanh giữa các thể loại làm kết quả tìm kiếm cũ về chậm đè lên kết quả mới. Chuyển bài nghe thử nhanh làm `audio.play()` bị reject `AbortError` gây reset giao diện sai lệch.
* **Các bước thực hiện**:
  - [ ] **Step 1**: Dùng `AbortController` hủy bỏ request tìm kiếm đang chạy trước khi bắt đầu request mới trong `executeSearch()`.
  - [ ] **Step 2**: Bỏ qua lỗi `err.name === 'AbortError'` trong khối `.catch()` của `PreviewPlayer.playTrack()`.
  - [ ] **Step 3**: Commit: `fix(frontend): add AbortController for searches and guard audio play AbortError (#24)`

---

### Task 1.11: Xác Thực Checksum Mã Nguồn yt-dlp & Khiên Bảo Vệ Crash Toàn Cục
* **Issue**: [#25](https://github.com/tamld/tuneflow/issues/25) (Supply Chain & Crash Shield)
* **Tệp tác động**: `Dockerfile`, `src/server.js`
* **Mô tả**: Tải nhị phân `yt-dlp` không qua kiểm tra mã băm tiềm ẩn rủi ro chuỗi cung ứng. Thiếu bộ bắt lỗi toàn cục khiến 1 lỗi stream lẻ tẻ có thể đánh sập cả server.
* **Các bước thực hiện**:
  - [ ] **Step 1**: Cố định phiên bản `yt-dlp` và kiểm tra SHA-256 trong `Dockerfile`: `echo "${YTDLP_SHA256} /usr/local/bin/yt-dlp" | sha256sum -c -`.
  - [ ] **Step 2**: Thêm bộ lắng nghe `uncaughtException` và `unhandledRejection` tại `src/server.js` ghi log lỗi và giữ server luôn sống.
  - [ ] **Step 3**: Commit: `security(server): verify yt-dlp binary sha256 in Dockerfile and add global crash shield (#25)`

---

### Task 1.12: Vá 7 Lỗ Hổng CVEs Chuỗi Cung Ứng & Chặn Bằng CI Security Audit Gate
* **Issue**: [#27](https://github.com/tamld/tuneflow/issues/27) (Dependency Security Audit Gate)
* **Tệp tác động**: `package.json`, `package-lock.json`, `.github/workflows/ci.yml`
* **Mô tả**: Quét `npm audit` phát hiện 7 lỗ hổng (4 High, 3 Moderate) trong `puppeteer`/`extract-zip` (CWE-22 Symlink Traversal) và `express`/`body-parser`/`qs` (CWE-770 DoS). Áp dụng ghi đè `overrides` và nâng cấp thư viện, đưa số lượng lỗ hổng về 0.
* **Các bước thực hiện**:
  - [x] **Step 1**: Nâng cấp `puppeteer` lên `^25.10.0` vá triệt để lỗ hổng High CWE-22 trong `extract-zip`.
  - [x] **Step 2**: Thêm `"overrides": { "qs": "^6.16.0" }` trong `package.json` triệt tiêu rủi ro DoS từ `body-parser`.
  - [x] **Step 3**: Bổ sung bước kiểm toán bảo mật tự động trong `.github/workflows/ci.yml`: `npm audit --audit-level=high`.
  - [x] **Step 4**: Commit: `security(audit): patch 7 dependency CVEs via qs overrides and puppeteer update, and add CI security audit gate (#27)`

---

### Task 1.13: Triệt Tiêu Nuốt Ngoại Lệ (Swallowed Catches) & Tái Kết Nối Tự Động SSE Theo Chuẩn FARD
* **Issue**: [#29](https://github.com/tamld/tuneflow/issues/29) (Failure-Aware Resiliency & Swallowed Exceptions)
* **Tệp tác động**: `public/js/app.js`, `src/engine/queue.js`, `src/server.js`
* **Mô tả**: Rà soát theo chuẩn `wiki-failure-design` (FARD), phát hiện các khối `catch (e) {}` nuốt lỗi im lặng làm ẩn giấu lỗi rò rỉ ổ đĩa và rớt kết nối stream.
* **Các bước thực hiện**:
  - [x] **Step 1**: Bổ sung bộ quản lý kết nối SSE `initSSE()` có `onerror` với cơ chế Exponential Backoff Reconnect (`1s -> 2s -> 4s -> ... -> 30s`) để tự phục hồi khi Wi-Fi của Bố Mẹ bị chập chờn.
  - [x] **Step 2**: Loại bỏ toàn bộ các khối `catch (_e) {}` nuốt lỗi, thay bằng log ngữ cảnh có tiền tố chẩn đoán (`[Storage Quota Warning]`, `[Process Termination Warning]`, `[Temp File Cleanup Warning]`).
  - [x] **Step 3**: Dọn dẹp dứt điểm các file tạm `downloadedTempFile` khi quá trình chuyển đổi MP3 bị thất bại để không làm đầy ổ đĩa.
  - [x] **Step 4**: Commit: `resilience(fard): eliminate swallowed exceptions, add SSE exponential backoff reconnection, and cleanup orphaned failure files (#29)`

---

## 📻 PHASE 2: NÂNG CẤP TRẢI NGHIỆM NGHE THUẦN TÚY & SILVERMELODY UX (v1.3.0)

### Task 2.1: Chế độ Nghe Liên Tục (Radio/Autoplay), Hẹn Giờ Ngủ & MediaSession API
* **Issue**: [#16](https://github.com/tamld/tuneflow/issues/16) (Pure Listening Experience)
* **Tệp tác động**: `public/js/player.js`, `public/index.html`, `src/routes/api.js`
* **Các bước thực hiện**:
  - [ ] **Step 1**: Trong `public/js/player.js`, lắng nghe sự kiện `this.audio.addEventListener('ended')`. Khi cờ `autoplayEnabled` bật, tự động chọn bài hát kế tiếp trong danh sách để phát tiếp.
  - [ ] **Step 2**: Tích hợp `navigator.mediaSession`:
    ```js
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.uploader,
        artwork: [{ src: track.thumbnail, sizes: '512x512', type: 'image/jpeg' }]
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => this.playNext());
      navigator.mediaSession.setActionHandler('previoustrack', () => this.playPrevious());
    }
    ```
  - [ ] **Step 3**: Thêm Bộ hẹn giờ ngủ (Sleep Timer) với menu chọn: 15p, 30p, 45p, 60p. Khi hết giờ, hạ dần volume (fade-out 15s) rồi dừng phát.
  - [ ] **Step 4**: Thêm route streaming proxy an toàn `/api/stream/:id` để luồng nghe lâu dài không bị hết hạn token từ Google CDN.
  - [ ] **Step 5**: Commit: `feat(player): add continuous autoplay, sleep timer, and media session API (#16)`

---

### Task 2.2: Khay Trượt Hàng Đợi Tải Cố Định (Download Queue Drawer)
* **Issue**: [#9](https://github.com/tamld/tuneflow/issues/9) (Persistent Queue Drawer)
* **Tệp tác động**: `public/index.html`, `public/js/app.js`, `public/css/silver-melody.css`
* **Mô tả**: Giải quyết triệt để lỗi người dùng chuyển trang hoặc tìm kiếm từ khóa khác làm mất dấu các bài hát đang tải dở.
* **Các bước thực hiện**:
  - [ ] **Step 1**: Thêm nút nổi góc trên/dưới: `📥 Danh sách tải (<count>)` kèm chấm đỏ thông báo khi có bài đang tải.
  - [ ] **Step 2**: Xây dựng Sliding Drawer hiển thị tất cả các bài hát trong hàng đợi với trạng thái: Đang chờ, Đang tải xx%, Đã xong, Lỗi.
  - [ ] **Step 3**: Có nút "Tải lại về máy" trực tiếp nếu trình duyệt chặn tự động tải.
  - [ ] **Step 4**: Commit: `feat(ux): implement persistent download queue drawer across searches (#9)`

---

### Task 2.3: Modal Hướng Dẫn SilverMelody Thân Thiện Thay Thế `alert()`
* **Issue**: [#10](https://github.com/tamld/tuneflow/issues/10) (Elderly Guidance Modal)
* **Tệp tác động**: `public/index.html`, `public/js/app.js`, `public/css/silver-melody.css`
* **Các bước thực hiện**:
  - [ ] **Step 1**: Xóa bỏ `onclick="alert(...)"` tại dòng 22 của `public/index.html`.
  - [ ] **Step 2**: Thêm Modal HTML với 3 thẻ bước to rõ:
    - Bước 1: 🔍 Gõ tên bài hát hoặc bấm một thể loại quen thuộc.
    - Bước 2: ▶️ Bấm nghe thử xem đúng bài và ca sĩ mình thích chưa.
    - Bước 3: ⬇️ Thấy ưng ý thì bấm tải về máy.
  - [ ] **Step 3**: Nút đóng to $\ge 56$px: `✅ Dạ con hiểu rồi`.
  - [ ] **Step 4**: Commit: `feat(ux): replace native alert with accessible SilverMelody guidance modal (#10)`

---

### Task 2.4: Tải 1-Click Toàn Bộ Bài Hát Yêu Thích
* **Issue**: [#11](https://github.com/tamld/tuneflow/issues/11) (Batch Favorites Download)
* **Tệp tác động**: `public/js/app.js`, `public/index.html`
* **Các bước thực hiện**:
  - [ ] **Step 1**: Trong tab "Bài Đã Thích", hiển thị nút hành động: `⬇️ Tải Toàn Bộ Bài Yêu Thích Về Máy (<count> bài)`.
  - [ ] **Step 2**: Bấm nút sẽ gom toàn bộ danh sách `favorites` gửi đến `/api/queue/batch-add`.
  - [ ] **Step 3**: Hiển thị thông báo thân thiện và tự động mở khay tải để theo dõi.
  - [ ] **Step 4**: Commit: `feat(favorites): add 1-click batch download all favorite songs (#11)`

---

### Task 2.5: Tiện Ích Trợ Năng (A11y): Nút Xóa Tìm Kiếm, Chỉnh Âm Lượng & Cỡ Chữ
* **Issue**: [#12](https://github.com/tamld/tuneflow/issues/12) (Ergonomics & A11y Scaling)
* **Tệp tác động**: `public/index.html`, `public/js/app.js`, `public/css/silver-melody.css`, `public/js/player.js`
* **Các bước thực hiện**:
  - [ ] **Step 1**: Thêm nút `✖` trong ô tìm kiếm để người già xóa nhanh từ khóa chỉ với 1 chạm.
  - [ ] **Step 2**: Thêm nút Loa to/Nhỏ/Mute trên `bottom-player` và nút `🔁 Lặp lại bài này`.
  - [ ] **Step 3**: Thêm bộ điều chỉnh cỡ chữ `A-` / `A+` trên header để phóng to font body từ 18px lên 24px cho người viễn thị.
  - [ ] **Step 4**: Commit: `feat(a11y): add clear search button, player volume/repeat, and font size scaling (#12)`

---

### Task 2.6: Hỗ Trợ Đa Ngôn Ngữ Tiếng Anh & Tiếng Việt (i18n) với Curation Bản Địa Hóa
* **Issue**: [#19](https://github.com/tamld/tuneflow/issues/19) (Internationalization / Global Elderly Personas)
* **Tệp tác động**: `public/index.html`, `public/js/i18n.js` (hoặc `app.js`), `public/css/silver-melody.css`, `src/routes/api.js`
* **Mô tả**: Mặc định là tiếng Việt (`vi`), bổ sung tiếng Anh (`en`) cho phụ huynh quốc tế. Bản địa hóa các danh mục sở thích của Bố/Mẹ (Mom/Dad), modal hướng dẫn và thông báo lỗi.
* **Các bước thực hiện**:
  - [ ] **Step 1**: Xây dựng từ điển dịch thuật không phụ thuộc thư viện ngoài (`public/locales/vi.json`, `en.json` hoặc module `public/js/i18n.js`).
  - [ ] **Step 2**: Thêm nút chuyển đổi ngôn ngữ thân thiện trên header (`🇻🇳 Tiếng Việt` / `🇬🇧 English`) với vùng chạm $\ge 50$px.
  - [ ] **Step 3**: Thiết kế danh mục sở thích bản địa hóa tiếng Anh:
    - 🌸 **Mom's Favorites**: Peaceful meditation, gentle acoustic country, classical lullabies, Celtic melodies.
    - ☕ **Dad's Favorites**: 50s-70s golden oldies, Frank Sinatra & crooners, classic rock ballads, smooth jazz, vintage blues.
  - [ ] **Step 4**: Bản địa hóa Modal Hướng dẫn 3 bước SilverMelody và thông báo Toast.
  - [ ] **Step 5**: Lưu tùy chọn ngôn ngữ vào `localStorage.getItem('tuneflow_lang')`.
  - [ ] **Step 6**: Commit: `feat(i18n): add English and Vietnamese language toggle with localized Mom and Dad personas (#19)`

---

### Task 2.7: Bấm Trực Tiếp Vào Ảnh Bìa (Thumbnail) & Tiêu Đề Bài Hát Để Nghe Thử (Click-to-Play Affordance)
* **Issue**: [#26](https://github.com/tamld/tuneflow/issues/26) (Click-to-play on thumbnail and title)
* **Tệp tác động**: `public/js/app.js`, `public/js/player.js`, `public/css/silver-melody.css`, `tests/e2e.test.js`
* **Mô tả**: Người dùng (đặc biệt là các bậc phụ huynh lớn tuổi) thường có thói quen trực giác bấm vào hình ảnh bìa album hoặc tiêu đề bài hát để nghe. Bổ sung khả năng phát nhạc tức thì trên cả 2 vùng này cùng hiệu ứng hover trực quan.
* **Các bước thực hiện**:
  - [x] **Step 1**: Gắn lắng nghe sự kiện click và phím `Enter`/`Space` cho `.song-thumbnail-wrapper` và `.song-title` (`role="button"`, `tabindex="0"`).
  - [x] **Step 2**: Thêm CSS `cursor: pointer`, zoom nhẹ thumbnail và lớp phủ huy hiệu vàng `▶`/`⏸` nổi bật (`.song-thumb-overlay`).
  - [x] **Step 3**: Đồng bộ trạng thái: Click vào bài đang phát sẽ toggle tạm dừng/phát tiếp; bài đang phát hiển thị viền vàng và hiệu ứng nhịp đập pulse.
  - [x] **Step 4**: Cập nhật cả bảng danh sách bài tuyển tập (`.playlist-item-row`) với tính năng tương tự.
  - [x] **Step 5**: Viết kiểm thử E2E tự động xác thực cursor, click trigger và ARIA attributes (100% green).
  - [x] **Step 6**: Commit: `ux(player): enable click-to-play on song thumbnail and title with visual hover affordance (#26)`

---

### Task 2.8: Chuẩn Web Interface Guidelines: Chế Độ Giảm Chuyển Động (prefers-reduced-motion) & Viền Focus Toàn Cục
* **Issue**: [#30](https://github.com/tamld/tuneflow/issues/30) (Web Interface Guidelines & Motion Sensitivity)
* **Tệp tác động**: `public/css/silver-melody.css`
* **Mô tả**: Rà soát theo tiêu chuẩn Web Interface Guidelines và WCAG 2.2 AAA. Người cao tuổi thường nhạy cảm với tiền đình khi có hiệu ứng nhịp đập (`pulse`) hoặc zoom ảnh liên tục. Bổ sung `@media (prefers-reduced-motion: reduce)` và viền focus vàng 3px cho điều hướng bàn phím / remote Android TV.
* **Các bước thực hiện**:
  - [x] **Step 1**: Cấu hình `:focus-visible` với `outline: 3px solid var(--accent-gold) !important; outline-offset: 3px !important;` trên toàn bộ phần tử tương tác.
  - [x] **Step 2**: Thêm media query `@media (prefers-reduced-motion: reduce)` triệt tiêu toàn bộ animation lặp và rút ngắn thời gian chuyển đổi về 0.01ms.
  - [x] **Step 3**: Kiểm tra đối chiếu độ tương phản màu sắc đạt chuẩn WCAG AAA ($\ge 7:1$).
  - [x] **Step 4**: Commit: `a11y(guidelines): implement prefers-reduced-motion for vestibular comfort, universal focus ring, and WCAG AAA contrast (#30)`

---

### Task 2.9: Phòng Vệ Rủi Ro Biên 12 Chiều: Chống Spam Click Tải & Bẫy Tràn Bộ Nhớ LocalStorage
* **Issue**: [#31](https://github.com/tamld/tuneflow/issues/31) (12-Dimensional Edge Case Explorer)
* **Tệp tác động**: `public/js/app.js`
* **Mô tả**: Bóc tách rủi ro hệ thống theo `ck:scenario`: Người già tay run bấm nút tải 5 lần liên tiếp gây nghẽn hàng đợi (Dimension 3); lưu quá nhiều bài hát yêu thích khiến `localStorage` quăng lỗi `QuotaExceededError` đánh sập JS (Dimension 4).
* **Các bước thực hiện**:
  - [x] **Step 1**: Thêm tập hợp `pendingDownloadRequests` Set và vô hiệu hóa tạm thời nút bấm với độ mờ 0.7 trong 1200ms khi bắt đầu tải để chống spam request.
  - [x] **Step 2**: Bọc an toàn `localStorage.setItem('tuneflow_favorites')` trong khối `try-catch`, phát thông báo toast cảnh báo nhẹ nhàng khi bộ nhớ trình duyệt cạn kiệt.
  - [x] **Step 3**: Commit: `resilience(scenario): add in-flight rapid click debounce on downloads and QuotaExceededError guard on favorites (#31)`

---

## 🚀 PHASE 3: TỰ ĐỘNG HÓA CI/CD, DOCKER SMOKE TEST & RELEASE GATES (v1.4.0)

### Task 3.1: Cấu hình ESLint, Code Coverage & Dynamic E2E Port
* **Issue**: [#15](https://github.com/tamld/tuneflow/issues/15) (Code Quality & Testing)
* **Tệp tác động**: `package.json`, `.eslintrc.json`, `tests/e2e.test.js`
* **Các bước thực hiện**:
  - [ ] **Step 1**: Cài đặt ESLint chuẩn Node.js: `npm install -D eslint` và cấu hình rule chuẩn.
  - [ ] **Step 2**: Sửa script lint trong `package.json`: `"lint": "eslint src/ public/js/"`.
  - [ ] **Step 3**: Thêm script đo độ bao phủ kiểm thử: `"test:coverage": "node --test --experimental-test-coverage tests/**/*.test.js"`.
  - [ ] **Step 4**: Sửa `tests/e2e.test.js` sử dụng cổng ngẫu nhiên `server.listen(0, '127.0.0.1')` thay vì cổng tĩnh `3099`.
  - [ ] **Step 5**: Commit: `test(ci): replace fake lint with real ESLint, add coverage, and dynamic port in e2e (#15)`

---

### Task 3.2: Thêm Docker Build & Container Healthcheck Smoke Test vào CI
* **Issue**: [#14](https://github.com/tamld/tuneflow/issues/14) (CI Docker Validation)
* **Tệp tác động**: `.github/workflows/ci.yml`
* **Các bước thực hiện**:
  - [ ] **Step 1**: Bổ sung job `container-check` vào `ci.yml` chạy song song với job `test`.
  - [ ] **Step 2**: Thực hiện `docker build -t tuneflow:test .`.
  - [ ] **Step 3**: Chạy container thử nghiệm và curl kiểm tra `/api/health`:
    ```yaml
    - name: Run Smoke Test
      run: |
        docker run -d --name tuneflow-test -p 3000:3000 tuneflow:test
        sleep 5
        curl -f http://localhost:3000/api/health || exit 1
        docker stop tuneflow-test
    ```
  - [ ] **Step 4**: Commit: `ci: add docker build and container healthcheck smoke test in CI (#14)`

---

### Task 3.3: Release Pre-flight Test Gate & Tự động tạo GitHub Releases
* **Issue**: [#13](https://github.com/tamld/tuneflow/issues/13) (Release Automation)
* **Tệp tác động**: `.github/workflows/release.yml`
* **Các bước thực hiện**:
  - [ ] **Step 1**: Thêm job `test` làm điều kiện tiên quyết trong `release.yml`:
    ```yaml
    jobs:
      test:
        name: Pre-release Test Gate
        runs-on: ubuntu-latest
        steps:
          - uses: actions/checkout@v4
          - uses: actions/setup-node@v4
            with:
              node-version: 22
              cache: 'npm'
          - run: npm ci
          - run: npm test
      build-and-push:
        needs: test
        ...
    ```
  - [ ] **Step 2**: Nâng quyền `permissions: contents: write` trong workflow.
  - [ ] **Step 3**: Thêm action `softprops/action-gh-release@v2` tự động tạo GitHub Release và trích xuất ghi chú từ `CHANGELOG.md`.
  - [ ] **Step 4**: Commit: `ci(release): add test pre-flight gate and automate GitHub Release creation (#13)`

---

## 📺 PHASE 4: HỆ SINH THÁI ANDROID PHONE & ANDROID TV APK (v2.0.0)

### Task 4.1: Kiến Trúc Đóng Gói APK & Điều Hướng D-Pad Remote Android TV
* **Issue**: [#17](https://github.com/tamld/tuneflow/issues/17) (Mobile & TV Client)
* **Tệp tác động**: Thư mục mới `android/` (Khởi tạo qua Capacitor), `public/css/silver-melody.css`, `public/js/app.js`
* **Các bước thực hiện**:
  - [ ] **Step 1**: Tích hợp `@capacitor/core` và `@capacitor/android` vào dự án.
  - [ ] **Step 2**: Hỗ trợ chế độ điều hướng D-Pad TV trên giao diện web:
    - Bắt sự kiện bàn phím: `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `Enter`, `Escape/Back`.
    - Thêm lớp CSS `.focused-tv` với hiệu ứng phóng to 1.08x và viền vàng sáng 4px (`--accent-gold`) khi thẻ bài hát nhận focus.
  - [ ] **Step 3**: Cấu hình Android Manifest hỗ trợ cả điện thoại và Android TV (`<uses-feature android:name="android.software.leanback" android:required="false" />`).
  - [ ] **Step 4**: Commit: `feat(android): scaffold capacitor android client and implement D-pad TV navigation (#17)`

---

### Task 4.2: Pipeline Build APK, Ký Số Tự Động & Xuất Bảng Băm SHA-256
* **Issue**: [#18](https://github.com/tamld/tuneflow/issues/18) (Android CI/CD & Checksums)
* **Tệp tác động**: `.github/workflows/android-release.yml`
* **Các bước thực hiện**:
  - [ ] **Step 1**: Tạo workflow `android-release.yml` kích hoạt khi push tag `v*.*.*`.
  - [ ] **Step 2**: Cấu hình Java 17 và Android SDK để biên dịch APK qua Gradle `./gradlew assembleRelease`.
  - [ ] **Step 3**: Tự động ký số APK bằng keystore từ GitHub Secrets (`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`).
  - [ ] **Step 4**: Sinh bảng băm mã hóa toàn vẹn:
    ```bash
    sha256sum tuneflow-mobile-*.apk tuneflow-tv-*.apk > SHA256SUMS.txt
    ```
  - [ ] **Step 5**: Tự động đính kèm các file `.apk` và `SHA256SUMS.txt` vào GitHub Release để con cái đối chiếu trước khi sideload cho bố mẹ.
  - [ ] **Step 6**: Commit: `ci(android): add automated build, keystore signing, and SHA-256 manifest generation (#18)`

---

## 🎯 Tiêu Chuẩn Nghiệm Thu Chung (Definition of Done - DoD)

Mỗi Task sau khi PIC Agent hoàn thành phải thỏa mãn:
1. **100% Tests Pass**: Chạy `npm test` không có bất kỳ ca kiểm thử nào bị bỏ qua hoặc thất bại.
2. **Không Regression**: Giữ nguyên hiệu năng container idle RAM $\le 40$MB và thời gian phản hồi API $\le 500$ms.
3. **Commit Messages Chuẩn Hóa**: Sử dụng Conventional Commits gắn liền với mã số GitHub Issue (VD: `fix(security): ... (#4)`).
4. **Đóng Issue Tự Động**: Khi PR được merge vào nhánh chính `master`, GitHub Issue tương ứng sẽ tự động chuyển sang trạng thái `Closed`.
