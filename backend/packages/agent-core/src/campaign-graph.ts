import { END, START, StateGraph, StateSchema } from '@langchain/langgraph';
import { z } from 'zod';
import { proposalSchema, type CampaignProposal } from './proposal.js';

export const campaignRuntimeState = new StateSchema({
  campaignId: z.string().min(1),
  agentRunId: z.string().min(1),
  candidatePublisherIds: z.array(z.string()).default([]),
  rankedPublisherIds: z.array(z.string()).default([]),
  quoteIds: z.array(z.string()).default([]),
  proposal: proposalSchema.nullable().default(null),
  policyDecision: z
    .enum(['ALLOW', 'DENY', 'REQUIRES_APPROVAL', 'WAITING_FOR_QUOTES'])
    .nullable()
    .default(null),
  executionId: z.string().nullable().default(null),
  monitorResult: z.enum(['GOOD', 'BAD', 'FRAUD', 'NO_DATA']).nullable().default(null),
  status: z
    .enum(['RUNNING', 'WAITING_FOR_QUOTES', 'WAITING_FOR_APPROVAL', 'COMPLETED', 'BLOCKED'])
    .default('RUNNING'),
});

export type PolicyDecision = 'ALLOW' | 'DENY' | 'REQUIRES_APPROVAL' | 'WAITING_FOR_QUOTES';
export type MonitorResult = 'GOOD' | 'BAD' | 'FRAUD' | 'NO_DATA';

export type CampaignGraphDependencies = {
  loadCampaign(campaignId: string): Promise<void>;
  observeMarket(campaignId: string): Promise<void>;
  discoverPublishers(campaignId: string): Promise<string[]>;
  rankPublishers(campaignId: string, publisherIds: string[]): Promise<string[]>;
  requestQuotes(campaignId: string, publisherIds: string[]): Promise<string[]>;
  evaluateQuotes(campaignId: string, quoteIds: string[]): Promise<CampaignProposal | null>;
  evaluatePolicy(campaignId: string, proposal: CampaignProposal): Promise<PolicyDecision>;
  executeApprovedAction(campaignId: string, proposal: CampaignProposal): Promise<string>;
  monitor(campaignId: string): Promise<MonitorResult>;
  optimize(campaignId: string, monitorResult: MonitorResult): Promise<CampaignProposal | null>;
  proposeSettlement(campaignId: string): Promise<void>;
};

/**
 * Workflow only: it coordinates typed tools and records state transitions. It has no raw
 * signing, transfer, or arbitrary-contract-call tool. A denied or approval-required proposal
 * never reaches the executor.
 */
export function createDurableCampaignGraph(dependencies: CampaignGraphDependencies) {
  return new StateGraph(campaignRuntimeState)
    .addNode('load_campaign', async (state) => {
      await dependencies.loadCampaign(state.campaignId);
      return {};
    })
    .addNode('observe_market', async (state) => {
      await dependencies.observeMarket(state.campaignId);
      return {};
    })
    .addNode('discover_publishers', async (state) => ({
      candidatePublisherIds: await dependencies.discoverPublishers(state.campaignId),
    }))
    .addNode('rank_publishers', async (state) => ({
      rankedPublisherIds: await dependencies.rankPublishers(state.campaignId, state.candidatePublisherIds),
    }))
    .addNode('request_quotes', async (state) => ({
      quoteIds: await dependencies.requestQuotes(state.campaignId, state.rankedPublisherIds),
    }))
    .addNode('evaluate_quotes', async (state) => {
      if (state.quoteIds.length === 0) return { proposal: proposalSchema.parse({ kind: 'WAIT_FOR_QUOTES' }) };
      const proposal = await dependencies.evaluateQuotes(state.campaignId, state.quoteIds);
      return { proposal: proposal ? proposalSchema.parse(proposal) : null };
    })
    .addNode('policy_gate', async (state) => {
      if (!state.proposal || state.proposal.kind === 'WAIT_FOR_QUOTES')
        return { policyDecision: 'WAITING_FOR_QUOTES' as const };
      return { policyDecision: await dependencies.evaluatePolicy(state.campaignId, state.proposal) };
    })
    .addNode('await_quotes', async () => ({ status: 'WAITING_FOR_QUOTES' as const }))
    .addNode('await_approval', async () => ({ status: 'WAITING_FOR_APPROVAL' as const }))
    .addNode('execute', async (state) => ({
      executionId: await dependencies.executeApprovedAction(state.campaignId, state.proposal!),
    }))
    .addNode('monitor', async (state) => ({ monitorResult: await dependencies.monitor(state.campaignId) }))
    .addNode('optimize', async (state) => {
      const proposal = await dependencies.optimize(state.campaignId, state.monitorResult!);
      return { proposal: proposal ? proposalSchema.parse(proposal) : null };
    })
    .addNode('propose_settlement', async (state) => {
      await dependencies.proposeSettlement(state.campaignId);
      return { status: 'COMPLETED' as const };
    })
    .addEdge(START, 'load_campaign')
    .addEdge('load_campaign', 'observe_market')
    .addEdge('observe_market', 'discover_publishers')
    .addEdge('discover_publishers', 'rank_publishers')
    .addEdge('rank_publishers', 'request_quotes')
    .addEdge('request_quotes', 'evaluate_quotes')
    .addEdge('evaluate_quotes', 'policy_gate')
    .addConditionalEdges('policy_gate', (state) => {
      if (state.policyDecision === 'WAITING_FOR_QUOTES') return 'await_quotes';
      if (state.policyDecision === 'ALLOW') return 'execute';
      if (state.policyDecision === 'REQUIRES_APPROVAL') return 'await_approval';
      return 'propose_settlement';
    })
    .addEdge('await_quotes', END)
    .addEdge('await_approval', END)
    .addEdge('execute', 'monitor')
    .addConditionalEdges('monitor', (state) =>
      state.monitorResult === 'GOOD' ? 'optimize' : 'propose_settlement',
    )
    .addEdge('optimize', 'policy_gate')
    .addEdge('propose_settlement', END)
    .compile();
}
