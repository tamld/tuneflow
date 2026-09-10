# ADR-0004: Client Delivery via HTTP Content-Disposition Attachment

## Status
Accepted

## Context
Standard self-hosted homelab solutions typically save downloaded media to the server host disk (e.g., `/srv/music/` on a server node).
The biggest operational barrier: Elderly parents sit at their personal computers in the living room without the technical skills to mount SMB/NFS network shares or use WinSCP/SSH to retrieve files onto their personal workstations.

## Decision
Integrate an automated closed-loop delivery pipeline connecting Server-Sent Events (SSE) with HTTP Download:
1. Upon completing FFmpeg transcoding, the server stores the file in `/app/downloads/` and emits an SSE event `{ status: 'completed', id: '...' }`.
2. Upon receiving this event, the client browser automatically creates an invisible HTML `<a>` element:
   ```javascript
   const link = document.createElement('a');
   link.href = `/api/download/${song.id}/file`;
   link.download = `${song.title}.mp3`;
   link.click();
   ```
3. The server endpoint `/api/download/:id/file` attaches download headers:
   ```http
   Content-Type: audio/mpeg
   Content-Disposition: attachment; filename="[Song Title].mp3"
   ```
4. The client browser detects the binary stream and triggers a native download directly into the client machine's local `Downloads` folder.

## Consequences
- **Positive**: Elderly users simply click "Download". Once transcoding completes, the file lands directly in their local PC storage. Completely bridges the gap between internal server and client device.
- **Negative**: Browsers may prompt for "Allow multiple downloads" permission when downloading large batches. Mitigated by playlist ZIP packaging (introduced in v1.1.0).
