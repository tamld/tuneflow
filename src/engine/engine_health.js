/**
 * Engine Health Monitor & Filial Fallback Interceptor (Issue #136)
 * - Detects YouTube cipher breakages, rate-limits, and bot-guard challenges
 * - Translates harsh developer error messages into warm, filial Vietnamese advice
 * - Coordinates autonomous self-healing and fallback to offline library
 */

const YOUTUBE_ERROR_PATTERNS = [
  /Sign in to confirm you're not a bot/i,
  /HTTP Error 429/i,
  /Too Many Requests/i,
  /Unable to extract signature cipher/i,
  /player js challenge/i,
  /n-sig/i,
  /This video is unavailable/i,
  /Video unavailable/i,
  /bot-detection/i
];

const FILIAL_FALLBACK_MESSAGE =
  'Dạ máy chủ YouTube đang bảo trì một chút, TuneFlow đang tự động khắc phục cho Bố Mẹ. Bố Mẹ bấm vào đây để nghe ngay các bài đã tải sẵn trong Thư Viện nhé!';

/**
 * Classify a raw error into an elderly-friendly diagnostic
 * @param {Error|string} err
 * @returns {{ isYouTubeDegraded: boolean, filialMessage: string, fallbackSuggested: boolean, rawMessage: string }}
 */
function classifyYouTubeError(err) {
  const message = (err && (err.message || err.toString())) || '';
  const isYouTubeDegraded = YOUTUBE_ERROR_PATTERNS.some(pattern => pattern.test(message));

  return {
    isYouTubeDegraded,
    fallbackSuggested: isYouTubeDegraded,
    filialMessage: isYouTubeDegraded ? FILIAL_FALLBACK_MESSAGE : message,
    rawMessage: message
  };
}

class EngineHealthMonitor {
  constructor(threshold = 2, cooldownMs = 30 * 60 * 1000) {
    this.consecutiveErrors = 0;
    this.errorThreshold = threshold;
    this.cooldownMs = cooldownMs;
    this.lastError = null;
    this.lastSuccessTime = Date.now();
    this.lastUpdateAttempt = 0;
    this.isUpdating = false;
    this.autoUpdaterFn = null;
  }

  /**
   * Set callback function for autonomous binary self-update
   * @param {Function} fn Async function returning { success: boolean, newVersion?: string }
   */
  setAutoUpdater(fn) {
    this.autoUpdaterFn = fn;
  }

  /**
   * Attempt autonomous self-healing if not in cooldown
   * @returns {Promise<boolean>}
   */
  async triggerSelfHealing() {
    if (this.isUpdating) return false;
    const now = Date.now();
    if (now - this.lastUpdateAttempt < this.cooldownMs) {
      return false; // Still in cooldown
    }
    if (typeof this.autoUpdaterFn !== 'function') {
      return false;
    }

    this.isUpdating = true;
    this.lastUpdateAttempt = now;
    try {
      const result = await this.autoUpdaterFn();
      if (result && result.success) {
        this.consecutiveErrors = 0;
        this.lastError = null;
        return true;
      }
      return false;
    } catch (_err) {
      return false;
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * Record a failure event
   * @param {Error|string} error
   * @returns {Object} Error classification
   */
  recordError(error) {
    this.consecutiveErrors++;
    this.lastError = error;

    const classification = classifyYouTubeError(error);
    if (this.consecutiveErrors >= this.errorThreshold && classification.isYouTubeDegraded) {
      // Trigger autonomous self-healing in the background
      this.triggerSelfHealing().catch(() => {});
    }
    return classification;
  }

  /**
   * Record a successful search or download
   */
  recordSuccess() {
    this.consecutiveErrors = 0;
    this.lastError = null;
    this.lastSuccessTime = Date.now();
  }

  /**
   * Current health status snapshot
   * @returns {Object}
   */
  getStatus() {
    const degraded = this.consecutiveErrors >= this.errorThreshold;
    return {
      healthy: !degraded,
      degraded,
      consecutiveErrors: this.consecutiveErrors,
      isUpdating: this.isUpdating,
      lastError: this.lastError ? (this.lastError.message || String(this.lastError)) : null,
      lastSuccessTime: this.lastSuccessTime
    };
  }
}

// Global singleton
const defaultMonitor = new EngineHealthMonitor();

module.exports = {
  EngineHealthMonitor,
  classifyYouTubeError,
  engineHealthMonitor: defaultMonitor,
  FILIAL_FALLBACK_MESSAGE
};
