import type { Config } from './config.js';
import type { Database } from '@adflow/db';

export type ApplicationDependencies = {
  config: Config;
  db: Database;
};
