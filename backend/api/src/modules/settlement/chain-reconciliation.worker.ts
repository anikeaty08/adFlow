import type { Database } from '@adflow/db';
import type { Config } from '../../config.js';
import { ChainReconciliationService } from './chain-reconciliation.service.js';

export type ChainReconciliationWorker = { close(): void };

/** Periodic receipt reconciliation is idempotent and safe to run on every API worker. */
export function startChainReconciliationWorker(
  config: Config,
  db: Database,
): ChainReconciliationWorker | undefined {
  if (!config.ADFLOW_SETTLEMENT_ADDRESS) return undefined;
  const service = new ChainReconciliationService(config, db);
  const reconcile = () => void service.reconcileSubmitted().catch(() => undefined);
  const timer = setInterval(reconcile, 15_000);
  reconcile();
  return { close: () => clearInterval(timer) };
}
