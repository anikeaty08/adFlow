import { END, START, StateGraph, StateSchema } from '@langchain/langgraph';
import { z } from 'zod';
import { proposalSchema, type CampaignProposal } from './proposal.js';

export * from './campaign-graph.js';
export * from './proposal.js';

const AgentState = new StateSchema({
  campaignId: z.string(),
  candidates: z.array(z.string()).default([]),
  proposal: proposalSchema.nullable().default(null),
  policyDecision: z.enum(['ALLOW', 'DENY']).nullable().default(null),
  executionId: z.string().nullable().default(null),
  status: z.enum(['RUNNING', 'COMPLETED', 'BLOCKED']).default('RUNNING'),
});

export type CampaignAgentDependencies = {
  observe(campaignId: string): Promise<{ candidates: string[] }>;
  propose(campaignId: string, candidates: string[]): Promise<CampaignProposal | null>;
  evaluatePolicy(campaignId: string, proposal: CampaignProposal): Promise<'ALLOW' | 'DENY'>;
  execute(campaignId: string, proposal: CampaignProposal): Promise<string>;
  verify(executionId: string): Promise<boolean>;
};

/** LangGraph decides workflow order; policy and executors remain deterministic services. */
export function createCampaignAgentGraph(dependencies: CampaignAgentDependencies) {
  return new StateGraph(AgentState)
    .addNode('observe', async (state) => dependencies.observe(state.campaignId))
    .addNode('propose', async (state) => {
      const proposal = await dependencies.propose(state.campaignId, state.candidates);
      return { proposal: proposal ? proposalSchema.parse(proposal) : null };
    })
    .addNode('policy', async (state) => {
      if (!state.proposal) return { policyDecision: 'DENY' as const, status: 'COMPLETED' as const };
      return { policyDecision: await dependencies.evaluatePolicy(state.campaignId, state.proposal) };
    })
    .addNode('execute', async (state) => ({
      executionId: await dependencies.execute(state.campaignId, state.proposal!),
    }))
    .addNode('verify', async (state) => ({
      status: (await dependencies.verify(state.executionId!)) ? ('COMPLETED' as const) : ('BLOCKED' as const),
    }))
    .addEdge(START, 'observe')
    .addEdge('observe', 'propose')
    .addEdge('propose', 'policy')
    .addConditionalEdges('policy', (state) => (state.policyDecision === 'ALLOW' ? 'execute' : END))
    .addEdge('execute', 'verify')
    .addEdge('verify', END)
    .compile();
}
