import { describe, expect, it, vi } from 'vitest';
import { createCampaignAgentGraph } from './index.js';

describe('Campaign Agent graph', () => {
  it('never executes a model proposal that policy denies', async () => {
    const execute = vi.fn();
    const graph = createCampaignAgentGraph({
      observe: async () => ({ candidates: ['qte_1'] }),
      propose: async () => ({ kind: 'PREPARE_AGREEMENT', candidateId: 'qte_1' }),
      evaluatePolicy: async () => 'DENY',
      execute,
      verify: async () => true,
    });

    const result = await graph.invoke({ campaignId: 'cmp_1' });

    expect(result.policyDecision).toBe('DENY');
    expect(execute).not.toHaveBeenCalled();
  });

  it('verifies an allowed deterministic execution before completing', async () => {
    const execute = vi.fn(async () => 'act_1');
    const verify = vi.fn(async () => true);
    const graph = createCampaignAgentGraph({
      observe: async () => ({ candidates: ['qte_1'] }),
      propose: async () => ({ kind: 'REQUEST_QUOTES', candidateId: 'qte_1' }),
      evaluatePolicy: async () => 'ALLOW',
      execute,
      verify,
    });

    const result = await graph.invoke({ campaignId: 'cmp_1' });

    expect(result.status).toBe('COMPLETED');
    expect(execute).toHaveBeenCalledOnce();
    expect(verify).toHaveBeenCalledWith('act_1');
  });
});
