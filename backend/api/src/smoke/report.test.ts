import { describe, expect, it } from 'vitest';
import { createSmokeReport } from './report.js';

describe('createSmokeReport', () => {
  it('fails when any required check fails', () => {
    const report = createSmokeReport([
      { name: 'first', status: 'passed', details: {} },
      { name: 'second', status: 'failed', details: {} },
    ]);

    expect(report.passed).toBe(false);
  });

  it('allows explicitly skipped non-required checks', () => {
    const report = createSmokeReport([{ name: 'first', status: 'skipped', details: {} }]);

    expect(report.passed).toBe(true);
  });
});
