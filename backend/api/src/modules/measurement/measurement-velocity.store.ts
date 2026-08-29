import { createHash } from 'node:crypto';
import { Redis } from 'ioredis';
import type { Config } from '../../config.js';

export type MeasurementVelocity = {
  eventsFromIpInMinute: number;
  eventsFromSessionInMinute: number;
  repeatClickCount: number;
};

export interface MeasurementVelocityStore {
  record(input: {
    eventType: 'IMPRESSION' | 'CLICK';
    placementToken: string;
    ipAddress: string;
  }): Promise<MeasurementVelocity>;
}

const oneMinuteSeconds = 60;

/**
 * Measurement rate signals are held only in ephemeral Redis keys. Raw network addresses and
 * placement tokens are hashed before use and are never persisted in PostgreSQL.
 */
export class RedisMeasurementVelocityStore implements MeasurementVelocityStore {
  private readonly client: Redis;

  constructor(redisUrl: string) {
    this.client = new Redis(redisUrl, { maxRetriesPerRequest: 1, connectTimeout: 3_000 });
  }

  async record(input: {
    eventType: 'IMPRESSION' | 'CLICK';
    placementToken: string;
    ipAddress: string;
  }): Promise<MeasurementVelocity> {
    const keys = measurementVelocityKeys(input);
    const [session, ip, repeatClick] = await Promise.all([
      this.increment(keys.session),
      this.increment(keys.ip),
      input.eventType === 'CLICK' ? this.increment(keys.repeatClick) : Promise.resolve(0),
    ]);

    return {
      eventsFromSessionInMinute: session,
      eventsFromIpInMinute: ip,
      repeatClickCount: repeatClick,
    };
  }

  private async increment(key: string) {
    const count = await this.client.incr(key);
    if (count === 1) await this.client.expire(key, oneMinuteSeconds);
    return count;
  }
}

export class UpstashMeasurementVelocityStore implements MeasurementVelocityStore {
  constructor(
    private readonly endpoint: string,
    private readonly token: string,
  ) {}

  async record(input: {
    eventType: 'IMPRESSION' | 'CLICK';
    placementToken: string;
    ipAddress: string;
  }): Promise<MeasurementVelocity> {
    const keys = measurementVelocityKeys(input);
    const [session, ip, repeatClick] = await Promise.all([
      this.increment(keys.session),
      this.increment(keys.ip),
      input.eventType === 'CLICK' ? this.increment(keys.repeatClick) : Promise.resolve(0),
    ]);

    return {
      eventsFromSessionInMinute: session,
      eventsFromIpInMinute: ip,
      repeatClickCount: repeatClick,
    };
  }

  private async increment(key: string) {
    const response = await fetch(this.endpoint.replace(/\/$/, ''), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['INCR', key]),
      signal: AbortSignal.timeout(3_000),
    });
    if (!response.ok) throw new Error(`Upstash measurement counter failed with HTTP ${response.status}`);
    const body = (await response.json()) as { result?: number };
    const count = Number(body.result);
    if (!Number.isInteger(count) || count < 1)
      throw new Error('Upstash returned an invalid measurement counter.');
    if (count === 1) await this.expire(key);
    return count;
  }

  private async expire(key: string) {
    const response = await fetch(this.endpoint.replace(/\/$/, ''), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['EXPIRE', key, oneMinuteSeconds]),
      signal: AbortSignal.timeout(3_000),
    });
    if (!response.ok) throw new Error(`Upstash measurement expiry failed with HTTP ${response.status}`);
  }
}

export class UnavailableMeasurementVelocityStore implements MeasurementVelocityStore {
  async record(_input: {
    eventType: 'IMPRESSION' | 'CLICK';
    placementToken: string;
    ipAddress: string;
  }): Promise<MeasurementVelocity> {
    throw new Error('No Redis or Upstash connection is configured for measurement velocity checks.');
  }
}

export function createMeasurementVelocityStore(config: Config): MeasurementVelocityStore {
  if (config.REDIS_URL) return new RedisMeasurementVelocityStore(config.REDIS_URL);
  if (config.UPSTASH_REDIS_REST_URL && config.UPSTASH_REDIS_REST_TOKEN)
    return new UpstashMeasurementVelocityStore(
      config.UPSTASH_REDIS_REST_URL,
      config.UPSTASH_REDIS_REST_TOKEN,
    );
  return new UnavailableMeasurementVelocityStore();
}

function measurementVelocityKeys(input: {
  eventType: 'IMPRESSION' | 'CLICK';
  placementToken: string;
  ipAddress: string;
}) {
  const minute = Math.floor(Date.now() / 60_000);
  const tokenHash = sha256(input.placementToken);
  const ipHash = sha256(input.ipAddress);
  const prefix = `adflow:measurement:v1:${minute}`;

  return {
    session: `${prefix}:session:${tokenHash}`,
    ip: `${prefix}:ip:${ipHash}`,
    repeatClick: `${prefix}:click:${tokenHash}:${ipHash}`,
  };
}

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}
