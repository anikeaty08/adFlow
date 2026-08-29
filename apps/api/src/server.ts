import { createDatabase } from '@adflow/db';
import { buildApp } from './app.js';
import { loadConfig } from './config.js';

const config = loadConfig();
const database = createDatabase(config.DATABASE_URL);
const app = await buildApp({ config, db: database.db });
await app.listen({ host: '0.0.0.0', port: config.PORT });

const shutdown = async () => {
  await app.close();
  await database.close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
