import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { address, DomainError, safeUrl } from '@adflow/shared';
import type { ApplicationDependencies } from '../../types.js';
import { requireUser } from '../../shared/auth.js';
import { response } from '../../shared/http.js';
import { AgentRepository } from './agent.repository.js';
import { CampaignQueue } from './campaign-queue.js';
import { CampaignRepository } from '../campaigns/campaign.repository.js';

export async function registerAgentRoutes(app: FastifyInstance, dependencies: ApplicationDependencies) {
  const repository = new AgentRepository(dependencies.db);
  app.post('/api/v1/agents', async (request) => {
    const user = await requireUser(request, dependencies.db);
    const input = z
      .object({
        role: z.enum(['CAMPAIGN', 'PUBLISHER']),
        name: z.string().min(2).max(120),
        publisherId: z.string().optional(),
        walletAddress: address.optional(),
      })
      .parse(request.body);
    return response(request, await repository.create({ ownerUserId: user.id, ...input }));
  });
  app.get('/api/v1/agents/:agentId', async (request) => {
    const user = await requireUser(request, dependencies.db);
    const agent = await repository.findOwned((request.params as { agentId: string }).agentId, user.id);
    if (!agent) throw new DomainError('NOT_FOUND', 'Agent was not found.');
    return response(request, agent);
  });
  app.post('/api/v1/agents/:agentId/erc8004/link', async (request) => {
    const user = await requireUser(request, dependencies.db);
    const agentId = (request.params as { agentId: string }).agentId;
    if (!(await repository.findOwned(agentId, user.id)))
      throw new DomainError('NOT_FOUND', 'Agent was not found.');
    const input = z
      .object({ chainId: z.number().int().positive(), agentId: z.string().min(1), uri: safeUrl })
      .parse(request.body);
    return response(request, await repository.linkErc8004(agentId, input.chainId, input.agentId, input.uri));
  });
  app.get('/.well-known/agent.json', async (request) =>
    response(request, {
      type: 'Agent',
      name: 'AdFlow Publisher Agent',
      endpoints: [{ type: 'a2a', url: `${request.protocol}://${request.hostname}/agent/v1` }],
      extensions: { adflowProtocol: '1.0' },
    }),
  );
  app.get('/agent/v1/capabilities', async (request) =>
    response(request, {
      protocolVersion: '1.0',
      pricingModels: ['CPC', 'CPM'],
      endpoints: ['GET /agent/v1/inventory', 'POST /agent/v1/quotes'],
    }),
  );
  app.post('/api/v1/campaigns/:campaignId/agent/wake', async (request) => {
    const user = await requireUser(request, dependencies.db);
    const campaignId = (request.params as { campaignId: string }).campaignId;
    const trigger = z
      .enum(['SCHEDULE', 'MEASUREMENT', 'APPROVAL_RESUMED', 'MANUAL'])
      .parse((request.body as { trigger?: unknown } | undefined)?.trigger ?? 'MANUAL');

    // Authorization is verified before queuing. The worker reloads canonical campaign state again.
    const campaign = await new CampaignRepository(dependencies.db).findById(campaignId, user.id);
    if (!campaign) throw new DomainError('NOT_FOUND', 'Campaign was not found.');
    if (!dependencies.config.REDIS_URL)
      throw new DomainError('QUEUE_UNAVAILABLE', 'Redis is required to schedule campaign agent work.');

    const queue = new CampaignQueue(dependencies.config.REDIS_URL);
    try {
      const job = await queue.wake({ campaignId, trigger });
      return response(request, { jobId: job.id, campaignId, trigger });
    } finally {
      await queue.close();
    }
  });
}
