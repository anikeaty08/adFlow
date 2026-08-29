import type { Database } from '@adflow/db';
import type { Config } from '../../config.js';
import { ChainIndexerService } from './chain-indexer.service.js';

export type ChainIndexerWorker = { close(): void };

export function startChainIndexerWorker(config: Config, db: Database): ChainIndexerWorker | undefined {
  if (!config.ADFLOW_CAMPAIGN_VAULT_ADDRESS && !config.ADFLOW_SETTLEMENT_ADDRESS) return undefined;
  const service = new ChainIndexerService(config, db);
  let running = false;
  const index = async () => {
    if (running) return;
    running = true;
    try {
      await service.indexFinalizedLogs();
    } finally {
      running = false;
    }
  };
  const timer = setInterval(() => void index().catch(() => undefined), 15_000);
  void index().catch(() => undefined);
  return { close: () => clearInterval(timer) };
}
