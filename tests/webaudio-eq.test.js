const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('TuneFlow Web Audio DSP & Equalizer Mathematics Suite', () => {
  const eqPresets = {
    standard: { lowGain: 0.0, midGain: 0.0, highGain: 0.0 },
    clarity: { lowGain: -3.0, midGain: 4.5, highGain: 2.0 },
    warm: { lowGain: 4.0, midGain: 0.0, highGain: -2.0 }
  };

  const boostLevels = [1.0, 1.25, 1.5];

  const compressorSpecs = {
    threshold: -12,
    knee: 20,
    ratio: 6,
    attack: 0.003,
    release: 0.25
  };

  it('should verify EQ clarity preset boosts vocal frequency and reduces rumble', () => {
    const clarity = eqPresets.clarity;
    assert.strictEqual(clarity.lowGain < 0, true, 'Low gain must be attenuated to eliminate rumble');
    assert.strictEqual(clarity.midGain > 0, true, 'Mid gain must be amplified for vocal presence');
    assert.strictEqual(clarity.highGain > 0, true, 'High gain must be amplified for clarity');
  });

  it('should verify EQ warm preset boosts bass for Bolero and rolls off harsh highs', () => {
    const warm = eqPresets.warm;
    assert.strictEqual(warm.lowGain > 0, true, 'Low gain must be boosted for warm low-end');
    assert.strictEqual(warm.highGain < 0, true, 'High gain must be rolled off for smooth listening');
  });

  it('should verify EQ standard preset is completely flat (zero decibel deviation)', () => {
    const std = eqPresets.standard;
    assert.strictEqual(std.lowGain, 0.0);
    assert.strictEqual(std.midGain, 0.0);
    assert.strictEqual(std.highGain, 0.0);
  });

  it('should verify Volume Boost tiers stay within safe dynamic limits', () => {
    assert.strictEqual(boostLevels[0], 1.0);
    assert.strictEqual(boostLevels[1], 1.25);
    assert.strictEqual(boostLevels[2], 1.5);
    // Never exceed 150% to prevent extreme ear fatigue
    assert.ok(boostLevels.every(lvl => lvl <= 1.5 && lvl >= 1.0));
  });

  it('should verify compressor parameters provide fast attack and smooth release', () => {
    assert.strictEqual(compressorSpecs.threshold, -12);
    assert.ok(compressorSpecs.attack <= 0.01, 'Attack must be fast to catch transient spikes');
    assert.ok(compressorSpecs.release >= 0.1, 'Release must be smooth to avoid audio pumping');
    assert.ok(compressorSpecs.ratio >= 4, 'Ratio must be high enough to compress loud peaks');
  });

  it('should verify visualizer FFT step calculation for 10 frequency bars from 32 bins', () => {
    const fftSize = 64;
    const frequencyBinCount = fftSize / 2; // 32 bins
    const barCount = 10;
    const step = Math.floor(frequencyBinCount / barCount);

    assert.strictEqual(step, 3);
    for (let i = 0; i < barCount; i++) {
      const binIndex = i * step;
      assert.ok(binIndex < frequencyBinCount, `Bin index ${binIndex} must be within bounds`);
    }
  });
});
