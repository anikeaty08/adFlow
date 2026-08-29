import { and, eq } from 'drizzle-orm';
import {
  adSlots,
  agents,
  campaignPolicies,
  campaigns,
  publisherSites,
  quotes,
  type Database,
} from '@adflow/db';
import {
  createDurableCampaignGraph,
  type CampaignProposal,
  type MonitorResult,
  type PolicyDecision,
} from '@adflow/agent-core';
import { id } from '@adflow/shared';
import { AgreementPolicyService } from '../agreements/policy.service.js';
import { OutboxRepository } from '../outbox/outbox.repository.js';
import { QuoteRequestRepository } from '../quotes/quote-request.repository.js';
import { AgentRunRepository } from './agent-run.repository.js';
import type { CampaignModelGateway } from './openai-model.gateway.js';
import type { AgentMemoryGateway } from './mem0.memory.gateway.js';
import { evaluatePublisherEligibility } from '../operations/publisher-eligibility.js';
import { CampaignPerformanceService } from './campaign-performance.service.js';

type CampaignRecord = typeof campaigns.$inferSelect & {
  policy: typeof campaignPolicies.$inferSelect;
};
type QuoteRecord = typeof quotes.$inferSelect;
type EligibleInventory = {
  publisherAgentId: string;
  slotId: string;
  score: number;
};

/**
 * Coordinates a bounded graph run. It reads canonical Postgres state at each run and only emits
 * action-ready events. A browser wallet or restricted settlement worker owns later execution.
 */
export class CampaignAgentService {
  private readonly policy = new AgreementPolicyService();
  private readonly runRepository: AgentRunRepository;
  private readonly outbox: OutboxRepository;
  private readonly quoteRequests: QuoteRequestRepository;
  private readonly performance: CampaignPerformanceService;

  constructor(
    private readonly db: Database,
    private readonly model: CampaignModelGateway,
    private readonly memory: AgentMemoryGateway = { search: async () => [], add: async () => undefined },
  ) {
    this.runRepository = new AgentRunRepository(db);
    this.outbox = new OutboxRepository(db);
    this.quoteRequests = new QuoteRequestRepository(db);
    this.performance = new CampaignPerformanceService(db);
  }

