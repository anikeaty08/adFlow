import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { DomainError } from '@adflow/shared';
import type { ApplicationDependencies } from '../../types.js';
import { requireUser } from '../../shared/auth.js';
import { response } from '../../shared/http.js';
import { AgreementPolicyService } from './policy.service.js';
import { AgreementRepository } from './agreement.repository.js';
import { agreements, campaigns, settlementEpochs } from '@adflow/db';
import { and, eq } from 'drizzle-orm';
import { prepareAgreementCreation } from '@adflow/chain';

export async function registerAgreementRoutes(app: FastifyInstance, dependencies: ApplicationDependencies) {
  const repository = new AgreementRepository(dependencies.db);
  const policy = new AgreementPolicyService();
  async function evaluate(request: Parameters<FastifyInstance['post']>[1] extends never ? never : any) {
    const user = await requireUser(request, dependencies.db);
    const { campaignId, quoteId } = request.params as { campaignId: string; quoteId: string };
    const campaign = await repository.campaign(campaignId, user.id);
    const quote = await repository.quoteForCampaign(quoteId, campaignId);
    if (!campaign || !quote) throw new DomainError('NOT_FOUND', 'Campaign or quote was not found.');
    return {
      campaign,
      quote,
      decision: policy.evaluate({
        campaignStatus: campaign.status,
        campaignBudgetAtomic: campaign.budgetPlannedAtomic,
        maxUnitPriceAtomic: campaign.maxUnitPriceAtomic,
        quoteRateAtomic: quote.rateAtomic,
        quoteAllocationAtomic: quote.maxAllocationAtomic,
        quoteExpiresAt: quote.validUntil,
        campaignEndsAt: campaign.endAt,
      }),
    };
  }
  async function prepare(request: any, campaignId: string, quoteId: string) {
    const evaluated = await evaluate({ ...request, params: { campaignId, quoteId } });
    if (evaluated.decision.decision === 'DENY')
      throw new DomainError('POLICY_DENIED', 'Agreement preparation was denied.', {
        reasonCodes: evaluated.decision.reasonCodes,
      });
    const agreement = await repository.createFromQuote(quoteId, campaignId);
    const onchainCampaignId = evaluated.campaign.onchainCampaignId;
    const settlementAddress = dependencies.config.ADFLOW_SETTLEMENT_ADDRESS;
    if (!onchainCampaignId || !settlementAddress)
      return { agreement, state: 'awaiting_campaign_funding_or_contract_deployment', contractCall: null };
    return {
      agreement,
      state: 'prepared',
      contractCall: prepareAgreementCreation(
        settlementAddress,
        BigInt(onchainCampaignId),
        evaluated.quote.publisherWallet,
        BigInt(evaluated.quote.rateAtomic),
        BigInt(evaluated.quote.unitScale),
        BigInt(evaluated.quote.maxAllocationAtomic),
      ),
    };
  }
  app.post('/api/v1/campaigns/:campaignId/quotes/:quoteId/accept-preview', async (request) =>
    response(request, await evaluate(request)),
  );
  app.post('/api/v1/campaigns/:campaignId/quotes/:quoteId/prepare-agreement', async (request) => {
    const { campaignId, quoteId } = request.params as { campaignId: string; quoteId: string };
    return response(request, await prepare(request, campaignId, quoteId));
  });

  app.post('/api/v1/quotes/:quoteId/accept-preview', async (request) => {
    const user = await requireUser(request, dependencies.db);
    const quoteId = (request.params as { quoteId: string }).quoteId;
    const campaignId = z
      .string()
      .min(1)
      .parse((request.query as { campaignId?: string }).campaignId);
    void user;
    return response(request, await evaluate({ ...request, params: { campaignId, quoteId } }));
  });

  app.post('/api/v1/quotes/:quoteId/prepare-agreement', async (request) => {
    await requireUser(request, dependencies.db);
    const campaignId = z
      .string()
      .min(1)
      .parse((request.query as { campaignId?: string }).campaignId);
    const quoteId = (request.params as { quoteId: string }).quoteId;
    return response(request, await prepare(request, campaignId, quoteId));
  });

  app.get('/api/v1/agreements/:agreementId', async (request) => {
    const user = await requireUser(request, dependencies.db);
    const campaignId = z
      .string()
      .min(1)
      .parse((request.query as { campaignId?: string }).campaignId);
    const agreement = await repository.findOwned(
      (request.params as { agreementId: string }).agreementId,
      campaignId,
      user.id,
    );
    if (!agreement) throw new DomainError('NOT_FOUND', 'Agreement was not found.');
    return response(request, agreement);
  });

  app.get('/api/v1/campaigns/:campaignId/agreements', async (request) => {
    const user = await requireUser(request, dependencies.db);
    const campaignId = (request.params as { campaignId: string }).campaignId;
    if (!(await repository.campaign(campaignId, user.id)))
      throw new DomainError('NOT_FOUND', 'Campaign was not found.');
    return response(request, await repository.listOwned(campaignId, user.id));
  });

  app.get('/api/v1/campaigns/:campaignId/settlements', async (request) => {
    const user = await requireUser(request, dependencies.db);
    const campaignId = (request.params as { campaignId: string }).campaignId;
    const rows = await dependencies.db
      .select({ epoch: settlementEpochs })
      .from(settlementEpochs)
      .innerJoin(agreements, eq(settlementEpochs.agreementId, agreements.id))
      .innerJoin(campaigns, eq(agreements.campaignId, campaigns.id))
      .where(and(eq(agreements.campaignId, campaignId), eq(campaigns.ownerUserId, user.id)));
    return response(
      request,
      rows.map(({ epoch }) => epoch),
    );
  });
}
