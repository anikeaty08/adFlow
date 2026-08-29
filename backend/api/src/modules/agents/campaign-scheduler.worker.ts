import { and, gt, inArray, lte } from 'drizzle-orm';
import { campaigns, type Database } from '@adflow/db';
import type { Config } from '../../config.js';
import { CampaignQueue } from './campaign-queue.js';

export const schedulableCampaignStatuses = ['FUNDED', 'DISCOVERING', 'ACTIVE'] as const;

export type CampaignSchedulerWorker = { close(): Promise<void> };

/**
 * Wakes only campaigns that are economically eligible to run. The queue is a delivery mechanism;
 * every wake-up reloads canonical Postgres state before the graph makes a decision.
 */
export function startCampaignSchedulerWorker(
  config: Config,
  db: Database,
): CampaignSchedulerWorker | undefined {
  const queueEndpoint = config.REDIS_URL ?? config.UPSTASH_REDIS_REST_URL;
  if (!queueEndpoint || (!config.REDIS_URL && !config.UPSTASH_REDIS_REST_TOKEN)) return undefined;

  const queue = new CampaignQueue(queueEndpoint, config.UPSTASH_REDIS_REST_TOKEN);
  let running = false;
  const schedule = async () => {
    if (running) return;
    running = true;
    try {
      const now = new Date();
      const eligibleCampaigns = await db
        .select({ id: campaigns.id })
        .from(campaigns)
        .where(
          and(
            inArray(campaigns.status, [...schedulableCampaignStatuses]),
            lte(campaigns.startAt, now),
            gt(campaigns.endAt, now),
          ),
        );
      await Promise.all(
        eligibleCampaigns.map((campaign) => queue.wake({ campaignId: campaign.id, trigger: 'SCHEDULE' })),
      );
    } finally {
      running = false;
    }
  };

  const timer = setInterval(() => void schedule().catch(() => undefined), config.AGENT_SCHEDULE_INTERVAL_MS);
  void schedule().catch(() => undefined);
  return {
    close: async () => {
      clearInterval(timer);
      await queue.close();
    },
  };
}