  async run(campaignId: string, trigger: string, idempotencyKey: string) {
    const begun = await this.runRepository.begin({ campaignId, trigger, idempotencyKey });
    if (!begun.created) return begun.run;

    let campaign: CampaignRecord | undefined;
    let campaignQuotes: QuoteRecord[] = [];
    let eligibleInventory: EligibleInventory[] = [];
    let selectedQuote: QuoteRecord | undefined;
    let memories: Awaited<ReturnType<AgentMemoryGateway['search']>> = [];
    const graph = createDurableCampaignGraph({
      loadCampaign: async (id) => {
        campaign = await this.loadCampaign(id);
      },
      observeMarket: async () => {
        const query = campaign?.objectiveText ?? 'campaign publisher preferences';
        const [advertiserMemories, campaignMemories] = await Promise.all([
          this.memory.search(query, { userId: campaign?.ownerUserId }),
          this.memory.search(query, { campaignId }),
        ]);
        // Mem0 may return the same item through multiple scopes. Keep the most relevant occurrence
        // while retaining the database and Celo contracts as the only financial source of truth.
        memories = [...advertiserMemories, ...campaignMemories].filter(
          (memory, index, all) => all.findIndex((candidate) => candidate.memory === memory.memory) === index,
        );
      },
      discoverPublishers: async () => {
        eligibleInventory = await this.loadEligibleInventory(campaign!);
        return [...new Set(eligibleInventory.map((candidate) => candidate.publisherAgentId))];
      },
      rankPublishers: async (_id, publisherIds) =>
        publisherIds.sort(
          (left, right) =>
            Math.max(
              ...eligibleInventory
                .filter((candidate) => candidate.publisherAgentId === right)
                .map((candidate) => candidate.score),
            ) -
            Math.max(
              ...eligibleInventory
                .filter((candidate) => candidate.publisherAgentId === left)
                .map((candidate) => candidate.score),
            ),
        ),
      requestQuotes: async (_id, publisherIds) => {
        campaignQuotes = await this.loadEligibleOpenQuotes(campaign!);
        const existingInventoryKeys = new Set(
          campaignQuotes.map((quote) => `${quote.publisherAgentId}:${quote.slotId}`),
        );
        for (const candidate of eligibleInventory) {
          if (!publisherIds.includes(candidate.publisherAgentId)) continue;
          if (existingInventoryKeys.has(`${candidate.publisherAgentId}:${candidate.slotId}`)) continue;
          const request = await this.quoteRequests.createIfMissing({
            campaignId,
            publisherAgentId: candidate.publisherAgentId,
            slotId: candidate.slotId,
          });
          if (!request) continue;
          await this.outbox.enqueue('quote.requested', 'campaign', campaignId, {
            quoteRequestId: request.id,
            campaignId,
            publisherAgentId: candidate.publisherAgentId,
            slotId: candidate.slotId,
          });
        }
        return campaignQuotes
          .filter((quote) => publisherIds.includes(quote.publisherAgentId))
          .map((quote) => quote.id);
      },
      evaluateQuotes: async (_id, quoteIds) => {
        if (!campaign) return null;
        const proposal = await this.model.propose({
          campaignId,
          objective: campaign.objectiveText,
          candidateIds: quoteIds,
          candidates: campaignQuotes
            .filter((quote) => quoteIds.includes(quote.id))
            .map((quote) => ({
              id: quote.id,
              publisherAgentId: quote.publisherAgentId,
              rateAtomic: quote.rateAtomic,
              maxAllocationAtomic: quote.maxAllocationAtomic,
              validUntil: quote.validUntil.toISOString(),
            })),
          memories: memories.map((item) => item.memory),
        });
        selectedQuote = proposal.candidateId
          ? campaignQuotes.find((quote) => quote.id === proposal.candidateId)
          : undefined;
        return proposal;
      },
      evaluatePolicy: async (_id, proposal) => this.evaluatePolicy(campaign, selectedQuote, proposal),
      executeApprovedAction: async (_id, proposal) =>
        this.emitActionReady(begun.run.id, campaignId, proposal),
      monitor: async (): Promise<MonitorResult> => this.performance.monitor(campaignId),
      optimize: async () => ({ kind: 'NO_ACTION' }),
    });

    try {
      const state = await graph.invoke({ campaignId, agentRunId: begun.run.id });
      await this.runRepository.updateState(
        begun.run.id,
        this.databaseStatus(state.status),
        state as Record<string, unknown>,
      );
      return begun.run;
    } catch (error) {
      await this.runRepository.fail(begun.run.id, error instanceof Error ? error.name : 'UNKNOWN');
      throw error;
    }
  }

  private async loadCampaign(campaignId: string) {
    const [campaign] = await this.db.select().from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
    if (!campaign) throw new Error(`Campaign ${campaignId} was not found`);
    const [policy] = await this.db
      .select()
      .from(campaignPolicies)
      .where(eq(campaignPolicies.campaignId, campaignId))
      .limit(1);
    if (!policy) throw new Error(`Campaign ${campaignId} has no policy`);
    return { ...campaign, policy };
  }

