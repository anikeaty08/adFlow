import { describe, expect, it } from 'vitest';
import { AgreementPolicyService } from './policy.service.js';

const policy = new AgreementPolicyService();
const valid = {
  campaignStatus: 'ACTIVE',
  campaignBudgetAtomic: '1000000',
  maxUnitPriceAtomic: '50000',
  quoteRateAtomic: '40000',
  quoteAllocationAtomic: '500000',
  quoteExpiresAt: new Date(Date.now() + 60_000),
  campaignEndsAt: new Date(Date.now() + 120_000),
};

describe('AgreementPolicyService', () => {
  it('allows a spendable campaign and compliant quote', () =>
    expect(policy.evaluate(valid)).toEqual({ decision: 'ALLOW', reasonCodes: [] }));
  it('denies an over-budget or overpriced quote', () =>
    expect(
      policy.evaluate({ ...valid, quoteRateAtomic: '50001', quoteAllocationAtomic: '1000001' }).reasonCodes,
    ).toEqual(expect.arrayContaining(['MAX_UNIT_PRICE_EXCEEDED', 'BUDGET_EXCEEDED'])));
  it('denies an expired quote', () =>
    expect(policy.evaluate({ ...valid, quoteExpiresAt: new Date(Date.now() - 1) }).reasonCodes).toContain(
      'QUOTE_EXPIRED',
    ));
});
