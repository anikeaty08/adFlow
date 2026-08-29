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

  it('runs typed execution only after policy approval, then completes a no-data cycle', async () => {
    const executeApprovedAction = vi.fn(async () => 'act_1');
    const graph = createDurableCampaignGraph(
      dependencies({ executeApprovedAction, monitor: async () => 'NO_DATA' }),
    );

    const result = await graph.invoke({ campaignId: 'cmp_1', agentRunId: 'run_1' });

    expect(executeApprovedAction).toHaveBeenCalledOnce();
    expect(result.status).toBe('COMPLETED');
  });

  it('waits for signed publisher quotes instead of attempting settlement', async () => {
    const graph = createDurableCampaignGraph(
      dependencies({ requestQuotes: async () => [], monitor: async () => 'NO_DATA' }),
    );

    const result = await graph.invoke({ campaignId: 'cmp_1', agentRunId: 'run_1' });

    expect(result.status).toBe('WAITING_FOR_QUOTES');
  });

  it('stops before discovery when monitored delivery needs approval to pause', async () => {
    const discoverPublishers = vi.fn(async () => ['publisher_1']);
    const executeApprovedAction = vi.fn(async () => 'act_1');
    const graph = createDurableCampaignGraph(
      dependencies({
        discoverPublishers,
        executeApprovedAction,
        monitor: async () => 'FRAUD',
        optimize: async () => ({ kind: 'PAUSE_ALLOCATION' }),
        evaluatePolicy: async () => 'REQUIRES_APPROVAL',
      }),
    );

    const result = await graph.invoke({ campaignId: 'cmp_1', agentRunId: 'run_1' });

    expect(result.status).toBe('WAITING_FOR_APPROVAL');
    expect(discoverPublishers).not.toHaveBeenCalled();
    expect(executeApprovedAction).not.toHaveBeenCalled();
  });
});
