import type { Database } from '@adflow/db';
import type { Config } from '../../config.js';
import { SettlementEpochService } from '../settlement/settlement-epoch.service.js';
import { SettlementQueue } from '../settlement/settlement-queue.js';
import { MeasurementVerificationService } from './verification.service.js';

export type VerificationWorker = { close(): Promise<void> };

/** Keeps verification, epoch preparation, and financial submission in explicit separate stages. */
export function startVerificationWorker(config: Config, db: Database): VerificationWorker | undefined {
  const queueEndpoint = config.REDIS_URL ?? config.UPSTASH_REDIS_REST_URL;
  if (!queueEndpoint || (!config.REDIS_URL && !config.UPSTASH_REDIS_REST_TOKEN)) return undefined;

  const verification = new MeasurementVerificationService(db);
  const epochs = new SettlementEpochService(db);
  const queue = new SettlementQueue(queueEndpoint, config.UPSTASH_REDIS_REST_TOKEN);
  let running = false;
  const cycle = async () => {
    if (running) return;
    running = true;
    try {
      await verification.verifyPending();
      const epochIds = await epochs.prepareEligibleEpochs();
      for (const epochId of epochIds) await queue.submit(epochId);
    } finally {
      running = false;
    }
  };
  const timer = setInterval(() => void cycle().catch(() => undefined), 5_000);
  void cycle().catch(() => undefined);
  return {
    close: async () => {
      clearInterval(timer);
      await queue.close();
    },
  };
}
