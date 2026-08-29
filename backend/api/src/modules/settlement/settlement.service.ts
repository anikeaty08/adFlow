import { and, eq } from 'drizzle-orm';
import { agreements, chainTransactions, settlementEpochs, type Database } from '@adflow/db';
import { id } from '@adflow/shared';
import { keccak256, toBytes, type Hash } from 'viem';
import type { SettlementExecutor } from './settlement.executor.js';

export class SettlementService {
  constructor(
    private readonly db: Database,
    private readonly executor: SettlementExecutor,
  ) {}

  async submitEpoch(epochId: string): Promise<Hash> {
    const [epoch] = await this.db
      .select()
      .from(settlementEpochs)
      .where(eq(settlementEpochs.id, epochId))
      .limit(1);
    if (!epoch) throw new Error(`Settlement epoch ${epochId} was not found`);
    if (epoch.chainTxHash) return epoch.chainTxHash as Hash;

    const [agreement] = await this.db
      .select()
      .from(agreements)
      .where(eq(agreements.id, epoch.agreementId))
      .limit(1);
    if (!agreement?.onchainAgreementId)
      throw new Error(`Agreement ${epoch.agreementId} has no on-chain agreement ID`);
    if (!/^\d+$/.test(agreement.onchainAgreementId))
      throw new Error('On-chain agreement ID must be an unsigned integer');

    const epochReference = keccak256(toBytes(epoch.epochKey));
    const evidenceRoot = /^0x[0-9a-fA-F]{64}$/.test(epoch.evidenceRoot)
      ? (epoch.evidenceRoot as `0x${string}`)
      : keccak256(toBytes(epoch.evidenceRoot));
    const hash = await this.executor.submit({
      agreementId: BigInt(agreement.onchainAgreementId),
      verifiedUnits: BigInt(epoch.verifiedUnits),
      epochReference,
      evidenceRoot,
    });

    await this.db.transaction(async (tx) => {
      await tx
        .update(settlementEpochs)
        .set({ chainTxHash: hash, status: 'SUBMITTED' })
        .where(and(eq(settlementEpochs.id, epochId), eq(settlementEpochs.status, 'PREPARED')));
      await tx.insert(chainTransactions).values({
        id: id('tx'),
        chainId: 11142220,
        transactionHash: hash,
        kind: 'SETTLEMENT_SUBMIT',
        entityType: 'SETTLEMENT_EPOCH',
        entityId: epochId,
        status: 'SUBMITTED',
      });
    });
    return hash;
  }
}
