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
  private readonly queue?: Queue<CampaignWakeupPayload>;
  private readonly connection?: Redis;
  private readonly restUrl?: string;
  private readonly restToken?: string;
  private pollingTimer?: NodeJS.Timeout;

  constructor(redisUrl: string, restToken?: string) {
    if (redisUrl.startsWith('http')) {
      this.restUrl = redisUrl.replace(/\/$/, '');
      this.restToken = restToken;
      return;
    }
    this.connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
    this.queue = new Queue<CampaignWakeupPayload>('adflow-campaigns', { connection: this.connection });
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
    const jobId = options.jobId as string;
    if (this.queue) return this.queue.add(campaignWakeupJob, payload, options);
    await this.command(
      'LPUSH',
      'adflow:campaigns',
      JSON.stringify({ id: jobId, name: campaignWakeupJob, data: payload }),
    );
    return { id: jobId };
  }

  async close() {
    if (this.pollingTimer) clearInterval(this.pollingTimer);
    await this.queue?.close();
    await this.connection?.quit();
  }

  consume(handler: (job: { id: string; name: string; data: CampaignWakeupPayload }) => Promise<void>) {
    if (!this.restUrl) return;
    const poll = async () => {
      const raw = await this.command('RPOP', 'adflow:campaigns');
      if (!raw) return;
      await handler(JSON.parse(raw) as { id: string; name: string; data: CampaignWakeupPayload });
    };
    this.pollingTimer = setInterval(() => void poll().catch(() => undefined), 1_000);
    void poll().catch(() => undefined);
  }

  private async command(command: string, ...args: string[]) {
    if (!this.restUrl || !this.restToken) throw new Error('Upstash REST URL and token are required');
    const response = await fetch(this.restUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.restToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([command, ...args]),
    });
    if (!response.ok) throw new Error(`Upstash command failed with HTTP ${response.status}`);
    const body = (await response.json()) as { result?: string | number | null };
    return body.result ?? null;
  }
}
