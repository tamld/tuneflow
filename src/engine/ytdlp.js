const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { YTDLP_COOKIES_PATH, YTDLP_PROXY, YTDLP_EXTRACTOR_ARGS } = require('../config');
const { resolveSidecarBinary, getSanitizedEnv } = require('../security/binary_guard');

/**
 * In-memory LRU/TTL Cache to avoid repeated child process spawns
 */
class SimpleCache {
  constructor(ttlMs = 15 * 60 * 1000, maxSize = 100) {
    this.ttlMs = ttlMs;
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    // True LRU: Re-insert entry to refresh recent usage position
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set(key, value, customTtlMs = null) {
    const ttl = (customTtlMs && customTtlMs > 0) ? customTtlMs : this.ttlMs;
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttl
    });
  }

  clear() {
    this.cache.clear();
  }
}

/**
 * Extract dynamic TTL from YouTube CDN stream URL based on its upstream expire timestamp
 * @param {string} streamUrl
 * @param {number} defaultTtlMs
 * @returns {number}
 */
function extractStreamUrlTtl(streamUrl, defaultTtlMs = 15 * 60 * 1000) {
  if (!streamUrl || typeof streamUrl !== 'string') {
    return defaultTtlMs;
  }
  const match = streamUrl.match(/[?&]expire=(\d+)/);
  if (!match) {
    return defaultTtlMs;
  }
  const expireSec = parseInt(match[1], 10);
  const expireMs = expireSec * 1000;
  const now = Date.now();
  // 60-second safety buffer before actual expiry
  const remainingMs = expireMs - now - (60 * 1000);
  if (remainingMs <= 0) {
    return defaultTtlMs;
  }
  return remainingMs;
}

const searchCache = new SimpleCache(15 * 60 * 1000, 100);
const playlistCache = new SimpleCache(15 * 60 * 1000, 50);
const streamUrlCache = new SimpleCache(2 * 60 * 60 * 1000, 200);

let isJsRuntimesSupportedCache = null;

/**
 * Dynamically check if installed yt-dlp binary supports --js-runtimes (Issue #64, #67)
 * Probes --help output to see if --js-runtimes flag is documented.
 */
function supportsJsRuntimes() {
  if (isJsRuntimesSupportedCache !== null) {
    return isJsRuntimesSupportedCache;
  }
  try {
    const { spawnSync } = require('child_process');
    const res = spawnSync('yt-dlp', ['--help'], { windowsHide: true, timeout: 3000 });
    const stdout = res.stdout ? res.stdout.toString() : '';
    isJsRuntimesSupportedCache = (res.status === 0 && stdout.includes('--js-runtimes'));
  } catch (_e) {
    isJsRuntimesSupportedCache = false;
  }
  return isJsRuntimesSupportedCache;
}

/**
 * Parse duration string (e.g. "5:19", "1:01:05") into seconds
 */
function parseDurationString(str) {
  if (!str || typeof str !== 'string') return 0;
  const parts = str.trim().split(':').map(p => parseInt(p, 10));
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return parts[0] || 0;
}

/**
 * Execute yt-dlp with argument injection protection (using '--' delimiter)
 * Includes bot challenge bypasses: extractor-args, cookies, and proxy (Issue #23, #64)
 * Added timeout guard to prevent hung child processes (Issue #67)
 */
