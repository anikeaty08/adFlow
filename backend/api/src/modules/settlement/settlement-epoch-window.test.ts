import { describe, expect, it } from 'vitest';
import { settlementEpochWindow } from './settlement-epoch-window.js';

describe('settlementEpochWindow', () => {
  it('uses one stable fifteen-minute settlement window for nearby events', () => {
    const first = settlementEpochWindow('agr_1', new Date('2026-08-29T10:07:00.000Z'));
    const second = settlementEpochWindow('agr_1', new Date('2026-08-29T10:14:59.999Z'));

    expect(first).toEqual(second);
    expect(first.windowStart.toISOString()).toBe('2026-08-29T10:00:00.000Z');
    expect(first.windowEnd.toISOString()).toBe('2026-08-29T10:15:00.000Z');
  });

  it('separates the next agreement window', () => {
    const first = settlementEpochWindow('agr_1', new Date('2026-08-29T10:14:59.999Z'));
    const next = settlementEpochWindow('agr_1', new Date('2026-08-29T10:15:00.000Z'));

    expect(first.epochKey).not.toBe(next.epochKey);
  });
});
