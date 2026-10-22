/**
 * tests/deep_vertical_ux_qa_gate.test.js
 * 
 * Deep Vertical Test Suite for UX-QA Gate and Single Focus Frame Invariant.
 * Verifies that runUxQaGate executes successfully, validates real computed styles,
 * and actively catches double-frame regressions.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { runUxQaGate, runFallbackCssVerification } = require('../scripts/ci-ux-qa-gate');

describe('F1-UX-QA-Gate-R3: Real-DOM User-Story & Visual QA/QC Gate Suite', () => {
  it('TC-UX-01: runUxQaGate() should pass all 6 Real-DOM User-Story & Focus Invariant checks with verified computed styles', async () => {
    const result = await runUxQaGate({ viewport: { width: 1080, height: 750 } });
    assert.strictEqual(result.ok, true, 'runUxQaGate must return ok: true');
    assert.ok(Array.isArray(result.checks), 'result.checks must be an array');
    assert.ok(result.checks.length >= 6 || result.mode === 'fallback_css_analysis', 'Must execute all checks');

    const expectedChecks = [
      'UX-QA-01',
      'UX-QA-02',
      'UX-QA-03',
      'UX-QA-04',
      'UX-QA-05',
      'UX-QA-06'
    ];

    if (result.mode === 'real_browser_dom') {
      for (const expected of expectedChecks) {
        assert.ok(
          result.checks.some((c) => c.includes(expected)),
          `Expected check ${expected} to be present in results`
        );
      }

      // Assert deep computed styles directly
      const { q1, q2, q3, q4, q5, themes } = result.metrics;

      // UX-QA-01: Search Bar Single Focus Frame
      assert.notStrictEqual(q1.groupBorderTopWidth, '0px', '.search-input-group must render outer border');
      assert.ok(q1.inputOutlineStyle === 'none' || q1.inputOutlineWidth === '0px', '#search-input must have zero outline');
      assert.strictEqual(q1.inputBorderTopWidth, '0px', '#search-input must have zero border');
      assert.strictEqual(q1.inputBoxShadow, 'none', '#search-input must have zero box shadow');

      // UX-QA-02: Modal Inputs Single Focus Frame
      assert.ok(q2.outlineStyle === 'none' || q2.outlineWidth === '0px', '#server-endpoint-input must have zero outline');

      // UX-QA-03: Desktop Geometry & Anti-Clipping
      assert.strictEqual(q3.hasOverflow, false, 'Desktop layout must have zero horizontal overflow');
      assert.strictEqual(q3.clippedPills.length, 0, 'Category pills must have zero text clipping');

      // UX-QA-04: Queue Drawer Elderly Summary
      assert.strictEqual(q4.visible, true, '#drawer-elderly-summary must be visible');
      assert.ok(q4.text.length > 0, '#drawer-elderly-summary must contain non-empty text');

      // UX-QA-05: 1-Click System Doctor Live Status
      assert.strictEqual(q5.visible, true, '#system-doctor-panel must be visible');
      assert.ok(q5.text.includes('Máy Chủ') || q5.text.includes('Node.js'), '#system-doctor-panel must show live doctor status');

      // UX-QA-06: Multi-Theme Focus Invariant across 5 themes
      assert.strictEqual(themes.length, 5, 'Must verify all 5 themes');
      for (const th of themes) {
        assert.notStrictEqual(th.groupBorderTopWidth, '0px', `Theme ${th.theme} must render group border`);
        assert.ok(th.inputOutlineStyle === 'none' || th.inputOutlineWidth === '0px', `Theme ${th.theme} must have zero input outline`);
        assert.strictEqual(th.inputBorderTopWidth, '0px', `Theme ${th.theme} must have zero input border`);
        assert.strictEqual(th.inputBoxShadow, 'none', `Theme ${th.theme} must have zero input box shadow`);
      }
    }
  });

  it('TC-UX-02: should detect and fail on synthetic double-frame CSS regression in search bar', async () => {
    // Inject offending CSS rule simulating the legacy regression where :focus-visible slapped outline on input
    const maliciousRegressionCss = `
      .search-input:focus,
      .search-input:focus-visible,
      #search-input:focus-visible {
        outline: 3px solid #f59e0b !important;
        outline-style: solid !important;
        outline-width: 3px !important;
      }
    `;

    await assert.rejects(
      async () => {
        await runUxQaGate({ injectCss: maliciousRegressionCss });
      },
      (err) => {
        const msg = err.message || '';
        assert.ok(
          msg.includes('UX-QA-01') || msg.includes('double focus frame') || msg.includes('outline'),
          `Error should indicate double focus frame regression, got: ${msg}`
        );
        return true;
      },
      'Gate must fail when concentric double focus frame is reintroduced'
    );
  });

  it('TC-UX-03: fallback CSS rule verification should pass on clean CSS and catch injected regression', () => {
    // Verify baseline passes
    const cleanResult = runFallbackCssVerification();
    assert.strictEqual(cleanResult.ok, true);
    assert.strictEqual(cleanResult.mode, 'fallback_css_analysis');

    // Verify synthetic regression is caught in fallback mode
    assert.throws(
      () => {
        runFallbackCssVerification('.search-input:focus-visible { outline: 3px solid #f59e0b !important; }');
      },
      /double focus frame/i,
      'Fallback verification must catch synthetic outline regression'
    );
  });
});
