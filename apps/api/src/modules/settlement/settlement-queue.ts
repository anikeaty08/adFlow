import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

export type SettlementJob = { epochId: string };

export class SettlementQueue {
  private readonly connection: Redis;
  private readonly queue: Queue<SettlementJob>;

  constructor(redisUrl: string) {
    this.connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
    this.queue = new Queue<SettlementJob>('adflow-settlements', { connection: this.connection });
  }

  submit(epochId: string) {
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
    await this.queue.close();
    await this.connection.quit();
  }
}
