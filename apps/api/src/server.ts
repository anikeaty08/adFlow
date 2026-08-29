import { createDatabase } from '@adflow/db';
import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { startCampaignWorker } from './modules/agents/campaign-worker.js';
import { startSettlementWorker } from './modules/settlement/settlement-worker.js';
import { startChainReconciliationWorker } from './modules/settlement/chain-reconciliation.worker.js';
import { startVerificationWorker } from './modules/measurement/verification.worker.js';
import { startChainIndexerWorker } from './modules/settlement/chain-indexer.worker.js';
import { startOutboxWorker } from './modules/outbox/outbox.worker.js';

const config = loadConfig();
const database = createDatabase(config.DATABASE_URL);
const app = await buildApp({ config, db: database.db });
const campaignWorker = startCampaignWorker(config, database.db);
const settlementWorker = startSettlementWorker(config, database.db);
const chainReconciliationWorker = startChainReconciliationWorker(config, database.db);
const verificationWorker = startVerificationWorker(config, database.db);
const chainIndexerWorker = startChainIndexerWorker(config, database.db);
const outboxWorker = startOutboxWorker(database.db);
await app.listen({ host: '0.0.0.0', port: config.PORT });

const shutdown = async () => {
  await app.close();
  await campaignWorker?.close();
  await settlementWorker?.close();
  chainReconciliationWorker?.close();
  await verificationWorker?.close();
  chainIndexerWorker?.close();
  outboxWorker.close();
  await database.close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
