import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import type { Database } from '@adflow/db';
import type { Config } from '../../config.js';
import { campaignWakeupJob, type CampaignWakeupPayload } from './campaign-queue.js';
import { CampaignAgentService } from './campaign-agent.service.js';
import { Mem0MemoryGateway } from './mem0.memory.gateway.js';
import {
  DeterministicCampaignModelGateway,
  OpenAiCampaignModelGateway,
  type CampaignModelGateway,
} from './openai-model.gateway.js';

export function startCampaignWorker(config: Config, db: Database) {
  if (!config.REDIS_URL) return undefined;

  const connection = new Redis(config.REDIS_URL, { maxRetriesPerRequest: null });
  const model: CampaignModelGateway = config.OPENAI_API_KEY
    ? new OpenAiCampaignModelGateway(config.OPENAI_API_KEY, config.OPENAI_MODEL)
    : new DeterministicCampaignModelGateway();
  const service = new CampaignAgentService(db, model, new Mem0MemoryGateway(config));

  return new Worker<CampaignWakeupPayload>(
    'adflow-campaigns',
    async (job) => {
      if (job.name !== campaignWakeupJob) throw new Error(`Unexpected campaign job ${job.name}`);
      return service.run(job.data.campaignId, job.data.trigger, String(job.id));
    },
    { connection, concurrency: 4 },
  );
}
