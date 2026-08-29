import { describe, expect, it } from 'vitest';
import { evaluatePublisherEligibility } from './publisher-eligibility.js';

const campaign = {
  allowedCategories: ['AI', 'Developer'],
  blockedCategories: ['Gambling', 'Adult'],
  maxUnitPriceAtomic: '40000',
  minReputationScore: '80',
};

describe('evaluatePublisherEligibility', () => {
  it('accepts verified, targeted inventory with sufficient reputation and a compliant price', () => {
    expect(
      evaluatePublisherEligibility(campaign, {
        categories: ['developer'],
        floorRateAtomic: '30000',
        reputationScore: 91,
        siteStatus: 'VERIFIED',
        slotStatus: 'ACTIVE',
      }),
    ).toMatchObject({ eligible: true, reasonCodes: [], score: { components: { reputation: 91 } } });
  });

  it('rejects inventory before an agent can see it when deterministic safeguards fail', () => {
    expect(
      evaluatePublisherEligibility(campaign, {
        categories: ['gambling'],
        floorRateAtomic: '50000',
        siteStatus: 'PENDING',
        slotStatus: 'PAUSED',
      }),
    ).toMatchObject({
      eligible: false,
      reasonCodes: expect.arrayContaining([
        'SITE_NOT_VERIFIED',
        'SLOT_NOT_ACTIVE',
        'PRICE_CAP_EXCEEDED',
        'BLOCKED_CATEGORY',
        'TARGETING_CATEGORY_MISMATCH',
        'REPUTATION_UNAVAILABLE',
      ]),
    });
  });
});