function runYtDlp(args, options = {}) {
  return new Promise((resolve, reject) => {
    const timeoutMs = options.timeout || 15000;
    let timer = null;

    const fullArgs = [];
    if (supportsJsRuntimes()) {
      fullArgs.push('--js-runtimes', 'node:node');
    }
    if (YTDLP_EXTRACTOR_ARGS) {
      fullArgs.push('--extractor-args', YTDLP_EXTRACTOR_ARGS);
    }
    if (YTDLP_COOKIES_PATH && fs.existsSync(YTDLP_COOKIES_PATH)) {
      fullArgs.push('--cookies', YTDLP_COOKIES_PATH);
    }
    if (YTDLP_PROXY) {
      fullArgs.push('--proxy', YTDLP_PROXY);
    }
    fullArgs.push(...args);

    const ytdlpBin = resolveSidecarBinary('yt-dlp');
    const proc = spawn(ytdlpBin, fullArgs, {
      windowsHide: true,
      env: getSanitizedEnv(process.env)
    });

    if (timeoutMs > 0) {
      timer = setTimeout(() => {
        try { proc.kill('SIGKILL'); } catch (_e) {}
        reject(new Error(`yt-dlp timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      if (timer.unref) timer.unref();
    }

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString('utf8');
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString('utf8');
    });

    proc.on('close', (code) => {
      if (timer) clearTimeout(timer);
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(stderr.trim() || `yt-dlp exited with code ${code}`));
      }
    });

    proc.on('error', (err) => {
      if (timer) clearTimeout(timer);
      reject(err);
    });
  });
}

/**
 * Extract direct playable audio stream URL for In-App Preview Player (Issue #67)
 */
async function getPreviewStreamUrl(url) {
  const cached = streamUrlCache.get(url);
  if (cached) {
    return cached;
  }

  try {
    const streamUrl = await runYtDlp([
      '-g',
      '-f', 'ba/b',
      '--no-playlist',
      '--no-warnings',
      '--no-call-home',
      '--prefer-free-formats',
      '--',
      url
    ]);
    const parsed = streamUrl.split('\n')[0].trim();
    if (parsed) {
      const dynamicTtl = extractStreamUrlTtl(parsed, 15 * 60 * 1000);
      streamUrlCache.set(url, parsed, dynamicTtl);
      return parsed;
    }
  } catch (_primaryErr) {
    // Fallback to broader audio formats (140=m4a, 251=opus, 139=low-m4a, b=best)
    try {
      const fallbackStreamUrl = await runYtDlp([
        '-g',
        '-f', '140/251/139/ba/b',
        '--no-playlist',
        '--no-warnings',
        '--no-call-home',
        '--prefer-free-formats',
        '--',
        url
      ]);
      const parsed = fallbackStreamUrl.split('\n')[0].trim();
      if (parsed) {
        const dynamicTtl = extractStreamUrlTtl(parsed, 15 * 60 * 1000);
        streamUrlCache.set(url, parsed, dynamicTtl);
        return parsed;
      }
    } catch (fallbackErr) {
      throw new Error(`Không thể lấy luồng nghe thử: ${fallbackErr.message}`);
    }
  }
  throw new Error('Không thể lấy luồng nghe thử: URL luồng rỗng');
}

/**
 * Extract metadata for a single video
 */
async function getVideoMetadata(url) {
  try {
    const raw = await runYtDlp([
      '-j',
      '--no-playlist',
      '--',
      url
    ]);
    const info = JSON.parse(raw);
    return {
      id: info.id,
      title: info.title,
      uploader: info.uploader || info.channel || 'Nghệ sĩ',
      duration: info.duration,
      duration_string: info.duration_string || formatDuration(info.duration),
      thumbnail: info.thumbnail,
      url: info.webpage_url || url,
      isPlaylist: false
    };
  } catch (err) {
    throw new Error(`Không thể đọc thông tin bài hát: ${err.message}`);
  }
}

/**
 * Tier-1 Fast zero-subprocess YouTube Innertube search API (Issue #65)
 */
async function searchInnertube(query, limit = 10, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  let params = options.sp || null;
  if (!params) {
    if (options.type === 'playlist') {
      params = 'EgIQAw%3D%3D';
    } else if (options.sort === 'views') {
      params = 'CAMSAhAB';
    } else if (options.sort === 'date') {
      params = 'CAI%3D';
    }
  }

  const reqBody = {
    context: {
      client: {
        clientName: 'WEB',
        clientVersion: '2.20240101.00.00',
        hl: 'vi',
        gl: 'VN'
      }
    },
    query
  };
  if (params) {
    reqBody.params = params;
  }

  try {
    const res = await fetch('https://www.youtube.com/youtubei/v1/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      body: JSON.stringify(reqBody),
      signal: controller.signal
    });

    if (!res.ok) {
      throw new Error(`Innertube responded with status ${res.status}`);
    }

    const data = await res.json();
    const contents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
    const results = [];

    for (const section of contents) {
      const items = section.itemSectionRenderer?.contents || [];
      for (const item of items) {
        if (item.videoRenderer) {
          const vr = item.videoRenderer;
          if (!vr.videoId) continue;
          const title = vr.title?.runs?.map(r => r.text).join('') || vr.title?.simpleText || '';
          const uploader = vr.ownerText?.runs?.map(r => r.text).join('') || vr.longBylineText?.runs?.map(r => r.text).join('') || 'Nghệ sĩ';
          const duration_string = vr.lengthText?.simpleText || '00:00';
          const thumbList = vr.thumbnail?.thumbnails || [];
          const thumbnail = thumbList.length > 0 ? thumbList[thumbList.length - 1].url : 'assets/default-thumbnail.jpg';

          results.push({
            id: vr.videoId,
            title,
            uploader,
            duration: parseDurationString(duration_string),
            duration_string,
            thumbnail,
            url: `https://www.youtube.com/watch?v=${vr.videoId}`,
            isPlaylist: false
          });
        } else if (item.playlistRenderer) {
          const pr = item.playlistRenderer;
          if (!pr.playlistId) continue;
          const title = pr.title?.simpleText || pr.title?.runs?.map(r => r.text).join('') || '';
          const uploader = pr.shortBylineText?.runs?.map(r => r.text).join('') || 'Nghệ sĩ';
          const thumbList = pr.thumbnails?.[0]?.thumbnails || [];
          const thumbnail = thumbList.length > 0 ? thumbList[thumbList.length - 1].url : 'assets/default-thumbnail.jpg';
          const videoCount = pr.videoCount || 0;

          results.push({
            id: pr.playlistId,
            title,
            uploader,
            duration: 0,
            duration_string: `${videoCount} bài hát`,
            thumbnail,
            url: `https://www.youtube.com/playlist?list=${pr.playlistId}`,
            isPlaylist: true
          });
        } else if (item.lockupViewModel) {
          const lm = item.lockupViewModel;
          const isPl = lm.contentType === 'LOCKUP_CONTENT_TYPE_PLAYLIST';
          const id = lm.contentId;
          if (!id) continue;
          const title = lm.metadata?.lockupMetadataViewModel?.title?.content || '';
          const uploader = lm.metadata?.lockupMetadataViewModel?.metadata?.metadataRows?.[0]?.metadataParts?.[0]?.text?.content || 'Nghệ sĩ';
          let thumbnail = 'assets/default-thumbnail.jpg';
          const imageSources = lm.contentImage?.collectionThumbnailViewModel?.primaryThumbnail?.thumbnailViewModel?.image?.sources
            || lm.contentImage?.thumbnailViewModel?.image?.sources || [];
          if (imageSources.length > 0) {
            thumbnail = imageSources[imageSources.length - 1].url;
          }

          results.push({
            id,
            title,
            uploader,
            duration: 0,
            duration_string: isPl ? 'Tuyển tập' : '00:00',
            thumbnail,
            url: isPl ? `https://www.youtube.com/playlist?list=${id}` : `https://www.youtube.com/watch?v=${id}`,
            isPlaylist: isPl
          });
        }
        if (results.length >= limit) break;
      }
      if (results.length >= limit) break;
    }
    return results;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Subprocess search with yt-dlp (Fallback or Sorting/Playlist queries)
 */
async function searchWithYtDlp(query, options = {}) {
  const limit = options.limit || 10;
  const isPlaylist = options.type === 'playlist';

  let sp = options.sp || null;
  if (!sp) {
    if (options.type === 'playlist') {
      sp = 'EgIQAw%3D%3D';
    } else if (options.sort === 'views') {
      sp = 'CAMSAhAB';
    } else if (options.sort === 'date') {
      sp = 'CAI%3D';
    }
  }

  let targetUrl = '';
  if (sp) {
    targetUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=${encodeURIComponent(sp)}`;
  } else {
    targetUrl = isPlaylist ? `ytsearch${limit}:playlist ${query}` : `ytsearch${limit}:${query}`;
  }

  const baseArgs = ['--flat-playlist', '--dump-json', '--playlist-end', String(limit)];
  const args = [...baseArgs, '--', targetUrl];

  const raw = await runYtDlp(args);
  if (!raw) return [];

  const lines = raw.split('\n').filter(line => line.trim().length > 0);
  const results = [];

  for (const line of lines) {
    try {
      const item = JSON.parse(line);
      let thumb = item.thumbnail;
      if (Array.isArray(item.thumbnails) && item.thumbnails.length > 0) {
        thumb = item.thumbnails[item.thumbnails.length - 1].url;
      }

      results.push({
        id: item.id,
        title: item.title,
        uploader: item.uploader || item.channel || 'Nghệ sĩ',
        duration: item.duration,
        duration_string: item.duration_string || formatDuration(item.duration),
        thumbnail: thumb || 'assets/default-thumbnail.jpg',
        url: item.url && item.url.startsWith('http') ? item.url : `https://www.youtube.com/watch?v=${item.id}`,
        isPlaylist: item._type === 'playlist' || isPlaylist
      });
    } catch (_parseErr) {
      // Skip malformed individual line
    }
  }

  return results;
}

