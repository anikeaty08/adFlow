import type { FastifyInstance } from 'fastify';
import { and, count, eq, sql } from 'drizzle-orm';
import {
  adSlots,
  agents,
  agentRuns,
  agreements,
  campaigns as campaignRecords,
  measurementEvents,
  publisherSites,
} from '@adflow/db';
import { DomainError } from '@adflow/shared';
import type { ApplicationDependencies } from '../../types.js';
import { requireUser } from '../../shared/auth.js';
import { response } from '../../shared/http.js';
import { CampaignRepository } from '../campaigns/campaign.repository.js';
import { CampaignQueue } from '../agents/campaign-queue.js';
import { evaluatePublisherEligibility } from './publisher-eligibility.js';

export async function registerOperationsRoutes(app: FastifyInstance, dependencies: ApplicationDependencies) {
  const campaigns = new CampaignRepository(dependencies.db);

  app.get('/api/v1/campaigns/:campaignId/candidates', async (request) => {
    const user = await requireUser(request, dependencies.db);
    const campaignId = (request.params as { campaignId: string }).campaignId;
    const campaign = await campaigns.findById(campaignId, user.id);
    if (!campaign) throw new DomainError('NOT_FOUND', 'Campaign was not found.');
    const candidates = await dependencies.db
      .select({ agent: agents, slot: adSlots, site: publisherSites })
      .from(agents)
      .innerJoin(publisherSites, eq(publisherSites.publisherId, agents.publisherId))
      .innerJoin(adSlots, eq(adSlots.siteId, publisherSites.id))
      .where(eq(agents.role, 'PUBLISHER'))
      .limit(100);

    const policy = campaign.policy;
    if (!policy) throw new DomainError('CONFLICT', 'Campaign policy is missing.');

    return response(
      request,
      candidates.map(({ agent, slot, site }) => {
        const eligibility = evaluatePublisherEligibility(
          {
            allowedCategories: policy.allowedCategories,
            blockedCategories: policy.blockedCategories,
            maxUnitPriceAtomic: campaign.maxUnitPriceAtomic,
            minReputationScore: policy.minReputationScore,
          },
          {
            categories: slot.categories,
            floorRateAtomic: campaign.pricingModel === 'CPC' ? slot.floorCpcAtomic : slot.floorCpmAtomic,
            siteStatus: site.status,
            slotStatus: slot.status,
          },
        );
        return {
          publisherAgentId: agent.id,
          slotId: slot.id,
          walletAddress: agent.walletAddress,
          hardFilter: { eligible: eligibility.eligible, reasonCodes: eligibility.reasonCodes },
          score: eligibility.score,
        };
      }),
    );
  });

  app.post('/api/v1/campaigns/:campaignId/discovery/run', async (request) => {
    const user = await requireUser(request, dependencies.db);
    const campaignId = (request.params as { campaignId: string }).campaignId;
    if (!(await campaigns.findById(campaignId, user.id)))
      throw new DomainError('NOT_FOUND', 'Campaign was not found.');
    const queueEndpoint = dependencies.config.REDIS_URL ?? dependencies.config.UPSTASH_REDIS_REST_URL;
    if (!queueEndpoint || (!dependencies.config.REDIS_URL && !dependencies.config.UPSTASH_REDIS_REST_TOKEN))
      throw new DomainError('QUEUE_UNAVAILABLE', 'Redis is required to run discovery.');
    const queue = new CampaignQueue(queueEndpoint, dependencies.config.UPSTASH_REDIS_REST_TOKEN);
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
    const query = request.query as { metric?: string; interval?: string };
    const metric = query.metric === 'impressions' ? 'impressions' : 'clicks';
    const interval = query.interval === 'day' ? 'day' : 'hour';
    const eventType = metric === 'impressions' ? 'IMPRESSION' : 'CLICK';
    const bucket =
      interval === 'day'
        ? sql<Date>`date_trunc('day', ${measurementEvents.occurredAt})`
        : sql<Date>`date_trunc('hour', ${measurementEvents.occurredAt})`;
    const rows = await dependencies.db
      .select({ bucket, value: count() })
      .from(measurementEvents)
      .innerJoin(agreements, eq(measurementEvents.agreementId, agreements.id))
      .where(
        and(
          eq(agreements.campaignId, campaignId),
          eq(measurementEvents.eventType, eventType),
          eq(measurementEvents.status, 'ACCEPTED'),
        ),
      )
      .groupBy(bucket)
      .orderBy(bucket);
    return response(request, {
      metric,
      interval,
      points: rows.map((row) => ({ at: row.bucket.toISOString(), value: Number(row.value) })),
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
    const [run] = await dependencies.db
      .select({ run: agentRuns })
      .from(agentRuns)
      .innerJoin(campaignRecords, eq(agentRuns.campaignId, campaignRecords.id))
      .where(
        and(
          eq(agentRuns.id, (request.params as { runId: string }).runId),
          eq(campaignRecords.ownerUserId, user.id),
        ),
      )
      .limit(1);
    if (!run) throw new DomainError('NOT_FOUND', 'Agent run was not found.');
    return response(request, run.run);
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
      const queueEndpoint = dependencies.config.REDIS_URL ?? dependencies.config.UPSTASH_REDIS_REST_URL;
      if (!queueEndpoint || (!dependencies.config.REDIS_URL && !dependencies.config.UPSTASH_REDIS_REST_TOKEN))
        throw new DomainError('QUEUE_UNAVAILABLE', 'Redis is required for agent work.');
      const queue = new CampaignQueue(queueEndpoint, dependencies.config.UPSTASH_REDIS_REST_TOKEN);
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
