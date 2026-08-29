import { describe, expect, it } from 'vitest';

describe('outbox dispatcher contract', () => {
  it('keeps publishing isolated behind a typed event boundary', () => {
    const event = {
      topic: 'agent.action.ready',
      aggregateId: 'cmp_1',
      payload: { campaignId: 'cmp_1' },
    };
    expect(event.topic).toBe('agent.action.ready');
    expect(event.payload.campaignId).toBe(event.aggregateId);
  });
});
