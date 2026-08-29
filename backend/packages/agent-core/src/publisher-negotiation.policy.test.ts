import { describe, expect, it } from 'vitest';
import { evaluatePublisherOffer } from './publisher-negotiation.policy.js';

const policy = {
  minimumRateAtomic: '20000',
  blockedCategories: ['gambling', 'adult', 'political'],
  acceptedCategories: ['ai', 'developer tools', 'crypto infrastructure'],
  minimumAdvertiserReputationScore: 80,
};

describe('evaluatePublisherOffer', () => {
  it('accepts a priced, allowed offer from a reputable advertiser with inventory', () => {
    expect(
      evaluatePublisherOffer(policy, {
        proposedRateAtomic: '32000',
        categories: ['AI', 'Developer Tools'],
        advertiserReputationScore: 91,
        inventoryAvailable: true,
      }),
    ).toEqual({ decision: 'ACCEPT', reasonCodes: [] });
  });

  it('counters an otherwise acceptable offer below the publisher floor', () => {
    expect(
      evaluatePublisherOffer(policy, {
        proposedRateAtomic: '16000',
        categories: ['AI'],
        advertiserReputationScore: 91,
        inventoryAvailable: true,
      }),
    ).toEqual({
      decision: 'COUNTER',
      counterRateAtomic: '20000',
      reasonCodes: ['RATE_BELOW_PUBLISHER_FLOOR'],
    });
  });

  it('rejects blocked categories, unavailable inventory, and unavailable reputation without countering', () => {
    expect(
      evaluatePublisherOffer(policy, {
        proposedRateAtomic: '50000',
        categories: ['Gambling'],
        inventoryAvailable: false,
      }),
    ).toEqual({
      decision: 'REJECT',
      reasonCodes: [
        'INVENTORY_UNAVAILABLE',
        'PUBLISHER_CATEGORY_BLOCKED',
        'PUBLISHER_CATEGORY_NOT_ACCEPTED',
        'ADVERTISER_REPUTATION_UNAVAILABLE',
      ],
    });
  });
});
