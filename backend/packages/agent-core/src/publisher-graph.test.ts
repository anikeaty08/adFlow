import { describe, expect, it } from 'vitest';
import { createPublisherGraph } from './publisher-graph.js';

describe('publisher graph', () => {
  it('rejects offers when advertiser policy fails', async () => {
    const graph = createPublisherGraph({
      checkAdvertiser: async () => false,
      evaluateOffer: async () => ({ decision: 'ACCEPT' }),
    });
    const result = await graph.invoke({ offerId: 'offer_1', advertiserId: 'adv_1' });
    expect(result.decision).toBeNull();
    expect(result.policyAllowed).toBe(false);
  });

  it('evaluates an allowed offer and preserves a counter quote', async () => {
    const graph = createPublisherGraph({
      checkAdvertiser: async () => true,
      evaluateOffer: async () => ({ decision: 'COUNTER', counterRateAtomic: '1200' }),
    });
    const result = await graph.invoke({ offerId: 'offer_1', advertiserId: 'adv_1' });
    expect(result.decision).toBe('COUNTER');
    expect(result.counterRateAtomic).toBe('1200');
  });
});
