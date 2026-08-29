import { DomainError } from '@adflow/shared';

export type AgreementPolicyInput = {
  campaignStatus: string;
  campaignBudgetAtomic: string;
  maxUnitPriceAtomic: string;
  quoteRateAtomic: string;
  quoteAllocationAtomic: string;
  quoteExpiresAt: Date;
  campaignEndsAt: Date;
};

/** The policy engine is deterministic. It never accepts model output as a financial fact. */
export class AgreementPolicyService {
  evaluate(input: AgreementPolicyInput) {
    const reasons: string[] = [];
    if (!['FUNDED', 'DISCOVERING', 'ACTIVE'].includes(input.campaignStatus))
      reasons.push('CAMPAIGN_NOT_SPENDABLE');
    if (BigInt(input.quoteRateAtomic) > BigInt(input.maxUnitPriceAtomic))
      reasons.push('MAX_UNIT_PRICE_EXCEEDED');
    if (BigInt(input.quoteAllocationAtomic) > BigInt(input.campaignBudgetAtomic))
      reasons.push('BUDGET_EXCEEDED');
    if (input.quoteExpiresAt <= new Date()) reasons.push('QUOTE_EXPIRED');
    if (input.campaignEndsAt <= new Date()) reasons.push('CAMPAIGN_ENDED');
    return { decision: reasons.length === 0 ? ('ALLOW' as const) : ('DENY' as const), reasonCodes: reasons };
  }

  requireAllowed(input: AgreementPolicyInput) {
    const decision = this.evaluate(input);
    if (decision.decision === 'DENY')
      throw new DomainError('POLICY_DENIED', 'The placement agreement violates campaign policy.', {
        reasonCodes: decision.reasonCodes,
      });
    return decision;
  }
}
