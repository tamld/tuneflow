const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const {
  EngineHealthMonitor,
  classifyYouTubeError
} = require('../src/engine/engine_health');

describe('Autonomous Engine Health & Filial Fallback Interceptor (Issue #136)', () => {
  let monitor;

  beforeEach(() => {
    monitor = new EngineHealthMonitor();
  });

  it('should initialize with healthy baseline status', () => {
    const status = monitor.getStatus();
    assert.strictEqual(status.healthy, true);
    assert.strictEqual(status.degraded, false);
    assert.strictEqual(status.consecutiveErrors, 0);
  });

  it('should correctly classify YouTube bot-detection / cipher errors as degraded with filial advice', () => {
    const rawBotError = new Error("Sign in to confirm you're not a bot. Use --cookies-from-browser");
    const classification = classifyYouTubeError(rawBotError);

    assert.strictEqual(classification.isYouTubeDegraded, true);
    assert.strictEqual(classification.fallbackSuggested, true);
    assert.ok(classification.filialMessage.includes('YouTube đang bảo trì'), 'Must contain gentle filial message');
    assert.ok(classification.filialMessage.includes('Thư Viện'), 'Must suggest listening to downloaded library');
  });

  it('should classify HTTP 429 Too Many Requests as YouTube degraded', () => {
    const rawRateError = new Error('HTTP Error 429: Too Many Requests');
    const classification = classifyYouTubeError(rawRateError);

    assert.strictEqual(classification.isYouTubeDegraded, true);
    assert.strictEqual(classification.fallbackSuggested, true);
  });

  it('should classify cipher decryption failure as YouTube degraded', () => {
    const rawCipherError = new Error('Unable to extract signature cipher / player js challenge');
    const classification = classifyYouTubeError(rawCipherError);

    assert.strictEqual(classification.isYouTubeDegraded, true);
    assert.strictEqual(classification.fallbackSuggested, true);
  });

  it('should automatically mark engine as degraded after repeated consecutive failures', () => {
    const botErr = new Error("Sign in to confirm you're not a bot");
    monitor.recordError(botErr);
    assert.strictEqual(monitor.getStatus().consecutiveErrors, 1);

    monitor.recordError(botErr);
    assert.strictEqual(monitor.getStatus().consecutiveErrors, 2);
    assert.strictEqual(monitor.getStatus().degraded, true);
  });

  it('should recover to healthy state when a successful operation is recorded', () => {
    const botErr = new Error("Sign in to confirm you're not a bot");
    monitor.recordError(botErr);
    monitor.recordError(botErr);
    assert.strictEqual(monitor.getStatus().degraded, true);

    monitor.recordSuccess();
    assert.strictEqual(monitor.getStatus().degraded, false);
    assert.strictEqual(monitor.getStatus().consecutiveErrors, 0);
  });

  it('should trigger autonomous self-healing updater when degraded and recover on success', async () => {
    let updateCalled = 0;
    monitor.setAutoUpdater(async () => {
      updateCalled++;
      return { success: true, newVersion: '2026.09.13' };
    });

    const botErr = new Error("Sign in to confirm you're not a bot");
    monitor.recordError(botErr);
    assert.strictEqual(updateCalled, 0);

    // Second error reaches threshold = 2
    monitor.recordError(botErr);
    await new Promise(r => setTimeout(r, 20));

    assert.strictEqual(updateCalled, 1, 'Auto-updater must be triggered autonomously');
    assert.strictEqual(monitor.getStatus().healthy, true, 'Monitor should recover after successful self-healing');
  });

  it('should respect cooldown and prevent duplicate concurrent update triggers', async () => {
    let updateCalled = 0;
    monitor.setAutoUpdater(async () => {
      updateCalled++;
      return { success: true };
    });

    const botErr = new Error("Sign in to confirm you're not a bot");
    monitor.recordError(botErr);
    monitor.recordError(botErr);
    await new Promise(r => setTimeout(r, 20));
    assert.strictEqual(updateCalled, 1);

    // Immediate subsequent error within cooldown window should NOT trigger another update
    monitor.recordError(botErr);
    monitor.recordError(botErr);
    await new Promise(r => setTimeout(r, 20));
    assert.strictEqual(updateCalled, 1, 'Must suppress update triggers during cooldown');
  });
});

