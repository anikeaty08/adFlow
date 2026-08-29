import { describe, expect, it } from 'vitest';
import { calculateSettlementAmount } from './settlement-calculator.js';

describe('calculateSettlementAmount', () => {
  it('calculates CPC payouts in atomic units', () => {
    const amount = calculateSettlementAmount(40n, 28_000n, 1n);
    expect(amount.payoutAtomic).toBe(1_120_000n);
  });

  it('floors CPM payouts to prevent overpayment', () => {
    const amount = calculateSettlementAmount(1_999n, 10_001n, 1_000n);
    expect(amount.payoutAtomic).toBe(19_991n);
  });

  it('rejects invalid settlement input', () => {
    expect(() => calculateSettlementAmount(1n, 1n, 0n)).toThrow('invalid');
  });
});
