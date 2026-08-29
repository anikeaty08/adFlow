import { Queue, type JobsOptions } from 'bullmq';
import { Redis } from 'ioredis';

export const campaignWakeupJob = 'campaign-wakeup';

export type CampaignWakeupPayload = {
  campaignId: string;
  trigger: 'SCHEDULE' | 'MEASUREMENT' | 'APPROVAL_RESUMED' | 'MANUAL';
};

/**
 * Redis stores transient scheduling state only. PostgreSQL remains the campaign and financial
 * source of truth, so a job can always be safely retried from canonical state.
 */
export class CampaignQueue {
  private readonly queue: Queue<CampaignWakeupPayload>;

  constructor(redisUrl: string) {
    const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
    this.queue = new Queue<CampaignWakeupPayload>('adflow-campaigns', { connection });
  }

  async wake(payload: CampaignWakeupPayload, delayMs = 0) {
    const options: JobsOptions = {
      jobId: `${payload.campaignId}:${payload.trigger}:${Math.floor(Date.now() / 60_000)}`,
      delay: delayMs,
      attempts: 5,
      backoff: { type: 'exponential', delay: 2_000 },
      removeOnComplete: 500,
      removeOnFail: 2_000,
    };
    return this.queue.add(campaignWakeupJob, payload, options);
  }

  async close() {
    await this.queue.close();
  }
}
