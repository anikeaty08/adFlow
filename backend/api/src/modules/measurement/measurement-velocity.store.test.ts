import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  UnavailableMeasurementVelocityStore,
  UpstashMeasurementVelocityStore,
} from './measurement-velocity.store.js';

describe('measurement velocity stores', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('fails closed when no rate-signal backend is configured', async () => {
    const store = new UnavailableMeasurementVelocityStore();

    await expect(
      store.record({ eventType: 'IMPRESSION', placementToken: 'token', ipAddress: '127.0.0.1' }),
    ).rejects.toThrow('No Redis or Upstash connection');
  });

  it('records short-lived hashed counters through Upstash', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ result: 1 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ result: 1 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ result: 1 }), { status: 200 }))
      .mockResolvedValue(new Response(JSON.stringify({ result: 1 }), { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    const store = new UpstashMeasurementVelocityStore('https://redis.example', 'secret');

    const result = await store.record({
      eventType: 'CLICK',
      placementToken: 'placement-token',
      ipAddress: '203.0.113.1',
    });

    expect(result).toEqual({ eventsFromSessionInMinute: 1, eventsFromIpInMinute: 1, repeatClickCount: 1 });
    expect(fetch).toHaveBeenCalledTimes(6);
    expect(JSON.stringify(fetch.mock.calls)).not.toContain('placement-token');
    expect(JSON.stringify(fetch.mock.calls)).not.toContain('203.0.113.1');
  });
});
