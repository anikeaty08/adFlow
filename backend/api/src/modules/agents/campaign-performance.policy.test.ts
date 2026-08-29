import { describe, expect, it } from 'vitest';
import { classifyCampaignPerformance } from './campaign-performance.policy.js';

describe('campaign performance policy', () => {
  it('waits for a statistically useful volume of verified impressions', () => {
    expect(
      classifyCampaignPerformance({ acceptedImpressions: 99, acceptedClicks: 5, rejectedEvents: 0 }),
    ).toBe('NO_DATA');
  });

  it('classifies verified traffic by deterministic CTR thresholds', () => {
    expect(
      classifyCampaignPerformance({ acceptedImpressions: 1_000, acceptedClicks: 12, rejectedEvents: 0 }),
    ).toBe('GOOD');
    expect(
      classifyCampaignPerformance({ acceptedImpressions: 1_000, acceptedClicks: 2, rejectedEvents: 0 }),
    ).toBe('BAD');
  });

  it('prioritizes a high rejection ratio as fraud regardless of CTR', () => {
    expect(
      classifyCampaignPerformance({ acceptedImpressions: 10, acceptedClicks: 2, rejectedEvents: 20 }),
    ).toBe('FRAUD');
  });
});
