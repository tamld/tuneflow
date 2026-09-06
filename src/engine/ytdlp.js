const { spawn } = require('child_process');
const fs = require('fs');
const { YTDLP_COOKIES_PATH, YTDLP_PROXY, YTDLP_EXTRACTOR_ARGS } = require('../config');

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
    return entry.value;
  }

  set(key, value) {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, {
      value,
      expiry: Date.now() + this.ttlMs
    });
  }

  clear() {
    this.cache.clear();
  }
}

const searchCache = new SimpleCache(15 * 60 * 1000, 100);
const playlistCache = new SimpleCache(15 * 60 * 1000, 50);

/**
 * Execute yt-dlp with argument injection protection (using '--' delimiter)
 * Includes bot challenge bypasses: extractor-args, cookies, and proxy (Issue #23)
 */
function runYtDlp(args) {
  return new Promise((resolve, reject) => {
    const fullArgs = ['--js-runtimes', 'node:node'];
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

    const process = spawn('yt-dlp', fullArgs, {
      windowsHide: true
    });

    let stdout = '';
    let stderr = '';

    process.stdout.on('data', (data) => {
      stdout += data.toString('utf8');
    });

    process.stderr.on('data', (data) => {
      stderr += data.toString('utf8');
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(stderr.trim() || `yt-dlp exited with code ${code}`));
      }
    });

    process.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Extract direct playable audio stream URL for In-App Preview Player
 */
async function getPreviewStreamUrl(url) {
  try {
    const streamUrl = await runYtDlp([
      '-g',
      '-f', 'ba/b',
      '--no-playlist',
      '--',
      url
    ]);
    return streamUrl.split('\n')[0].trim();
  } catch (err) {
    throw new Error(`Không thể lấy luồng nghe thử: ${err.message}`);
  }
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
 * Search YouTube with optional sorting (sp parameter)
 */
async function searchYouTube(query, options = {}) {
  const limit = options.limit || 10;
  const isPlaylist = options.type === 'playlist';
  const cacheKey = `${query.trim().toLowerCase()}:${limit}:${options.sp || ''}:${isPlaylist}`;
  const cached = searchCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  
  let targetUrl = '';
  if (options.sp) {
    targetUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=${encodeURIComponent(options.sp)}`;
  } else {
    targetUrl = isPlaylist ? `ytsearch${limit}:playlist ${query}` : `ytsearch${limit}:${query}`;
  }

  const baseArgs = ['--flat-playlist', '--dump-json', '--playlist-end', String(limit)];
  const args = [...baseArgs, '--', targetUrl];

  try {
    const raw = await runYtDlp(args);
    if (!raw) return [];

    const lines = raw.split('\n').filter(line => line.trim().length > 0);
    const results = [];

    for (const line of lines) {
      try {
        const item = JSON.parse(line);
        // Normalize thumbnail
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
      } catch (parseErr) {
        // Skip malformed individual line
      }
    }

    searchCache.set(cacheKey, results);
    return results;
  } catch (err) {
    throw new Error(`Lỗi tìm kiếm bài hát: ${err.message}`);
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

module.exports = {
  runYtDlp,
  getPreviewStreamUrl,
  getVideoMetadata,
  searchYouTube,
  parsePlaylist,
  formatDuration,
  searchCache,
  playlistCache
};
