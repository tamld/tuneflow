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

module.exports = {
  isValidYouTubeUrl,
  isValidVideoId,
  ALLOWED_YOUTUBE_HOSTS
};
