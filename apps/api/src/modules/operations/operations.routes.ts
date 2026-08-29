import type { FastifyInstance } from 'fastify';
import { and, count, eq } from 'drizzle-orm';
import { agents, agentRuns, agreements, measurementEvents } from '@adflow/db';
import { DomainError } from '@adflow/shared';
import type { ApplicationDependencies } from '../../types.js';
import { requireUser } from '../../shared/auth.js';
import { response } from '../../shared/http.js';
import { CampaignRepository } from '../campaigns/campaign.repository.js';
import { CampaignQueue } from '../agents/campaign-queue.js';

export async function registerOperationsRoutes(app: FastifyInstance, dependencies: ApplicationDependencies) {
  const campaigns = new CampaignRepository(dependencies.db);

  app.get('/api/v1/campaigns/:campaignId/candidates', async (request) => {
    const user = await requireUser(request, dependencies.db);
    const campaignId = (request.params as { campaignId: string }).campaignId;
    if (!(await campaigns.findById(campaignId, user.id)))
      throw new DomainError('NOT_FOUND', 'Campaign was not found.');
    const candidates = await dependencies.db
      .select()
      .from(agents)
      .where(eq(agents.role, 'PUBLISHER'))
      .limit(100);
    return response(
      request,
      candidates.map((agent) => ({
        publisherAgentId: agent.id,
        walletAddress: agent.walletAddress,
        hardFilter: { eligible: true, reasonCodes: [] },
        score: { total: 0, components: {} },
      })),
    );
  });

  app.post('/api/v1/campaigns/:campaignId/discovery/run', async (request) => {
    const user = await requireUser(request, dependencies.db);
    const campaignId = (request.params as { campaignId: string }).campaignId;
    if (!(await campaigns.findById(campaignId, user.id)))
      throw new DomainError('NOT_FOUND', 'Campaign was not found.');
    if (!dependencies.config.REDIS_URL)
      throw new DomainError('QUEUE_UNAVAILABLE', 'Redis is required to run discovery.');
    const queue = new CampaignQueue(dependencies.config.REDIS_URL);
    try {
      const job = await queue.wake({ campaignId, trigger: 'MANUAL' });
      return response(request, { jobId: job.id, state: 'queued' });
    } finally {
      await queue.close();
    }
  });

  app.get('/api/v1/campaigns/:campaignId/analytics/summary', async (request) => {
    const user = await requireUser(request, dependencies.db);
    const campaignId = (request.params as { campaignId: string }).campaignId;
    if (!(await campaigns.findById(campaignId, user.id)))
      throw new DomainError('NOT_FOUND', 'Campaign was not found.');
    const rows = await dependencies.db
      .select({ eventType: measurementEvents.eventType, status: measurementEvents.status, total: count() })
      .from(measurementEvents)
      .innerJoin(agreements, eq(measurementEvents.agreementId, agreements.id))
      .where(eq(agreements.campaignId, campaignId))
      .groupBy(measurementEvents.eventType, measurementEvents.status);
    const metric = (type: string, status?: string) =>
      Number(rows.find((row) => row.eventType === type && (!status || row.status === status))?.total ?? 0);
    const impressions = metric('IMPRESSION');
    const clicks = metric('CLICK');
    return response(request, {
      impressions,
      verifiedImpressions: metric('IMPRESSION', 'ACCEPTED'),
      clicks,
      verifiedClicks: metric('CLICK', 'ACCEPTED'),
      ctr: impressions ? clicks / impressions : 0,
    });
  });

  app.get('/api/v1/campaigns/:campaignId/analytics/timeseries', async (request) => {
    const user = await requireUser(request, dependencies.db);
    const campaignId = (request.params as { campaignId: string }).campaignId;
    if (!(await campaigns.findById(campaignId, user.id)))
      throw new DomainError('NOT_FOUND', 'Campaign was not found.');
    return response(request, {
      metric: (request.query as { metric?: string }).metric ?? 'clicks',
      interval: (request.query as { interval?: string }).interval ?? 'hour',
      points: [],
    });
  });

  app.get('/api/v1/campaigns/:campaignId/agent/runs', async (request) => {
    const user = await requireUser(request, dependencies.db);
    const campaignId = (request.params as { campaignId: string }).campaignId;
    if (!(await campaigns.findById(campaignId, user.id)))
      throw new DomainError('NOT_FOUND', 'Campaign was not found.');
    return response(
      request,
      await dependencies.db.select().from(agentRuns).where(eq(agentRuns.campaignId, campaignId)),
    );
  });

  app.get('/api/v1/agent-runs/:runId', async (request) => {
    const user = await requireUser(request, dependencies.db);
    void user;
    const [run] = await dependencies.db
      .select()
      .from(agentRuns)
      .where(eq(agentRuns.id, (request.params as { runId: string }).runId))
      .limit(1);
    if (!run) throw new DomainError('NOT_FOUND', 'Agent run was not found.');
    return response(request, run);
  });

  for (const [path, trigger] of [
    ['/api/v1/campaigns/:campaignId/agent/start', 'MANUAL'],
    ['/api/v1/campaigns/:campaignId/agent/run-now', 'MANUAL'],
    ['/api/v1/campaigns/:campaignId/agent/pause', 'MANUAL'],
  ] as const) {
    app.post(path, async (request) => {
      const user = await requireUser(request, dependencies.db);
      const campaignId = (request.params as { campaignId: string }).campaignId;
      if (!(await campaigns.findById(campaignId, user.id)))
        throw new DomainError('NOT_FOUND', 'Campaign was not found.');
      if (!dependencies.config.REDIS_URL)
        throw new DomainError('QUEUE_UNAVAILABLE', 'Redis is required for agent work.');
      const queue = new CampaignQueue(dependencies.config.REDIS_URL);
      try {
        const job = await queue.wake({ campaignId, trigger });
        return response(request, {
          jobId: job.id,
          campaignId,
          state: path.endsWith('/pause') ? 'pause_requested' : 'queued',
        });
      } finally {
        await queue.close();
      }
    });
  }
}
