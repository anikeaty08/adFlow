import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { campaignInput, safeUrl } from '@adflow/shared';
import type { ApplicationDependencies } from '../../types.js';
import { requireUser } from '../../shared/auth.js';
import { response } from '../../shared/http.js';
import { CampaignRepository } from './campaign.repository.js';
import { CampaignService } from './campaign.service.js';
import {
  prepareCampaignActiveUpdate,
  prepareCampaignCreation,
  prepareCampaignWithdrawal,
  prepareTokenApproval,
} from '@adflow/chain';
import { serializePreparedContractCall } from './contract-call.serializer.js';

export async function registerCampaignRoutes(app: FastifyInstance, dependencies: ApplicationDependencies) {
  const service = new CampaignService(new CampaignRepository(dependencies.db));
  app.post('/api/v1/campaigns', async (request) => {
    const owner = await requireUser(request, dependencies.db);
    const input = campaignInput.parse(request.body);
    return response(
      request,
      await service.create(owner, {
        ...input,
        startAt: input.startAt,
        endAt: input.endAt,
        settlementToken: input.settlementToken,
        allowedCategories: input.targeting.categories,
        blockedCategories: input.blockedCategories,
        minReputationScore: input.strategy.minReputationScore,
        maxPublisherAllocationAtomic: input.strategy.maxPublisherAllocationAtomic,
        explorationRatioBasisPoints: input.strategy.explorationRatioBasisPoints,
      }),
    );
  });
  app.get('/api/v1/campaigns', async (request) => {
    const owner = await requireUser(request, dependencies.db);
    return response(request, await new CampaignRepository(dependencies.db).listByOwner(owner.id));
  });
  app.get('/api/v1/campaigns/:campaignId', async (request) => {
    const owner = await requireUser(request, dependencies.db);
    return response(request, await service.get((request.params as { campaignId: string }).campaignId, owner));
  });
  app.patch('/api/v1/campaigns/:campaignId', async (request) => {
    const owner = await requireUser(request, dependencies.db);
    const update = z
      .object({
        name: z.string().min(2).max(120).optional(),
        objectiveText: z.string().min(2).max(4000).optional(),
        landingUrl: safeUrl.optional(),
      })
      .parse(request.body);
    return response(
      request,
      await service.updateDraft((request.params as { campaignId: string }).campaignId, owner, update),
    );
  });
  app.post('/api/v1/campaigns/:campaignId/prepare-funding', async (request) => {
    const owner = await requireUser(request, dependencies.db);
    const campaign = await service.get((request.params as { campaignId: string }).campaignId, owner);
    const amount = BigInt(campaign.budgetPlannedAtomic);
    if (!dependencies.config.ADFLOW_CAMPAIGN_VAULT_ADDRESS) {
      return response(request, {
        chainId: campaign.chainId,
        token: campaign.settlementTokenAddress,
        state: 'awaiting_contract_deployment',
        approval: null,
        fundingContractCall: null,
      });
    }
    return response(request, {
      chainId: campaign.chainId,
      token: campaign.settlementTokenAddress,
      approval: {
        required: true,
        spender: dependencies.config.ADFLOW_CAMPAIGN_VAULT_ADDRESS,
        amount: campaign.budgetPlannedAtomic,
        contractCall: serializePreparedContractCall(
          prepareTokenApproval(
            campaign.settlementTokenAddress,
            dependencies.config.ADFLOW_CAMPAIGN_VAULT_ADDRESS,
            amount,
          ),
        ),
      },
      fundingContractCall: serializePreparedContractCall(
        prepareCampaignCreation(
          dependencies.config.ADFLOW_CAMPAIGN_VAULT_ADDRESS,
          campaign.settlementTokenAddress,
          amount,
          BigInt(campaign.maxUnitPriceAtomic),
        ),
      ),
      state: 'prepared',
    });
  });

  for (const [path, active] of [
    ['/api/v1/campaigns/:campaignId/prepare-pause', false],
    ['/api/v1/campaigns/:campaignId/prepare-resume', true],
  ] as const) {
    app.post(path, async (request) => {
      const owner = await requireUser(request, dependencies.db);
      const campaign = await service.get((request.params as { campaignId: string }).campaignId, owner);
      if (!dependencies.config.ADFLOW_CAMPAIGN_VAULT_ADDRESS || !campaign.onchainCampaignId) {
        return response(request, { state: 'awaiting_contract_or_funding', contractCall: null });
      }
      return response(request, {
        state: 'prepared',
        contractCall: serializePreparedContractCall(
          prepareCampaignActiveUpdate(
            dependencies.config.ADFLOW_CAMPAIGN_VAULT_ADDRESS,
            BigInt(campaign.onchainCampaignId),
            active,
          ),
        ),
      });
    });
  }

  app.post('/api/v1/campaigns/:campaignId/prepare-end', async (request) => {
    const owner = await requireUser(request, dependencies.db);
    const campaign = await service.get((request.params as { campaignId: string }).campaignId, owner);
    if (!dependencies.config.ADFLOW_CAMPAIGN_VAULT_ADDRESS || !campaign.onchainCampaignId)
      return response(request, { state: 'awaiting_contract_or_funding', contractCall: null });
    return response(request, {
      state: 'prepared',
      contractCall: serializePreparedContractCall(
        prepareCampaignActiveUpdate(
          dependencies.config.ADFLOW_CAMPAIGN_VAULT_ADDRESS,
          BigInt(campaign.onchainCampaignId),
          false,
        ),
      ),
    });
  });

  app.post('/api/v1/campaigns/:campaignId/prepare-withdraw', async (request) => {
    const owner = await requireUser(request, dependencies.db);
    const campaign = await service.get((request.params as { campaignId: string }).campaignId, owner);
    if (!dependencies.config.ADFLOW_CAMPAIGN_VAULT_ADDRESS || !campaign.onchainCampaignId)
      return response(request, { state: 'awaiting_contract_or_funding', contractCall: null });
    return response(request, {
      state: 'prepared',
      contractCall: serializePreparedContractCall(
        prepareCampaignWithdrawal(
          dependencies.config.ADFLOW_CAMPAIGN_VAULT_ADDRESS,
          BigInt(campaign.onchainCampaignId),
        ),
      ),
    });
  });
}
