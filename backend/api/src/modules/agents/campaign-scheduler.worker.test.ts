import { describe, expect, it } from 'vitest';
import { schedulableCampaignStatuses } from './campaign-scheduler.worker.js';

describe('campaign scheduler policy', () => {
  it('wakes only funded, discovering, and active campaigns', () => {
    expect(schedulableCampaignStatuses).toEqual(['FUNDED', 'DISCOVERING', 'ACTIVE']);
    expect(schedulableCampaignStatuses).not.toContain('DRAFT');
    expect(schedulableCampaignStatuses).not.toContain('PAUSED');
    expect(schedulableCampaignStatuses).not.toContain('CLOSED');
  });
});
