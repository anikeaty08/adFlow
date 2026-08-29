import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { createDatabase } from './client.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');

const connection = createDatabase(databaseUrl);
await migrate(connection.db, { migrationsFolder: new URL('../migrations', import.meta.url).pathname });
await connection.close();
