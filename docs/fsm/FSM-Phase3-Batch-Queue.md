# FSM — Phase 3: Playlist Batch Queue & Item Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> Discovered: Playlist URL parsed
    Discovered --> Selected: User checks boxes
    Selected --> Queued: Batch add submitted
    
    state BoundedConcurrencyPool {
        Queued --> Downloading: active_slots < 2
        Downloading --> Transcoding: raw audio stream complete
        Transcoding --> VerifyingChecksum: mp3 320kbps encoded
        VerifyingChecksum --> Completed: sha256 computed & matched
    }
    
    Downloading --> Failed: network drop / bot challenge
    Failed --> Retrying: retry_count < 3
    Retrying --> Downloading: resume from .part byte offset
    Retrying --> DeadLetter: retry_count >= 3
    
    Downloading --> Cancelled: user clicks cancel
    Queued --> Cancelled: user clicks cancel
    
    Completed --> Delivered: Client browser receives attachment stream
    Delivered --> [*]
```

## Giải Thích Trạng Thái:
1. **Discovered ➔ Selected**: Danh sách bài hát được hiển thị cho người dùng chọn lọc.
2. **Queued ➔ Downloading**: Chỉ chuyển sang tải khi số lượng slot đang chạy $< 2$.
3. **Transcoding ➔ VerifyingChecksum**: FFmpeg trích xuất âm thanh MP3, sau đó NodeJS stream tệp qua thuật toán `crypto.createHash('sha256')`.
4. **VerifyingChecksum ➔ Completed**: Tệp đạt chất lượng 320kbps, mã băm hợp lệ, sẵn sàng bàn giao cho người dùng.
5. **Retrying**: Tự động khôi phục tải từ tệp tạm `.part` khi rớt mạng tối đa 3 lần.
