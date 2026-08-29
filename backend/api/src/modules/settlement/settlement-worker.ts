import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import type { Config } from '../../config.js';
import type { Database } from '@adflow/db';
import { ViemSettlementExecutor, type SettlementExecutor } from './settlement.executor.js';
import { SettlementService } from './settlement.service.js';
import { SettlementQueue } from './settlement-queue.js';

export function startSettlementWorker(config: Config, db: Database, executor?: SettlementExecutor) {
  const queueEndpoint = config.REDIS_URL ?? config.UPSTASH_REDIS_REST_URL;
  if (
    !queueEndpoint ||
    (!config.REDIS_URL && !config.UPSTASH_REDIS_REST_TOKEN) ||
    !config.SETTLEMENT_OPERATOR_PRIVATE_KEY ||
    !config.ADFLOW_SETTLEMENT_ADDRESS
  )
    return undefined;
  const settlementExecutor = executor ?? new ViemSettlementExecutor(config);
  const service = new SettlementService(db, settlementExecutor);
  if (!config.REDIS_URL) {
    const queue = new SettlementQueue(queueEndpoint, config.UPSTASH_REDIS_REST_TOKEN);
    queue.consume(async (job) => {
      if (job.name !== 'settlement.submit') throw new Error(`Unexpected settlement job ${job.name}`);
      await service.submitEpoch(job.data.epochId);
    });
    return queue;
  }
  const connection = new Redis(config.REDIS_URL, { maxRetriesPerRequest: null });
  return new Worker<{ epochId: string }>(
    'adflow-settlements',
    async (job) => {
      if (job.name !== 'settlement.submit') throw new Error(`Unexpected settlement job ${job.name}`);
      return service.submitEpoch(job.data.epochId);
    },
    { connection, concurrency: 2 },
  );
}
