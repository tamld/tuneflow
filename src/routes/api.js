const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { searchYouTube, getVideoMetadata, getPreviewStreamUrl } = require('../engine/ytdlp');
const queue = require('../engine/queue');

// Health check endpoint for Docker and Proxmox monitoring
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

  const filename = `${item.sanitizedTitle}.mp3`;
  res.download(item.completedFilePath, filename, (err) => {
    if (err) {
      console.error(`Lỗi khi stream tệp về client:`, err);
    }
  });
});

module.exports = router;