/**
 * Search YouTube with Tier-1 Innertube and Tier-2 yt-dlp fallback (Issue #64, #65)
 */
async function searchYouTube(query, options = {}) {
  const limit = options.limit || 10;
  const sort = options.sort || 'relevance';
  const cacheKey = `${query.trim().toLowerCase()}:${limit}:${options.sp || ''}:${options.type || 'all'}:${sort}`;
  const cached = searchCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Tier 1: Fast zero-subprocess Innertube search (<200ms)
  try {
    const innertubeResults = await searchInnertube(query.trim(), limit, options);
    if (innertubeResults && innertubeResults.length > 0) {
      searchCache.set(cacheKey, innertubeResults);
      return innertubeResults;
    }
  } catch (_innertubeErr) {
    // Proceed to Tier 2 fallback
  }

  // Tier 2: yt-dlp CLI fallback
  try {
    const ytdlpResults = await searchWithYtDlp(query, options);
    searchCache.set(cacheKey, ytdlpResults);
    return ytdlpResults;
  } catch (err) {
    throw new Error(`Lỗi tìm kiếm bài hát: ${err.message}`);
  }
}

/**
 * Tier-1 Zero-Subprocess Fast YouTube Innertube Playlist Parser (Issue #122)
 */
async function parsePlaylistInnertube(url, limit = 50) {
  const match = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  if (!match) return null;
  const playlistId = match[1];
  const browseId = playlistId.startsWith('VL') ? playlistId : 'VL' + playlistId;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch('https://www.youtube.com/youtubei/v1/browse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'WEB',
            clientVersion: '2.20240101.00.00',
            hl: 'vi',
            gl: 'VN'
          }
        },
        browseId
      }),
      signal: controller.signal
    });

    if (!res.ok) return null;
    const data = await res.json();
    const title = data.metadata?.playlistMetadataRenderer?.title || data.header?.playlistHeaderRenderer?.title?.simpleText || 'Tuyển tập';
    const uploader = data.header?.playlistHeaderRenderer?.ownerText?.runs?.[0]?.text || 'Nghệ sĩ';

    const tabs = data.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
    const entries = [];

    for (const t of tabs) {
      const secList = t.tabRenderer?.content?.sectionListRenderer?.contents || [];
      for (const sec of secList) {
        const items = sec.itemSectionRenderer?.contents || [];
        for (const it of items) {
          if (it.lockupViewModel) {
            const lm = it.lockupViewModel;
            const id = lm.contentId;
            if (!id) continue;
            const itemTitle = lm.metadata?.lockupMetadataViewModel?.title?.content || 'Bài hát';
            const itemUploader = lm.metadata?.lockupMetadataViewModel?.metadata?.metadataRows?.[0]?.metadataParts?.[0]?.text?.content || uploader;
            const sources = lm.contentImage?.thumbnailViewModel?.image?.sources || [];
            const thumb = sources.length > 0 ? sources[sources.length - 1].url : 'assets/default-thumbnail.jpg';
            entries.push({
              id,
              title: itemTitle,
              uploader: itemUploader,
              duration: 0,
              duration_string: '00:00',
              thumbnail: thumb,
              url: `https://www.youtube.com/watch?v=${id}`
            });
          } else if (it.playlistVideoRenderer) {
            const pvr = it.playlistVideoRenderer;
            const id = pvr.videoId;
            if (!id) continue;
            const itemTitle = pvr.title?.runs?.map(r => r.text).join('') || pvr.title?.simpleText || 'Bài hát';
            const itemUploader = pvr.shortBylineText?.runs?.map(r => r.text).join('') || uploader;
            const thumbs = pvr.thumbnail?.thumbnails || [];
            const thumb = thumbs.length > 0 ? thumbs[thumbs.length - 1].url : 'assets/default-thumbnail.jpg';
            const duration_string = pvr.lengthText?.simpleText || '00:00';
            entries.push({
              id,
              title: itemTitle,
              uploader: itemUploader,
              duration: 0,
              duration_string,
              thumbnail: thumb,
              url: `https://www.youtube.com/watch?v=${id}`
            });
          }
          if (entries.length >= limit) break;
        }
        if (entries.length >= limit) break;
      }
    }

    return entries.length > 0 ? { title, uploader, count: entries.length, entries } : null;
  } catch (_err) {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Extract tracks from a YouTube Playlist URL (up to limit)
 */
async function parsePlaylist(url, limit = 50) {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    throw new Error('Vui lòng cung cấp đường dẫn danh sách phát (Playlist URL) hợp lệ');
  }

  const cacheKey = `${url.trim()}:${limit}`;
  const cached = playlistCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Tier 1: Fast zero-subprocess Innertube browse (<400ms)
  try {
    const fastResult = await parsePlaylistInnertube(url.trim(), limit);
    if (fastResult && fastResult.entries && fastResult.entries.length > 0) {
      playlistCache.set(cacheKey, fastResult);
      return fastResult;
    }
  } catch (_innertubeErr) {
    // Graceful fallback to Tier 2 subprocess
  }

  // Tier 2: Subprocess fallback with yt-dlp
  const args = [
    '--flat-playlist',
    '--dump-single-json',
    '--playlist-end', String(limit),
    '--',
    url.trim()
  ];

  try {
    const raw = await runYtDlp(args);
    if (!raw) return { title: 'Danh sách phát', entries: [] };

    const data = JSON.parse(raw);
    const rawEntries = Array.isArray(data.entries) ? data.entries : (data._type === 'playlist' ? [] : [data]);
    
    const entries = rawEntries.map(item => {
      let thumb = item.thumbnail;
      if (Array.isArray(item.thumbnails) && item.thumbnails.length > 0) {
        thumb = item.thumbnails[item.thumbnails.length - 1].url;
      }
      return {
        id: item.id,
        title: item.title,
        uploader: item.uploader || item.channel || item.artist || 'Nghệ sĩ',
        duration: item.duration,
        duration_string: item.duration_string || formatDuration(item.duration),
        thumbnail: thumb || 'assets/default-thumbnail.jpg',
        url: item.url && item.url.startsWith('http') ? item.url : `https://www.youtube.com/watch?v=${item.id}`
      };
    });

    const parsedResult = {
      title: data.title || 'Danh sách phát',
      uploader: data.uploader || data.channel || 'Tuyển tập',
      count: entries.length,
      entries
    };

    playlistCache.set(cacheKey, parsedResult);
    return parsedResult;
  } catch (err) {
    throw new Error(`Không thể đọc danh sách phát: ${err.message}`);
  }
}

