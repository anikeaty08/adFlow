import { afterEach, describe, expect, it } from 'vitest';
import type { Database } from '@adflow/db';
import { buildApp } from './app.js';
import type { Config } from './config.js';

const config: Config = {
  NODE_ENV: 'test',
  PORT: 3001,
  CORS_ORIGINS: 'http://localhost:3000',
  DATABASE_URL: 'postgres://test',
  SESSION_SECRET: 'test-session-secret-with-at-least-thirty-two-characters',
  PLACEMENT_TOKEN_SECRET: 'test-placement-secret-with-at-least-thirty-two-characters',
  CELO_NETWORK: 'sepolia',
  CELO_CHAIN_ID: 11142220,
  CELO_RPC_URL: 'https://forno.celo-sepolia.celo-testnet.org',
  CELO_BLOCK_EXPLORER: 'https://celo-sepolia.blockscout.com',
  USDC_TOKEN_ADDRESS: '0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B',
  USDC_DECIMALS: 6,
  USDC_FEE_CURRENCY_ADDRESS: '0x4822e58de6f5e485eF90df51C41CE01721331dC0',
  ERC8004_IDENTITY_REGISTRY: '0x8004A818BFB912233c491871b3d84c89A494BD9E',
  ERC8004_REPUTATION_REGISTRY: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
  CHAIN_WRITE_MODE: 'frontend_wallet',
  MAINNET_ENABLED: false,
  STRICT_POLICY_MODE: true,
  CLOUDINARY_FOLDER: 'adflow/creatives',
  OPENAI_MODEL: 'gpt-4o-mini',
  AGENT_SCHEDULE_INTERVAL_MS: 1_800_000,
  MEM0_BASE_URL: 'https://api.mem0.ai',
};

const db = {} as Database;
const apps: Awaited<ReturnType<typeof buildApp>>[] = [];

async function app() {
  const instance = await buildApp({ config, db });
  apps.push(instance);
  return instance;
}

afterEach(async () => {
  await Promise.all(apps.splice(0).map((instance) => instance.close()));
});

describe('Fastify route contract', () => {
  it('serves public health and agent metadata endpoints', async () => {
    const server = await app();

    expect((await server.inject('/health/live')).json()).toMatchObject({ data: { status: 'ok' } });
    expect((await server.inject('/health/ready')).json()).toMatchObject({
      data: { chain: 'sepolia', dependencies: { database: 'skipped' } },
    });
    expect((await server.inject('/.well-known/agent.json')).statusCode).toBe(200);
    expect((await server.inject('/agent/v1/capabilities')).statusCode).toBe(200);
  });

  it('rejects every authenticated API endpoint without a wallet session', async () => {
    const server = await app();
    const requests = [
      ['POST', '/api/v1/campaigns'],
      ['GET', '/api/v1/campaigns'],
      ['GET', '/api/v1/campaigns/cmp_1'],
      ['PATCH', '/api/v1/campaigns/cmp_1'],
      ['POST', '/api/v1/campaigns/cmp_1/prepare-funding'],
      ['POST', '/api/v1/campaigns/cmp_1/prepare-pause'],
      ['POST', '/api/v1/campaigns/cmp_1/prepare-resume'],
      ['POST', '/api/v1/campaigns/cmp_1/prepare-end'],
      ['POST', '/api/v1/campaigns/cmp_1/prepare-withdraw'],
      ['POST', '/api/v1/campaigns/cmp_1/quotes/qte_1/accept-preview'],
      ['POST', '/api/v1/campaigns/cmp_1/quotes/qte_1/prepare-agreement'],
      ['GET', '/api/v1/campaigns/cmp_1/quotes'],
      ['GET', '/api/v1/quotes/qte_1'],
      ['POST', '/api/v1/creatives/upload-url'],
      ['POST', '/api/v1/creatives/complete'],
      ['GET', '/api/v1/creatives/crt_1'],
      ['DELETE', '/api/v1/creatives/crt_1'],
      ['POST', '/api/v1/publishers'],
      ['GET', '/api/v1/publishers/me'],
      ['POST', '/api/v1/publishers/sites'],
      ['POST', '/api/v1/publishers/sites/site_1/slots'],
      ['GET', '/api/v1/publishers/slots'],
      ['POST', '/api/v1/agents'],
      ['GET', '/api/v1/agents/agt_1'],
      ['POST', '/api/v1/agents/agt_1/erc8004/link'],
      ['POST', '/api/v1/campaigns/cmp_1/agent/wake'],
      ['GET', '/api/v1/campaigns/cmp_1/activity/stream'],
      ['GET', '/api/v1/campaigns/cmp_1/activity'],
      ['GET', '/api/v1/campaigns/cmp_1/candidates'],
      ['POST', '/api/v1/campaigns/cmp_1/discovery/run'],
      ['GET', '/api/v1/campaigns/cmp_1/analytics/summary'],
      ['GET', '/api/v1/campaigns/cmp_1/analytics/timeseries'],
      ['GET', '/api/v1/campaigns/cmp_1/agent/runs'],
      ['GET', '/api/v1/agent-runs/run_1'],
      ['POST', '/api/v1/campaigns/cmp_1/agent/start'],
      ['POST', '/api/v1/campaigns/cmp_1/agent/pause'],
      ['POST', '/api/v1/campaigns/cmp_1/agent/run-now'],
      ['PATCH', '/api/v1/publishers/me'],
      ['GET', '/api/v1/publishers/sites'],
      ['POST', '/api/v1/publishers/sites/site_1/verification'],
      ['POST', '/api/v1/publishers/sites/site_1/verification/check'],
      ['GET', '/api/v1/publishers/slots/slot_1'],
      ['PATCH', '/api/v1/publishers/slots/slot_1'],
      ['POST', '/api/v1/publishers/slots/slot_1/activate'],
      ['POST', '/api/v1/publishers/slots/slot_1/pause'],
      ['GET', '/api/v1/agreements/agr_1'],
      ['GET', '/api/v1/campaigns/cmp_1/agreements'],
      ['POST', '/api/v1/quotes/qte_1/accept-preview'],
      ['POST', '/api/v1/quotes/qte_1/prepare-agreement'],
    ] as const;

    for (const [method, url] of requests) {
      const response = await server.inject({ method, url });
      expect(response.statusCode, `${method} ${url}`).toBe(401);
    }
  });

  it('validates unauthenticated measurement and agent quote inputs without contacting persistence', async () => {
    const server = await app();

    expect(
      (await server.inject({ method: 'POST', url: '/measure/v1/impression', payload: {} })).statusCode,
    ).toBe(400);
    expect((await server.inject({ method: 'GET', url: '/measure/v1/click/invalid' })).statusCode).toBe(400);
    expect((await server.inject({ method: 'POST', url: '/agent/v1/quotes', payload: {} })).statusCode).toBe(
      400,
    );
  });
});
