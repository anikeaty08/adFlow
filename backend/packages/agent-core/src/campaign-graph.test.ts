import { describe, expect, it, vi } from 'vitest';
import { createDurableCampaignGraph, type CampaignGraphDependencies } from './campaign-graph.js';

function dependencies(overrides: Partial<CampaignGraphDependencies> = {}): CampaignGraphDependencies {
  return {
    loadCampaign: async () => undefined,
    observeMarket: async () => undefined,
    discoverPublishers: async () => ['pub_1'],
    rankPublishers: async () => ['pub_1'],
    requestQuotes: async () => ['qte_1'],
    evaluateQuotes: async () => ({ kind: 'PREPARE_AGREEMENT', candidateId: 'qte_1' }),
    evaluatePolicy: async () => 'ALLOW',
    executeApprovedAction: async () => 'act_1',
    monitor: async () => 'BAD',
    optimize: async () => ({ kind: 'NO_ACTION' }),
    proposeSettlement: async () => undefined,
    ...overrides,
  };
}

describe('Durable Campaign Agent graph', () => {
  it('keeps an approval-required action out of execution', async () => {
    const executeApprovedAction = vi.fn(async () => 'act_1');
    const graph = createDurableCampaignGraph(
      dependencies({ evaluatePolicy: async () => 'REQUIRES_APPROVAL', executeApprovedAction }),
    );

    const result = await graph.invoke({ campaignId: 'cmp_1', agentRunId: 'run_1' });

    expect(result.status).toBe('WAITING_FOR_APPROVAL');
    expect(executeApprovedAction).not.toHaveBeenCalled();
  });

  it('runs typed execution only after policy approval, then proposes settlement', async () => {
    const executeApprovedAction = vi.fn(async () => 'act_1');
    const proposeSettlement = vi.fn(async () => undefined);
    const graph = createDurableCampaignGraph(
      dependencies({ executeApprovedAction, proposeSettlement, monitor: async () => 'FRAUD' }),
    );

    const result = await graph.invoke({ campaignId: 'cmp_1', agentRunId: 'run_1' });

    expect(executeApprovedAction).toHaveBeenCalledOnce();
    expect(proposeSettlement).toHaveBeenCalledOnce();
    expect(result.status).toBe('COMPLETED');
  });

  it('waits for signed publisher quotes instead of attempting settlement', async () => {
    const proposeSettlement = vi.fn(async () => undefined);
    const graph = createDurableCampaignGraph(
      dependencies({ requestQuotes: async () => [], proposeSettlement }),
    );

    const result = await graph.invoke({ campaignId: 'cmp_1', agentRunId: 'run_1' });

    expect(result.status).toBe('WAITING_FOR_QUOTES');
    expect(proposeSettlement).not.toHaveBeenCalled();
  });
});