/**
 * Helper to format seconds into MM:SS
 */
function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
  return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

/**
 * Get yt-dlp binary version
 */
async function getYtDlpVersion() {
  if (process.env.MOCK_DIAGNOSTICS_VERSIONS === '1') {
    return '2025.02.01';
  }
  try {
    const version = await runYtDlp(['--version']);
    return version || 'unknown';
  } catch (_e) {
    return 'not_installed';
  }
}

/**
 * Get FFmpeg binary version
 */
function getFFmpegVersion() {
  if (process.env.MOCK_DIAGNOSTICS_VERSIONS === '1') {
    return Promise.resolve('ffmpeg version 6.1-static');
  }
  return new Promise((resolve) => {
    try {
      const ffmpegBin = resolveSidecarBinary('ffmpeg');
      const proc = spawn(ffmpegBin, ['-version'], {
        windowsHide: true,
        env: getSanitizedEnv(process.env)
      });
      let output = '';
      proc.stdout.on('data', (d) => { output += d.toString('utf8'); });
      proc.on('close', (code) => {
        if (code === 0 && output) {
          const firstLine = output.split('\n')[0].trim();
          resolve(firstLine);
        } else {
          resolve('unknown');
        }
      });
      proc.on('error', () => resolve('not_installed'));
    } catch (_e) {
      resolve('not_installed');
    }
  });
}

