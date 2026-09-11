const express = require('express');
const path = require('path');
const fs = require('fs');
const { Readable } = require('stream');
const router = express.Router();
const { searchYouTube, getVideoMetadata, getPreviewStreamUrl, parsePlaylist, getSystemDiagnostics, updateYtDlpBinary } = require('../engine/ytdlp');
const queue = require('../engine/queue');
const { DOWNLOADS_DIR, DB_PATH, GUEST_MAX_LISTEN_SEC, GUEST_COOLDOWN_SEC, ADMIN_PASSWORD } = require('../config');
const { isValidYouTubeUrl, isValidVideoId, isValidStreamMimeType, isSafeRemoteStreamUrl } = require('../utils/validator');
const { createRateLimiter } = require('../utils/rateLimiter');

// SQLite DB & Auth Services (Issue #52)
const { initDatabase } = require('../db/database');
const { UserRepo } = require('../db/repositories/user_repo');
const { SessionRepo } = require('../db/repositories/session_repo');
const { GuestRepo } = require('../db/repositories/guest_repo');
const { FavoriteRepo } = require('../db/repositories/favorite_repo');
const { AuthService } = require('../auth/auth_service');
const { createAuthenticateMiddleware } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { createGuestGuardMiddleware } = require('../middleware/guest_guard');
const { createAuthRouter } = require('./auth_routes');
const { createAdminRouter } = require('./admin_routes');
const { createUserRouter } = require('./user_routes');

const db = initDatabase(DB_PATH);
const userRepo = new UserRepo(db);
const sessionRepo = new SessionRepo(db);
const guestRepo = new GuestRepo(db, GUEST_MAX_LISTEN_SEC, GUEST_COOLDOWN_SEC);
const favoriteRepo = new FavoriteRepo(db);
const authService = new AuthService({ userRepo, sessionRepo, guestRepo });
try {
  authService.ensureDefaultAdmin(ADMIN_PASSWORD);
} catch (_e) {}

const authenticate = createAuthenticateMiddleware(authService);
const guestGuard = createGuestGuardMiddleware(guestRepo);

// Apply authentication to all API endpoints
router.use(authenticate);

// Mount Auth, Admin & User sub-routers
router.use('/auth', createAuthRouter({ authService }));
router.use('/admin', createAdminRouter({ userRepo, guestRepo, sessionRepo }));
router.use('/user', createUserRouter({ favoriteRepo }));

// Rate Limiters to protect homelab resources against DoS / Container OOMKill
const searchRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 40,
  message: 'Dạ Bố Mẹ tìm kiếm quá nhanh, vui lòng đợi vài giây nhé!'
});

const queueRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  message: 'Dạ đang có nhiều bài hát được xếp hàng tải, Bố Mẹ đợi một chút nhé!'
});

// Health check endpoint for container monitoring
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    activeTasks: queue.getAll().filter(i => i.status === 'downloading' || i.status === 'converting').length
  });
});

