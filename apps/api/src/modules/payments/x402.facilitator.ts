import { createHash } from 'node:crypto';
import { DomainError } from '@adflow/shared';

export type X402Payment = {
  paymentId: string;
  payer: string;
  payee: string;
  token: string;
  amountAtomic: string;
  chainId: number;
  idempotencyKey: string;
  proof: string;
};

export interface X402Facilitator {
  verifyPayment(
    payment: X402Payment,
    expected: Pick<X402Payment, 'payee' | 'token' | 'amountAtomic' | 'chainId' | 'idempotencyKey'>,
  ): Promise<void>;
  settlePayment(payment: X402Payment): Promise<{ transactionHash: string }>;
}

/** Strict x402 boundary. It is intentionally provider-neutral and never handles ad settlement. */
export class HostedX402Facilitator implements X402Facilitator {
  constructor(private readonly facilitatorUrl: string) {}

  async verifyPayment(
    payment: X402Payment,
    expected: Pick<X402Payment, 'payee' | 'token' | 'amountAtomic' | 'chainId' | 'idempotencyKey'>,
  ) {
    if (payment.payee.toLowerCase() !== expected.payee.toLowerCase())
      throw new DomainError('X402_PAYEE_MISMATCH', 'x402 payee mismatch.');
    if (payment.token.toLowerCase() !== expected.token.toLowerCase())
      throw new DomainError('X402_TOKEN_MISMATCH', 'x402 token mismatch.');
    if (payment.amountAtomic !== expected.amountAtomic || payment.chainId !== expected.chainId)
      throw new DomainError('X402_PAYMENT_MISMATCH', 'x402 amount or chain mismatch.');
    if (payment.idempotencyKey !== expected.idempotencyKey)
      throw new DomainError('X402_IDEMPOTENCY_MISMATCH', 'x402 idempotency key mismatch.');

    const response = await fetch(`${this.facilitatorUrl}/verify`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payment),
    });
    if (!response.ok) throw new DomainError('X402_PAYMENT_INVALID', 'x402 payment verification failed.');
  }

  async settlePayment(payment: X402Payment) {
    const response = await fetch(`${this.facilitatorUrl}/settle`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payment),
    });
    if (!response.ok) throw new DomainError('X402_SETTLEMENT_FAILED', 'x402 payment settlement failed.');
    const body = (await response.json()) as { transactionHash?: string };
    if (!body.transactionHash)
      throw new DomainError('X402_RECEIPT_INVALID', 'x402 facilitator returned no transaction hash.');
    return { transactionHash: body.transactionHash };
  }
}

export function paymentFingerprint(payment: X402Payment) {
  return createHash('sha256').update(JSON.stringify(payment)).digest('hex');
}
