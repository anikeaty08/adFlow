import { and, eq } from 'drizzle-orm';
import { campaigns, quotes, type Database } from '@adflow/db';
import {
  createDurableCampaignGraph,
  type CampaignProposal,
  type MonitorResult,
  type PolicyDecision,
} from '@adflow/agent-core';
import { id } from '@adflow/shared';
import { AgreementPolicyService } from '../agreements/policy.service.js';
import { OutboxRepository } from '../outbox/outbox.repository.js';
import { AgentRunRepository } from './agent-run.repository.js';
import type { CampaignModelGateway } from './openai-model.gateway.js';
import type { AgentMemoryGateway } from './mem0.memory.gateway.js';

type CampaignRecord = typeof campaigns.$inferSelect;
type QuoteRecord = typeof quotes.$inferSelect;

/**
 * Coordinates a bounded graph run. It reads canonical Postgres state at each run and only emits
 * action-ready events. A browser wallet or restricted settlement worker owns later execution.
 */
export class CampaignAgentService {
  private readonly policy = new AgreementPolicyService();
  private readonly runRepository: AgentRunRepository;
  private readonly outbox: OutboxRepository;

  constructor(
    private readonly db: Database,
    private readonly model: CampaignModelGateway,
    private readonly memory: AgentMemoryGateway = { search: async () => [], add: async () => undefined },
  ) {
    this.runRepository = new AgentRunRepository(db);
    this.outbox = new OutboxRepository(db);
  }

  async run(campaignId: string, trigger: string, idempotencyKey: string) {
    const begun = await this.runRepository.begin({ campaignId, trigger, idempotencyKey });
    if (!begun.created) return begun.run;

    let campaign: CampaignRecord | undefined;
    let campaignQuotes: QuoteRecord[] = [];
    let selectedQuote: QuoteRecord | undefined;
    let memories: Awaited<ReturnType<AgentMemoryGateway['search']>> = [];
    const graph = createDurableCampaignGraph({
      loadCampaign: async (id) => {
        campaign = await this.loadCampaign(id);
      },
      observeMarket: async () => {
        memories = await this.memory.search(campaign?.objectiveText ?? 'campaign publisher preferences', {
          campaignId,
        });
      },
      discoverPublishers: async () => [...new Set(campaignQuotes.map((quote) => quote.publisherAgentId))],
      rankPublishers: async (_id, publisherIds) => publisherIds,
      requestQuotes: async () => {
        campaignQuotes = await this.loadOpenQuotes(campaignId);
        return campaignQuotes.map((quote) => quote.id);
      },
      evaluateQuotes: async (_id, quoteIds) => {
        if (!campaign) return null;
        const proposal = await this.model.propose({
          campaignId,
          objective: campaign.objectiveText,
          candidateIds: quoteIds,
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
      monitor: async (): Promise<MonitorResult> => 'NO_DATA',
      optimize: async () => ({ kind: 'NO_ACTION' }),
      proposeSettlement: async () => {
        await this.outbox.enqueue('settlement.proposal.requested', 'campaign', campaignId, { campaignId });
      },
    });

    try {
      const state = await graph.invoke({ campaignId, agentRunId: begun.run.id });
      await this.memory.add(`Campaign run ${begun.run.id} completed with status ${state.status}.`, {
        campaignId,
      });
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
    return campaign;
  }

  private loadOpenQuotes(campaignId: string) {
    return this.db
      .select()
      .from(quotes)
      .where(and(eq(quotes.campaignId, campaignId), eq(quotes.status, 'OPEN')));
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

  private databaseStatus(status: string): 'WAITING_FOR_APPROVAL' | 'COMPLETED' | 'BLOCKED' {
    if (status === 'WAITING_FOR_APPROVAL') return status;
    if (status === 'BLOCKED') return status;
    return 'COMPLETED';
  }
}
