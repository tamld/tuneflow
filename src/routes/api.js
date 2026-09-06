const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { searchYouTube, getVideoMetadata, getPreviewStreamUrl, parsePlaylist } = require('../engine/ytdlp');
const queue = require('../engine/queue');

// Health check endpoint for container monitoring
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    activeTasks: queue.getAll().filter(i => i.status === 'downloading' || i.status === 'converting').length
  });
});

// Search YouTube with sorting and playlist support
router.get('/search', async (req, res) => {
  const { q, sp, type, limit } = req.query;
  if (!q || !q.trim()) {
    return res.status(400).json({ error: 'Vui lòng nhập từ khóa tìm kiếm' });
  }

  try {
    const results = await searchYouTube(q.trim(), {
      sp,
      type,
      limit: parseInt(limit || '10', 10)
    });
    res.json({ success: true, count: results.length, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fast In-App Preview stream URL for HTML5 audio element
router.get('/preview/:id', async (req, res) => {
  const { id } = req.params;
  const videoUrl = `https://www.youtube.com/watch?v=${id}`;

  try {
    const streamUrl = await getPreviewStreamUrl(videoUrl);
    // Redirect directly to the YouTube raw audio stream URL so the browser plays it natively
    res.redirect(streamUrl);
  } catch (err) {
    res.status(500).json({ error: 'Không thể phát nghe thử bài hát này.' });
  }
});

// Inspect video / playlist metadata
router.get('/info', async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'Vui lòng cung cấp đường dẫn video' });
  }

  try {
    const meta = await getVideoMetadata(url);
    res.json({ success: true, metadata: meta });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add item to queue
router.post('/queue/add', (req, res) => {
  const { url, title, uploader, thumbnail, duration, format } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'Đường dẫn bài hát không hợp lệ' });
  }

  const item = queue.add({
    url,
    title,
    uploader,
    thumbnail,
    duration,
    format: format || 'mp3'
  });

  res.json({ success: true, item });
});

// Batch add tracks to queue
router.post('/queue/batch-add', (req, res) => {
  const { items, format } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, error: 'Danh sách bài hát không hợp lệ hoặc đang trống' });
  }

  const queuedItems = queue.addBatch(items, format || 'mp3');
  res.json({
    success: true,
    queuedCount: queuedItems.length,
    items: queuedItems
  });
});

// Parse YouTube Playlist
router.post('/playlist/parse', async (req, res) => {
  const { url, limit } = req.body;
  if (!url || typeof url !== 'string' || !url.trim()) {
    return res.status(400).json({ success: false, error: 'Vui lòng cung cấp đường dẫn danh sách phát (Playlist URL)' });
  }

  try {
    const result = await parsePlaylist(url.trim(), limit ? parseInt(limit, 10) : 50);
    res.json({
      success: true,
      title: result.title,
      uploader: result.uploader,
      count: result.count,
      items: result.entries
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Curated Presets for Elderly Personas (Ba & Me)
router.get('/curation/presets', (req, res) => {
  res.json({
    success: true,
    presets: {
      mom: {
        title: 'Mẹ Hay Nghe',
        icon: '🌸',
        description: 'Nhạc thiền êm dịu, niệm Phật, thư giãn ngủ ngon, dân ca quê hương',
        queries: [
          'nhạc thiền ngủ ngon',
          'niệm phật êm dịu thanh tịnh',
          'nhạc không lời thư giãn spa',
          'dân ca quê hương chọn lọc'
        ]
      },
      dad: {
        title: 'Ba Hay Nghe',
        icon: '☕',
        description: 'Nhạc vàng bolero chọn lọc, nhạc tiền chiến bất hủ, cải lương cổ nhạc',
        queries: [
          'nhạc vàng bolero chọn lọc',
          'nhạc tiền chiến bất hủ',
          'cải lương hồ quảng',
          'vọng cổ sầu'
        ]
      },
      relax: {
        title: 'Nhạc Không Lời',
        icon: '🌿',
        description: 'Hòa tấu đàn tranh, sáo trúc, guitar êm ái thư giãn',
        queries: [
          'hòa tấu đàn tranh sáo trúc',
          'guitar không lời êm dịu',
          'nhạc piano thư giãn dễ ngủ'
        ]
      }
    }
  });
});

// Get queue list
router.get('/queue/list', (req, res) => {
  res.json({ success: true, items: queue.getAll() });
});

// SSE progress stream
router.get('/queue/stream', (req, res) => {
  queue.subscribeSSE(res);
});

// Cancel item
router.post('/queue/cancel/:id', (req, res) => {
  const success = queue.cancel(req.params.id);
  res.json({ success });
});

// Clear completed items
router.post('/queue/clear', (req, res) => {
  queue.clearCompleted();
  res.json({ success: true });
});

// Direct Client Browser Download (Streams file straight to Ba Me's machine)
router.get('/download/:id/file', (req, res) => {
  const item = queue.get(req.params.id);
  if (!item || item.status !== 'completed' || !item.completedFilePath) {
    return res.status(404).send('Tệp âm thanh chưa hoàn thành hoặc không tìm thấy.');
  }

  if (!fs.existsSync(item.completedFilePath)) {
    return res.status(404).send('Tệp đã bị xóa khỏi đĩa đệm.');
  }

  if (item.checksum) {
    res.setHeader('x-tuneflow-checksum', item.checksum);
    res.setHeader('ETag', `"${item.checksum}"`);
  }

  const filename = `${item.sanitizedTitle}.mp3`;
  res.download(item.completedFilePath, filename, (err) => {
    if (err) {
      console.error(`Lỗi khi stream tệp về client:`, err);
    }
  });
});

module.exports = router;
