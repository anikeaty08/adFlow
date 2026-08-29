import { END, START, StateGraph, StateSchema } from '@langchain/langgraph';
import { z } from 'zod';
import type { PublisherOfferDecision } from './publisher-negotiation.policy.js';

const publisherState = new StateSchema({
  offerId: z.string().min(1),
  advertiserId: z.string().min(1),
  policyAllowed: z.boolean().default(false),
  decision: z.enum(['ACCEPT', 'COUNTER', 'REJECT']).nullable().default(null),
  counterRateAtomic: z.string().nullable().default(null),
});

export type PublisherGraphDependencies = {
  checkAdvertiser(offerId: string, advertiserId: string): Promise<boolean>;
  evaluateOffer(offerId: string): Promise<PublisherOfferDecision>;
};

/** Publisher negotiation workflow. It never signs transactions or moves funds. */
export function createPublisherGraph(dependencies: PublisherGraphDependencies) {
  return new StateGraph(publisherState)
    .addNode('check_advertiser', async (state) => {
      const policyAllowed = await dependencies.checkAdvertiser(state.offerId, state.advertiserId);
      return { policyAllowed };
    })
    .addNode('reject_offer', async () => ({ decision: 'REJECT' as const }))
    .addNode('evaluate_offer', async (state) => {
      if (!state.policyAllowed) return { decision: 'REJECT' as const };
      const result = await dependencies.evaluateOffer(state.offerId);
      return { decision: result.decision, counterRateAtomic: result.counterRateAtomic ?? null };
    })
    .addEdge(START, 'check_advertiser')
    .addConditionalEdges('check_advertiser', (state) =>
      state.policyAllowed ? 'evaluate_offer' : 'reject_offer',
    )
    .addEdge('evaluate_offer', END)
    .addEdge('reject_offer', END)
    .compile();
}
