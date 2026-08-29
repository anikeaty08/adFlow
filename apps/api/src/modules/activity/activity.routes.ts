import type { FastifyInstance } from 'fastify';
import { DomainError } from '@adflow/shared';
import type { ApplicationDependencies } from '../../types.js';
import { requireUser } from '../../shared/auth.js';
import { CampaignRepository } from '../campaigns/campaign.repository.js';
import { ActivityRepository } from './activity.repository.js';

export async function registerActivityRoutes(app: FastifyInstance, dependencies: ApplicationDependencies) {
  const activityRepository = new ActivityRepository(dependencies.db);
  const campaignRepository = new CampaignRepository(dependencies.db);

  app.get('/api/v1/campaigns/:campaignId/activity/stream', async (request, reply) => {
    const user = await requireUser(request, dependencies.db);
    const campaignId = (request.params as { campaignId: string }).campaignId;
    if (!(await campaignRepository.findById(campaignId, user.id)))
      throw new DomainError('NOT_FOUND', 'Campaign was not found.');

    reply.hijack();
    reply.raw.writeHead(200, {
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Content-Type': 'text/event-stream',
    });
    reply.raw.write('event: ready\ndata: {}\n\n');

    let cursor = new Date(0);
    const publish = async () => {
      const events = await activityRepository.listSince(campaignId, cursor);
      for (const event of events) {
        cursor = event.createdAt;
        reply.raw.write(`event: activity\ndata: ${JSON.stringify(event)}\n\n`);
      }
    };
    const interval = setInterval(() => void publish(), 2_000);
    request.raw.on('close', () => clearInterval(interval));
  });
}
