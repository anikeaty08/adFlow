import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import type { Config } from '../../config.js';
import type { Database } from '@adflow/db';
import { ViemSettlementExecutor, type SettlementExecutor } from './settlement.executor.js';
import { SettlementService } from './settlement.service.js';

export function startSettlementWorker(config: Config, db: Database, executor?: SettlementExecutor) {
  if (!config.REDIS_URL || !config.SETTLEMENT_OPERATOR_PRIVATE_KEY || !config.ADFLOW_SETTLEMENT_ADDRESS)
    return undefined;
  const connection = new Redis(config.REDIS_URL, { maxRetriesPerRequest: null });
  const settlementExecutor = executor ?? new ViemSettlementExecutor(config);
  const service = new SettlementService(db, settlementExecutor);
  return new Worker<{ epochId: string }>(
    'adflow-settlements',
    async (job) => {
      if (job.name !== 'settlement.submit') throw new Error(`Unexpected settlement job ${job.name}`);
      return service.submitEpoch(job.data.epochId);
    },
    { connection, concurrency: 2 },
  );
}
