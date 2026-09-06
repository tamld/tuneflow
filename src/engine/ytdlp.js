const { spawn } = require('child_process');

/**
 * Execute yt-dlp with argument injection protection (using '--' delimiter)
 */
function runYtDlp(args) {
  return new Promise((resolve, reject) => {
    const fullArgs = ['--js-runtimes', 'node:node', ...args];
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

    return {
      title: data.title || 'Danh sách phát',
      uploader: data.uploader || data.channel || 'Tuyển tập',
      count: entries.length,
      entries
    };
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
  formatDuration
};
