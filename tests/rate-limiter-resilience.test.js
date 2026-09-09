const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { createRateLimiter } = require('../src/utils/rateLimiter');

describe('TuneFlow Sliding Window Rate Limiter Resilience Suite', () => {
  it('should allow requests within threshold and pass to next()', () => {
    const limiter = createRateLimiter({ windowMs: 1000, max: 3 });
    let callCount = 0;
    const req = { ip: '10.0.0.1' };
    const res = {};
    const next = () => { callCount++; };

    limiter(req, res, next);
    limiter(req, res, next);
    limiter(req, res, next);

    assert.strictEqual(callCount, 3);
  });

  it('should reject requests exceeding max threshold with 429 and Retry-After header', () => {
    const limiter = createRateLimiter({ windowMs: 1000, max: 2, message: 'Too fast' });
    const req = { ip: '10.0.0.2' };
    let status = null;
    let responseBody = null;
    let retryAfter = null;

    const res = {
      setHeader: (name, val) => {
        if (name === 'Retry-After') retryAfter = val;
      },
      status: (code) => {
        status = code;
        return {
          json: (body) => { responseBody = body; }
        };
      }
    };
    const next = () => {};

    // 1st and 2nd allowed
    limiter(req, res, next);
    limiter(req, res, next);

    // 3rd should be throttled
    limiter(req, res, next);

    assert.strictEqual(status, 429);
    assert.strictEqual(retryAfter, 1);
    assert.deepStrictEqual(responseBody, { success: false, error: 'Too fast' });
  });

  it('should isolate rate limits across different IP addresses', () => {
    const limiter = createRateLimiter({ windowMs: 1000, max: 1 });
    let passedIp1 = 0;
    let passedIp2 = 0;

    const res = { setHeader: () => {}, status: () => ({ json: () => {} }) };

    limiter({ ip: '1.1.1.1' }, res, () => { passedIp1++; });
    limiter({ ip: '1.1.1.1' }, res, () => { passedIp1++; }); // Should be blocked

    limiter({ ip: '2.2.2.2' }, res, () => { passedIp2++; }); // Should pass

    assert.strictEqual(passedIp1, 1);
    assert.strictEqual(passedIp2, 1);
  });

  it('should support manual cache reset via middleware.reset()', () => {
    const limiter = createRateLimiter({ windowMs: 1000, max: 1 });
    let count = 0;
    const req = { ip: '10.0.0.5' };
    const res = { setHeader: () => {}, status: () => ({ json: () => {} }) };

    limiter(req, res, () => { count++; });
    limiter(req, res, () => { count++; }); // blocked
    assert.strictEqual(count, 1);

    limiter.reset();

    limiter(req, res, () => { count++; }); // should pass after reset
    assert.strictEqual(count, 2);
  });
});
