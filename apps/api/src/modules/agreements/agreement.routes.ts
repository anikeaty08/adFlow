import type { FastifyInstance } from 'fastify';
import { DomainError } from '@adflow/shared';
import type { ApplicationDependencies } from '../../types.js';
import { requireUser } from '../../shared/auth.js';
import { response } from '../../shared/http.js';
import { AgreementPolicyService } from './policy.service.js';
import { AgreementRepository } from './agreement.repository.js';

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
  app.post('/api/v1/campaigns/:campaignId/quotes/:quoteId/accept-preview', async (request) =>
    response(request, await evaluate(request)),
  );
  app.post('/api/v1/campaigns/:campaignId/quotes/:quoteId/prepare-agreement', async (request) => {
    const evaluated = await evaluate(request);
    if (evaluated.decision.decision === 'DENY')
      throw new DomainError('POLICY_DENIED', 'Agreement preparation was denied.', {
        reasonCodes: evaluated.decision.reasonCodes,
      });
    const agreement = await repository.createFromQuote(
      (request.params as { quoteId: string }).quoteId,
      (request.params as { campaignId: string }).campaignId,
    );
    return response(request, {
      agreement,
      contractCall: {
        address: process.env.CAMPAIGN_VAULT_ADDRESS ?? null,
        functionName: 'acceptAgreement',
        args: [agreement?.id],
      },
    });
  });
}
