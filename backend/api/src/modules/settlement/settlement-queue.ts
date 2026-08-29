import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

export type SettlementJob = { epochId: string };

export class SettlementQueue {
  private readonly connection?: Redis;
  private readonly queue?: Queue<SettlementJob>;
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
    this.queue = new Queue<SettlementJob>('adflow-settlements', { connection: this.connection });
  }

  async submit(epochId: string) {
    if (!this.queue) {
      await this.command(
        'LPUSH',
        'adflow:settlements',
        JSON.stringify({ id: epochId, name: 'settlement.submit', data: { epochId } }),
      );
      return { id: epochId };
    }
    return this.queue.add(
      'settlement.submit',
      { epochId },
      {
        jobId: epochId,
        attempts: 5,
        backoff: { type: 'exponential', delay: 2_000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    );
  }

  async close() {
    if (this.pollingTimer) clearInterval(this.pollingTimer);
    await this.queue?.close();
    await this.connection?.quit();
  }

  consume(handler: (job: { id: string; name: string; data: SettlementJob }) => Promise<void>) {
    if (!this.restUrl) return;
    const poll = async () => {
      const raw = await this.command('RPOP', 'adflow:settlements');
      if (typeof raw !== 'string') return;
      await handler(JSON.parse(raw) as { id: string; name: string; data: SettlementJob });
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
    const body = (await response.json()) as { result?: unknown };
    return body.result;
  }
}