// Search YouTube with sorting, playlist support, and rate limiting
router.get('/search', searchRateLimiter, async (req, res) => {
  const { q, sp, type, sort, limit } = req.query;
  if (!q || !q.trim()) {
    return res.status(400).json({ error: 'Vui lòng nhập từ khóa tìm kiếm' });
  }

  const ALLOWED_TYPES = ['all', 'video', 'playlist'];
  const ALLOWED_SORTS = ['relevance', 'views', 'date'];

  const resolvedType = ALLOWED_TYPES.includes(type) ? type : 'all';
  const resolvedSort = ALLOWED_SORTS.includes(sort) ? sort : 'relevance';

  try {
    const results = await searchYouTube(q.trim(), {
      sp,
      type: resolvedType,
      sort: resolvedSort,
      limit: parseInt(limit || '10', 10)
    });
    res.json({
      ok: true,
      success: true,
      count: results.length,
      type: resolvedType,
      sort: resolvedSort,
      results
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Prewarm preview stream cache on user hover / pointer focus (Issue #70)
router.post('/preview/prewarm', guestGuard, async (req, res) => {
  const { id } = req.body || {};
  if (!id || !isValidVideoId(id)) {
    return res.status(400).json({ error: 'Mã video YouTube không hợp lệ' });
  }

  const videoUrl = `https://www.youtube.com/watch?v=${id}`;
  getPreviewStreamUrl(videoUrl).catch(() => {});
  res.json({ success: true, prewarming: id });
});

// Fast In-App Preview stream proxy for HTML5 audio element (Issue #20: Prevents YouTube CDN 403, Issue #52: 30-min Guest Guard)
router.get('/preview/:id', guestGuard, async (req, res) => {
  const { id } = req.params;
  if (!isValidVideoId(id)) {
    return res.status(400).json({ error: 'Mã video YouTube không hợp lệ' });
  }

  const videoUrl = `https://www.youtube.com/watch?v=${id}`;

  try {
    const streamUrl = await getPreviewStreamUrl(videoUrl);
    if (!isSafeRemoteStreamUrl(streamUrl)) {
      return res.status(400).json({ error: 'Nguồn phát luồng âm thanh không an toàn' });
    }

    // Forward Range header if requested by HTML5 audio element for seeking
    const headers = {};
    if (req.headers.range) {
      headers['Range'] = req.headers.range;
    }

    const abortController = new AbortController();
    req.on('close', () => {
      try {
        abortController.abort();
      } catch (_e) {}
    });

    const upstreamRes = await fetch(streamUrl, {
      headers,
      signal: abortController.signal
    });

    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      return res.status(upstreamRes.status).json({ error: 'Không thể phát luồng âm thanh từ YouTube' });
    }

    const contentType = upstreamRes.headers.get('content-type') || 'audio/webm';
    if (!isValidStreamMimeType(contentType)) {
      return res.status(415).json({ error: 'Định dạng dữ liệu phát không phải âm thanh hợp lệ' });
    }

    res.status(upstreamRes.status);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, Accept');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    if (upstreamRes.headers.get('content-range')) {
      res.setHeader('Content-Range', upstreamRes.headers.get('content-range'));
    }
    if (upstreamRes.headers.get('content-length')) {
      res.setHeader('Content-Length', upstreamRes.headers.get('content-length'));
    }

    // Pipe upstream Web Stream to Express response safely without uncaught abort errors
    const nodeStream = Readable.fromWeb(upstreamRes.body);
    nodeStream.on('error', (_err) => {});
    nodeStream.pipe(res);

    req.on('close', () => {
      try {
        nodeStream.destroy();
      } catch (_e) {}
    });
  } catch (err) {
    if (err.name === 'AbortError') return;
    console.error(`⚠️ Preview stream error for id ${id}:`, err.message);
    res.status(500).json({ error: 'Không thể phát nghe thử bài hát này.' });
  }
});

// In-memory LRU thumbnail cache (max 300 entries, 24-hour TTL)
const thumbnailCache = new Map();
const MAX_THUMBNAIL_CACHE = 300;
const THUMBNAIL_CACHE_TTL = 24 * 60 * 60 * 1000;

function getCachedThumbnail(key) {
  const item = thumbnailCache.get(key);
  if (!item) return null;
  if (Date.now() - item.timestamp > THUMBNAIL_CACHE_TTL) {
    thumbnailCache.delete(key);
    return null;
  }
  // LRU bump
  thumbnailCache.delete(key);
  thumbnailCache.set(key, item);
  return item;
}

function setCachedThumbnail(key, buffer, contentType) {
  if (thumbnailCache.size >= MAX_THUMBNAIL_CACHE) {
    const oldestKey = thumbnailCache.keys().next().value;
    if (oldestKey) thumbnailCache.delete(oldestKey);
  }
  thumbnailCache.set(key, {
    buffer,
    contentType,
    timestamp: Date.now()
  });
}

// Safe thumbnail image proxy (prevents CDN 403, ATS blocking, and mixed content issues)
router.get('/thumbnail', async (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    return res.status(400).send('Missing url parameter');
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch (_e) {
    return res.status(400).send('Invalid url');
  }

  // Restrict to trusted YouTube and Google CDN domains
  const allowedHosts = [
    'i.ytimg.com',
    'yt3.ggpht.com',
    'yt4.ggpht.com',
    'googleusercontent.com',
    'lh3.googleusercontent.com',
    'img.youtube.com'
  ];
  const isAllowed = allowedHosts.some(host => parsed.hostname === host || parsed.hostname.endsWith('.' + host));
  if (!isAllowed || parsed.protocol !== 'https:') {
    return res.status(403).send('Domain not permitted');
  }

  // Check in-memory LRU cache first for instant (<1ms) response
  const cached = getCachedThumbnail(url);
  if (cached) {
    res.setHeader('Content-Type', cached.contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    return res.send(cached.buffer);
  }

  try {
    const abortController = new AbortController();
    const timer = setTimeout(() => abortController.abort(), 12000);
    const upstream = await fetch(url, {
      signal: abortController.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    clearTimeout(timer);
    if (!upstream.ok) {
      return res.status(upstream.status).send('Failed to fetch thumbnail');
    }
    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await upstream.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    setCachedThumbnail(url, buffer, contentType);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    res.send(buffer);
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).send('Thumbnail fetch timeout');
    }
    res.status(500).send('Thumbnail fetch error: ' + err.message);
  }
});

// Inspect video / playlist metadata
router.get('/info', async (req, res) => {
  const { url } = req.query;
  if (!url || !isValidYouTubeUrl(url)) {
    return res.status(400).json({ error: 'Vui lòng cung cấp đường dẫn video YouTube hợp lệ' });
  }

  try {
    const meta = await getVideoMetadata(url);
    res.json({ success: true, metadata: meta });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add item to queue with rate limiting & YouTube URL validation (Requires Admin or User)
router.post('/queue/add', queueRateLimiter, authorize('admin', 'user'), (req, res) => {
  const { url, title, uploader, thumbnail, duration, format } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'Đường dẫn bài hát không hợp lệ' });
  }
  if (!isValidYouTubeUrl(url)) {
    return res.status(400).json({ error: 'Đường dẫn bài hát không hợp lệ hoặc không thuộc YouTube' });
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

// Batch add tracks to queue with rate limiting & YouTube URL validation (Requires Admin or User)
router.post('/queue/batch-add', queueRateLimiter, authorize('admin', 'user'), (req, res) => {
  const { items, format } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, error: 'Danh sách bài hát không hợp lệ hoặc đang trống' });
  }

  const validItems = items.filter(item => item && isValidYouTubeUrl(item.url));
  if (validItems.length === 0) {
    return res.status(400).json({ success: false, error: 'Không tìm thấy bài hát YouTube hợp lệ nào trong danh sách' });
  }

  const queuedItems = queue.addBatch(validItems, format || 'mp3');
  res.json({
    success: true,
    queuedCount: queuedItems.length,
    items: queuedItems
  });
});

// Parse YouTube Playlist with rate limiting and URL validation
router.post('/playlist/parse', searchRateLimiter, async (req, res) => {
  const { url, limit } = req.body;
  if (!url || typeof url !== 'string' || !url.trim()) {
    return res.status(400).json({ success: false, error: 'Vui lòng cung cấp đường dẫn danh sách phát (Playlist URL)' });
  }
  if (!isValidYouTubeUrl(url.trim())) {
    return res.status(400).json({ success: false, error: 'Đường dẫn danh sách phát không hợp lệ hoặc không thuộc YouTube' });
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

// Curated Presets for Elderly Personas (Mom & Dad / Bố & Mẹ - Issue #19)
router.get('/curation/presets', (req, res) => {
  const lang = (req.query.lang || '').toLowerCase() === 'en' ? 'en' : 'vi';

  if (lang === 'en') {
    return res.json({
      success: true,
      lang: 'en',
      presets: {
        mom: {
          title: "Mom's Favorites",
          icon: '🌸',
          description: 'Peaceful meditation, gentle hymns, Celtic melodies, and classical lullabies',
          queries: [
            'peaceful meditation sleep music',
            'celtic melodies gentle hymns',
            'gentle acoustic country melodies',
            'calming nature sounds deep sleep'
          ]
        },
        dad: {
          title: "Dad's Favorites",
          icon: '☕',
          description: 'Golden oldies 50s-70s, classic rock ballads, vintage country, smooth jazz',
          queries: [
            'golden oldies 50s 60s 70s classics',
            'frank sinatra crooners classics',
            'classic rock ballads vintage',
            'vintage acoustic blues country'
          ]
        },
        relax: {
          title: 'Instrumental & Relax',
          icon: '🌿',
          description: 'Gentle piano relaxation, soft acoustic guitar, relaxing nature rain',
          queries: [
            'peaceful piano relaxation music',
            'gentle acoustic guitar instrumental',
            'relaxing nature rain and forest melodies'
          ]
        }
      }
    });
  }

  res.json({
    success: true,
    lang: 'vi',
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
        title: 'Bố Hay Nghe',
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

// Direct Client Browser Download (Streams file straight to Bố Mẹ's machine)
router.get('/download/:id/file', (req, res) => {
  const item = queue.get(req.params.id);
  if (!item || item.status !== 'completed' || !item.completedFilePath) {
    return res.status(404).send('Tệp âm thanh chưa hoàn thành hoặc không tìm thấy.');
  }

  // Security: Prevent path traversal attacks
  const safePath = path.resolve(item.completedFilePath);
  if (!safePath.startsWith(path.resolve(DOWNLOADS_DIR))) {
    return res.status(403).send('Truy cập tệp không hợp lệ');
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

// Phase 5: Zero-Disk Direct Streaming Pipeline (Streams audio chunks directly from YouTube CDN to client, Issue #52: 30-min Guest Guard)
router.get('/stream/pipe/:id', guestGuard, async (req, res) => {
  const { id } = req.params;
  if (!isValidVideoId(id)) {
    return res.status(400).json({ error: 'Mã video YouTube không hợp lệ' });
  }

  const videoUrl = `https://www.youtube.com/watch?v=${id}`;
  try {
    const streamUrl = await getPreviewStreamUrl(videoUrl);
    if (!isSafeRemoteStreamUrl(streamUrl)) {
      return res.status(400).json({ error: 'Nguồn phát luồng âm thanh không an toàn' });
    }

    // Forward Range headers for seeking/buffering
    const headers = {};
    if (req.headers.range) {
      headers['Range'] = req.headers.range;
    }

    const abortController = new AbortController();
    req.on('close', () => {
      try {
        abortController.abort();
      } catch (_e) {}
    });

    const audioRes = await fetch(streamUrl, {
      headers,
      signal: abortController.signal
    });

    if (!audioRes.ok && audioRes.status !== 206) {
      return res.status(audioRes.status).send('Không thể kết nối đến luồng âm thanh YouTube');
    }

    const contentType = audioRes.headers.get('content-type') || 'audio/webm';
    if (!isValidStreamMimeType(contentType)) {
      return res.status(415).json({ error: 'Định dạng dữ liệu phát không phải âm thanh hợp lệ' });
    }

    res.status(audioRes.status);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, Accept');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');

    if (audioRes.headers.get('content-range')) {
      res.setHeader('Content-Range', audioRes.headers.get('content-range'));
    }
    if (audioRes.headers.get('content-length')) {
      res.setHeader('Content-Length', audioRes.headers.get('content-length'));
    }

    const nodeStream = Readable.fromWeb(audioRes.body);
    nodeStream.on('error', (_err) => {});
    nodeStream.pipe(res);

    req.on('close', () => {
      try {
        nodeStream.destroy();
      } catch (e) {}
    });
  } catch (err) {
    if (err && err.name === 'AbortError') return;
    res.status(500).json({ error: 'Lỗi khi truyền phát luồng âm thanh: ' + err.message });
  }
});

// System diagnostics and runtime versions (Issue #39, Issue #52: Admin only)
router.get('/system/status', authorize('admin'), async (req, res) => {
  try {
    const diagnostics = await getSystemDiagnostics();
    res.json({
      success: true,
      system: diagnostics,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// System yt-dlp hot-update endpoint (Issue #39, Issue #52: Admin only)
router.post('/system/update-ytdlp', authorize('admin'), async (req, res) => {
  try {
    const result = await updateYtDlpBinary();
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// System network interfaces & local LAN QR pairing (Phase 8 - Issue #45)
router.get('/system/network', (req, res) => {
  try {
    const os = require('os');
    const interfaces = os.networkInterfaces();
    const localIPs = [];

    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          localIPs.push(iface.address);
        }
      }
    }

    if (localIPs.length === 0) {
      localIPs.push('127.0.0.1');
    }

    const port = process.env.PORT || 3000;
    const primaryIP = localIPs[0];
    const lanUrl = `http://${primaryIP}:${port}`;

    res.json({
      success: true,
      hostname: os.hostname(),
      port: port,
      localIPs: localIPs,
      primaryIP: primaryIP,
      lanUrl: lanUrl,
      qrPayload: lanUrl
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
