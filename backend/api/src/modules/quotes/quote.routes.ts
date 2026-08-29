import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { verifyMessage } from 'viem';
import { address, atomic, canonicalJson, DomainError, pricingModel } from '@adflow/shared';
import type { ApplicationDependencies } from '../../types.js';
import { requireUser } from '../../shared/auth.js';
import { response } from '../../shared/http.js';
import { QuoteRepository } from './quote.repository.js';
import { QuoteRequestRepository } from './quote-request.repository.js';
import { CampaignRepository } from '../campaigns/campaign.repository.js';
import { evaluatePublisherOffer } from '@adflow/agent-core';

const quoteSchema = z.object({
  publisherAgentId: z.string().min(1),
  slotId: z.string().min(1),
  pricingModel,
  rateAtomic: atomic,
  unitScale: z.number().int().positive(),
  maxAllocationAtomic: atomic,
  publisherWallet: address,
  quoteNonce: z.string().min(8).max(200),
  validUntil: z.coerce.date(),
  signature: z.string().regex(/^0x[0-9a-fA-F]+$/),
});

export async function registerQuoteRoutes(app: FastifyInstance, dependencies: ApplicationDependencies) {
  const repository = new QuoteRepository(dependencies.db);
  const quoteRequests = new QuoteRequestRepository(dependencies.db);
  const campaigns = new CampaignRepository(dependencies.db);
  app.get('/api/v1/campaigns/:campaignId/quotes', async (request) => {
    const user = await requireUser(request, dependencies.db);
    const campaignId = (request.params as { campaignId: string }).campaignId;
    if (!(await campaigns.findById(campaignId, user.id)))
      throw new DomainError('NOT_FOUND', 'Campaign was not found.');
    return response(request, await repository.listForCampaign(campaignId));
  });
  app.get('/api/v1/quotes/:quoteId', async (request) => {
    const user = await requireUser(request, dependencies.db);
    const campaignId = z
      .string()
      .parse(request.query && (request.query as { campaignId?: string }).campaignId);
    if (!(await campaigns.findById(campaignId, user.id)))
      throw new DomainError('NOT_FOUND', 'Campaign was not found.');
    const quote = await repository.find((request.params as { quoteId: string }).quoteId, campaignId);
    if (!quote) throw new DomainError('NOT_FOUND', 'Quote was not found.');
    return response(request, quote);
  });
  app.get('/api/v1/publishers/me/quote-requests', async (request) => {
    const user = await requireUser(request, dependencies.db);
    const requests = await quoteRequests.listPendingForPublisherOwner(user.id);
    return response(
      request,
      requests.map(({ request: quoteRequest }) => quoteRequest),
    );
  });
  app.post('/api/v1/publishers/me/quote-requests/:requestId/evaluate', async (request) => {
    const user = await requireUser(request, dependencies.db);
    const quoteRequest = await quoteRequests.findPendingForPublisherOwner(
      (request.params as { requestId: string }).requestId,
      user.id,
    );
    if (!quoteRequest) throw new DomainError('NOT_FOUND', 'Pending quote request was not found.');
    const input = z.object({ proposedRateAtomic: atomic }).parse(request.body);
    const minimumRateAtomic =
      quoteRequest.campaign.pricingModel === 'CPC'
        ? quoteRequest.slot.floorCpcAtomic
        : quoteRequest.slot.floorCpmAtomic;
    const decision = evaluatePublisherOffer(
      {
        minimumRateAtomic,
        blockedCategories: quoteRequest.publisher.blockedCategories,
        acceptedCategories: quoteRequest.publisher.acceptedCategories,
        minimumAdvertiserReputationScore: Number(quoteRequest.publisher.minimumAdvertiserReputationScore),
      },
      {
        proposedRateAtomic: input.proposedRateAtomic,
        categories: quoteRequest.policy.allowedCategories,
        // Advertiser reputation is deliberately unavailable until a trusted canonical source is configured.
        advertiserReputationScore: undefined,
        inventoryAvailable: quoteRequest.slot.status === 'ACTIVE',
      },
    );
    return response(request, {
      quoteRequestId: quoteRequest.request.id,
      campaignId: quoteRequest.campaign.id,
      decision,
      quoteContext: {
        publisherAgentId: quoteRequest.request.publisherAgentId,
        slotId: quoteRequest.request.slotId,
        pricingModel: quoteRequest.campaign.pricingModel,
        maxAllocationAtomic: quoteRequest.campaign.budgetPlannedAtomic,
        publisherWallet: quoteRequest.agent.walletAddress,
        validUntil: quoteRequest.campaign.endAt.toISOString(),
      },
    });
  });
  app.post('/agent/v1/quotes', async (request) => {
    const body = z.object({ campaignRef: z.string().min(1), ...quoteSchema.shape }).parse(request.body);
    if (body.validUntil <= new Date())
      throw new DomainError('INVALID_QUOTE', 'Quote expiry must be in the future.');
    const signedPayload = canonicalJson({
      campaignRef: body.campaignRef,
      publisherAgentId: body.publisherAgentId,
      slotId: body.slotId,
      pricingModel: body.pricingModel,
      rateAtomic: body.rateAtomic,
      unitScale: body.unitScale,
      maxAllocationAtomic: body.maxAllocationAtomic,
      publisherWallet: body.publisherWallet,
      quoteNonce: body.quoteNonce,
      validUntil: body.validUntil.toISOString(),
    });
    const signatureValid = await verifyMessage({
      address: body.publisherWallet as `0x${string}`,
      message: signedPayload,
      signature: body.signature as `0x${string}`,
    });
    if (!signatureValid)
      throw new DomainError('INVALID_QUOTE_SIGNATURE', 'Publisher quote signature is invalid.');
    const quote = await repository.create({
      campaignId: body.campaignRef,
      publisherAgentId: body.publisherAgentId,
      slotId: body.slotId,
      pricingModel: body.pricingModel,
      rateAtomic: body.rateAtomic,
      unitScale: body.unitScale,
      maxAllocationAtomic: body.maxAllocationAtomic,
      publisherWallet: body.publisherWallet,
      quoteNonce: body.quoteNonce,
      validUntil: body.validUntil,
      signature: body.signature,
    });
    await quoteRequests.markFulfilled({
      campaignId: body.campaignRef,
      publisherAgentId: body.publisherAgentId,
      slotId: body.slotId,
    });
    return response(request, quote);
  });
}
