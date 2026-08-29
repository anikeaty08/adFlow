import { sql } from 'drizzle-orm';
import { createCeloPublicClient } from '@adflow/chain';
import { Redis } from 'ioredis';
import type { Database } from '@adflow/db';
import type { Config } from '../../config.js';
import { hasDeployedBytecode } from './chain-deployment.js';

type DependencyStatus = 'ok' | 'unavailable' | 'skipped';

/**
 * Runs bounded, read-only dependency probes. A readiness response is deliberately separate
 * from liveness: a running HTTP process is not ready if its canonical database or Celo RPC
 * cannot be reached.
 */
export class ReadinessService {
  constructor(
    private readonly config: Config,
    private readonly db: Database,
  ) {}

  async check() {
    const [database, celo, redis, economicContracts] = await Promise.all([
      this.checkDatabase(),
      this.checkCelo(),
      this.checkRedis(),
      this.checkEconomicContracts(),
    ]);
    const dependencies = { database, celo, redis, economicContracts };
    const ready = Object.values(dependencies).every((status) => status !== 'unavailable');

    return {
      status: ready ? 'ready' : 'degraded',
      chain: this.config.CELO_NETWORK,
      dependencies,
    };
  }

  private async checkDatabase(): Promise<DependencyStatus> {
    if (typeof this.db.execute !== 'function') return 'skipped';
    try {
      await this.db.execute(sql`select 1`);
      return 'ok';
    } catch {
      return 'unavailable';
    }
  }

  private async checkCelo(): Promise<DependencyStatus> {
    try {
      const chainId = await createCeloPublicClient(this.config.CELO_RPC_URL).getChainId();
      return chainId === this.config.CELO_CHAIN_ID ? 'ok' : 'unavailable';
    } catch {
      return 'unavailable';
    }
  }

  /**
   * A healthy RPC alone is insufficient for AdFlow. The API must not advertise readiness when
   * its configured settlement currency or either financial contract is missing on that RPC.
   * Test environments may intentionally omit deployment addresses and report this as skipped.
   */
  private async checkEconomicContracts(): Promise<DependencyStatus> {
    if (!this.config.ADFLOW_CAMPAIGN_VAULT_ADDRESS || !this.config.ADFLOW_SETTLEMENT_ADDRESS) {
      return this.config.NODE_ENV === 'test' ? 'skipped' : 'unavailable';
    }

    try {
      const client = createCeloPublicClient(this.config.CELO_RPC_URL);
      const [vault, settlement, token] = await Promise.all([
        client.getCode({ address: this.config.ADFLOW_CAMPAIGN_VAULT_ADDRESS as `0x${string}` }),
        client.getCode({ address: this.config.ADFLOW_SETTLEMENT_ADDRESS as `0x${string}` }),
        client.getCode({ address: this.config.USDC_TOKEN_ADDRESS as `0x${string}` }),
      ]);
      return [vault, settlement, token].every(hasDeployedBytecode) ? 'ok' : 'unavailable';
    } catch {
      return 'unavailable';
    }
  }

  private async checkRedis(): Promise<DependencyStatus> {
    const endpoint = this.config.REDIS_URL ?? this.config.UPSTASH_REDIS_REST_URL;
    if (!endpoint) return 'skipped';
    try {
      if (endpoint.startsWith('http')) return this.checkUpstash(endpoint);
      const client = new Redis(endpoint, { connectTimeout: 3_000, maxRetriesPerRequest: 0 });
      const result = await client.ping();
      await client.quit();
      return result === 'PONG' ? 'ok' : 'unavailable';
    } catch {
      return 'unavailable';
    }
  }

  private async checkUpstash(endpoint: string): Promise<DependencyStatus> {
    if (!this.config.UPSTASH_REDIS_REST_TOKEN) return 'unavailable';
    const result = await fetch(endpoint.replace(/\/$/, ''), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.UPSTASH_REDIS_REST_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['PING']),
      signal: AbortSignal.timeout(3_000),
    });
    if (!result.ok) return 'unavailable';
    const body = (await result.json()) as { result?: string };
    return body.result === 'PONG' ? 'ok' : 'unavailable';
  }
}
