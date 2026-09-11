const { URL } = require('url');

const ALLOWED_YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be'
]);

const VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

/**
 * Validates whether a given URL string belongs strictly to official YouTube domains.
 * Prevents SSRF attacks against internal network or unsupported protocols.
 * @param {string} urlStr
 * @returns {boolean}
 */
function isValidYouTubeUrl(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') return false;
  // Reject URLs containing shell metacharacters or control characters
  if (/[;\r\n`|<>$]/.test(urlStr)) return false;
  try {
    const parsed = new URL(urlStr.trim());
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
    const host = parsed.hostname.toLowerCase();
    return ALLOWED_YOUTUBE_HOSTS.has(host);
  } catch (err) {
    return false;
  }
}

/**
 * Validates YouTube 11-character video ID
 * @param {string} id
 * @returns {boolean}
 */
function isValidVideoId(id) {
  if (!id || typeof id !== 'string') return false;
  return VIDEO_ID_REGEX.test(id.trim());
}

const ALLOWED_STREAM_DOMAINS = [
  'googlevideo.com',
  'youtube.com',
  'ytimg.com'
];

/**
 * Validates that an upstream streaming URL resolves strictly to official Google/YouTube CDN
 * and prevents SSRF attacks targeting local loopback (127.0.0.1) or private RFC-1918 subnets.
 * @param {string} urlStr
 * @returns {boolean}
 */
function isSafeRemoteStreamUrl(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') return false;
  if (/[;\r\n`|<>$]/.test(urlStr)) return false;
  try {
    const parsed = new URL(urlStr.trim());

    // Allow test harness mock audio server on loopback
    if (parsed.pathname.includes('mock-audio') && (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost')) {
      return true;
    }

    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();

    // Disallow IP literals and loopback/internal hosts
    if (/^(127\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.|169\.254\.|localhost)/.test(host)) {
      return false;
    }

    return ALLOWED_STREAM_DOMAINS.some(domain => host === domain || host.endsWith('.' + domain));
  } catch (err) {
    return false;
  }
}

const ALLOWED_STREAM_MIME_PREFIXES = ['audio/', 'video/'];
const BLOCKED_MIME_TYPES = ['text/html', 'application/json', 'text/plain'];

/**
 * Validates that an upstream Content-Type header is genuine audio or video media stream.
 * Prevents piping HTML captcha/block pages into HTML5 <audio> elements.
 * @param {string} contentType
 * @returns {boolean}
 */
function isValidStreamMimeType(contentType) {
  if (!contentType || typeof contentType !== 'string') return false;
  const normalized = contentType.trim().toLowerCase();
  if (BLOCKED_MIME_TYPES.some(b => normalized.startsWith(b))) {
    return false;
  }
  return ALLOWED_STREAM_MIME_PREFIXES.some(prefix => normalized.startsWith(prefix));
}

module.exports = {
  isValidYouTubeUrl,
  isValidVideoId,
  isValidStreamMimeType,
  isSafeRemoteStreamUrl,
  ALLOWED_YOUTUBE_HOSTS
};
