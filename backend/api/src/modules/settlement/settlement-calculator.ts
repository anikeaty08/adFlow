import { DomainError } from '@adflow/shared';

export type SettlementAmount = {
  verifiedUnits: bigint;
  rateAtomic: bigint;
  unitScale: bigint;
  payoutAtomic: bigint;
};

/**
 * Contracts use floor division for settlement. Keeping the same formula here
 * provides a deterministic pre-flight check without replacing chain authority.
 */
export function calculateSettlementAmount(
  verifiedUnits: bigint,
  rateAtomic: bigint,
  unitScale: bigint,
): SettlementAmount {
  if (verifiedUnits < 0n || rateAtomic < 0n || unitScale <= 0n) {
    throw new DomainError('INVALID_SETTLEMENT_INPUT', 'Settlement units, rate, and scale are invalid.');
  }

  return {
    verifiedUnits,
    rateAtomic,
    unitScale,
    payoutAtomic: (verifiedUnits * rateAtomic) / unitScale,
  };
}