/**
 * Gather system diagnostic metrics
 */
async function getSystemDiagnostics() {
  const { DOWNLOADS_DIR, MAX_STORAGE_MB } = require('../config');
  const ytDlpVersion = await getYtDlpVersion();
  const ffmpegVersion = await getFFmpegVersion();

  let storageUsedMb = 0;
  let fileCount = 0;
  try {
    if (fs.existsSync(DOWNLOADS_DIR)) {
      const files = fs.readdirSync(DOWNLOADS_DIR);
      for (const f of files) {
        const full = path.join(DOWNLOADS_DIR, f);
        try {
          const stat = fs.statSync(full);
          if (stat.isFile()) {
            storageUsedMb += stat.size / (1024 * 1024);
            fileCount++;
          }
        } catch (_e) {}
      }
    }
  } catch (_e) {}

  return {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    uptime: process.uptime(),
    ytDlpVersion,
    ffmpegVersion,
    memory: {
      rssMb: Math.round(process.memoryUsage().rss / (1024 * 1024)),
      heapUsedMb: Math.round(process.memoryUsage().heapUsed / (1024 * 1024)),
      heapTotalMb: Math.round(process.memoryUsage().heapTotal / (1024 * 1024))
    },
    storage: {
      downloadsDir: DOWNLOADS_DIR,
      fileCount,
      usedMb: Math.round(storageUsedMb * 100) / 100,
      quotaMb: MAX_STORAGE_MB
    }
  };
}

