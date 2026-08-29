import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import type { Config } from '../../config.js';
import { ViemSettlementExecutor, type SettlementExecutor } from './settlement.executor.js';

export function startSettlementWorker(config: Config, executor?: SettlementExecutor) {
  if (!config.REDIS_URL || !config.SETTLEMENT_OPERATOR_PRIVATE_KEY || !config.ADFLOW_SETTLEMENT_ADDRESS)
    return undefined;
  const connection = new Redis(config.REDIS_URL, { maxRetriesPerRequest: null });
  const settlementExecutor = executor ?? new ViemSettlementExecutor(config);
  return new Worker<{ epochId: string }>(
    'adflow-settlements',
    async (job) => {
      if (job.name !== 'settlement.submit') throw new Error(`Unexpected settlement job ${job.name}`);
      // Epoch contents are loaded by the settlement service before calling this boundary.
      // This worker intentionally accepts only a typed epoch identifier, never arbitrary calldata.
      return { epochId: job.data.epochId, executor: settlementExecutor.constructor.name };
    },
    { connection, concurrency: 2 },
  );
}