  private async loadEligibleOpenQuotes(campaign: CampaignRecord) {
    const candidates = await this.db
      .select({ quote: quotes, slot: adSlots, site: publisherSites })
      .from(quotes)
      .innerJoin(agents, eq(agents.id, quotes.publisherAgentId))
      .innerJoin(publisherSites, eq(publisherSites.publisherId, agents.publisherId))
      .innerJoin(adSlots, and(eq(adSlots.id, quotes.slotId), eq(adSlots.siteId, publisherSites.id)))
      .where(and(eq(quotes.campaignId, campaign.id), eq(quotes.status, 'OPEN')));

    return candidates
      .filter(
        ({ quote, slot, site }) =>
          evaluatePublisherEligibility(
            {
              allowedCategories: campaign.policy.allowedCategories,
              blockedCategories: campaign.policy.blockedCategories,
              maxUnitPriceAtomic: campaign.maxUnitPriceAtomic,
              minReputationScore: campaign.policy.minReputationScore,
            },
            {
              categories: slot.categories,
              floorRateAtomic: quote.rateAtomic,
              siteStatus: site.status,
              slotStatus: slot.status,
            },
          ).eligible,
      )
      .map(({ quote }) => quote);
  }

  private async loadEligibleInventory(campaign: CampaignRecord): Promise<EligibleInventory[]> {
    const inventory = await this.db
      .select({ agent: agents, slot: adSlots, site: publisherSites })
      .from(agents)
      .innerJoin(publisherSites, eq(publisherSites.publisherId, agents.publisherId))
      .innerJoin(adSlots, eq(adSlots.siteId, publisherSites.id))
      .where(eq(agents.role, 'PUBLISHER'));

    return inventory.flatMap(({ agent, slot, site }) => {
      const eligibility = evaluatePublisherEligibility(
        {
          allowedCategories: campaign.policy.allowedCategories,
          blockedCategories: campaign.policy.blockedCategories,
          maxUnitPriceAtomic: campaign.maxUnitPriceAtomic,
          minReputationScore: campaign.policy.minReputationScore,
        },
        {
          categories: slot.categories,
          floorRateAtomic: campaign.pricingModel === 'CPC' ? slot.floorCpcAtomic : slot.floorCpmAtomic,
          siteStatus: site.status,
          slotStatus: slot.status,
        },
      );
      return eligibility.eligible
        ? [{ publisherAgentId: agent.id, slotId: slot.id, score: eligibility.score.total }]
        : [];
    });
  }

  private evaluatePolicy(
    campaign: CampaignRecord | undefined,
    quote: QuoteRecord | undefined,
    proposal: CampaignProposal,
  ): PolicyDecision {
    if (proposal.kind === 'NO_ACTION') return 'DENY';
    if (!campaign || !quote) return 'DENY';
    const result = this.policy.evaluate({
      campaignStatus: campaign.status,
      campaignBudgetAtomic: campaign.budgetPlannedAtomic,
      maxUnitPriceAtomic: campaign.maxUnitPriceAtomic,
      quoteRateAtomic: quote.rateAtomic,
      quoteAllocationAtomic: quote.maxAllocationAtomic,
      quoteExpiresAt: quote.validUntil,
      campaignEndsAt: campaign.endAt,
    });
    return result.decision;
  }

  private async emitActionReady(agentRunId: string, campaignId: string, proposal: CampaignProposal) {
    const actionId = id('act');
    await this.outbox.enqueue('agent.action.ready', 'campaign', campaignId, {
      actionId,
      agentRunId,
      campaignId,
      proposal,
    });
    await this.runRepository.recordDecision({
      agentRunId,
      campaignId,
      decisionType: proposal.kind,
      proposal,
      policyDecision: 'ALLOW',
      reasonCodes: ['POLICY_ALLOW'],
      resultStatus: 'ACTION_READY',
      executedActionId: actionId,
    });
    return actionId;
  }

  private databaseStatus(
    status: string,
  ): 'WAITING_FOR_QUOTES' | 'WAITING_FOR_APPROVAL' | 'COMPLETED' | 'BLOCKED' {
    if (status === 'WAITING_FOR_QUOTES') return status;
    if (status === 'WAITING_FOR_APPROVAL') return status;
    if (status === 'BLOCKED') return status;
    return 'COMPLETED';
  }
}
