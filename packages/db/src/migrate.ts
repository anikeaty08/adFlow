import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createDatabase } from './client.js';

dotenv.config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)) });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');

const connection = createDatabase(databaseUrl);
await migrate(connection.db, { migrationsFolder: fileURLToPath(new URL('../migrations', import.meta.url)) });
await connection.close();