/**
 * In-place update of yt-dlp binary (Issue #39)
 */
async function updateYtDlpBinary() {
  if (process.env.MOCK_YTDLP_UPDATE === 'success') {
    return {
      success: true,
      oldVersion: '2025.01.01',
      newVersion: '2025.02.01',
      message: 'yt-dlp is up to date (mock)'
    };
  }
  if (process.env.MOCK_YTDLP_UPDATE === 'fail') {
    return {
      success: false,
      oldVersion: '2025.01.01',
      newVersion: '2025.01.01',
      error: 'Không thể tự động cập nhật yt-dlp: Homebrew managed'
    };
  }
  const currentVersion = await getYtDlpVersion();
  try {
    const updateOutput = await runYtDlp(['-U'], { timeout: 6000 });
    const newVersion = await getYtDlpVersion();
    return {
      success: true,
      oldVersion: currentVersion,
      newVersion,
      message: updateOutput || 'Cập nhật yt-dlp thành công'
    };
  } catch (err) {
    return {
      success: false,
      oldVersion: currentVersion,
      newVersion: currentVersion,
      error: `Không thể tự động cập nhật yt-dlp: ${err.message}`
    };
  }
}

module.exports = {
  runYtDlp,
  getPreviewStreamUrl,
  getVideoMetadata,
  searchYouTube,
  searchInnertube,
  parsePlaylist,
  parsePlaylistInnertube,
  formatDuration,
  parseDurationString,
  supportsJsRuntimes,
  getYtDlpVersion,
  getFFmpegVersion,
  getSystemDiagnostics,
  updateYtDlpBinary,
  searchCache,
  playlistCache,
  streamUrlCache,
  SimpleCache,
  extractStreamUrlTtl
};
