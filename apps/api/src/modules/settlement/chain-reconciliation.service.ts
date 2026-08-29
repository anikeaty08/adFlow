import { and, eq, isNull } from 'drizzle-orm';
import { createCeloPublicClient } from '@adflow/chain';
import { chainTransactions, settlementEpochs, type Database } from '@adflow/db';
import type { Config } from '../../config.js';

/**
 * Reconciles transactions submitted by AdFlow with final Celo receipts. It never infers
 * payment truth from an agent result: only a mined receipt can confirm a submitted settlement.
 */
export class ChainReconciliationService {
  private readonly client;

  constructor(
    private readonly config: Config,
    private readonly db: Database,
  ) {
    this.client = createCeloPublicClient(config.CELO_RPC_URL);
  }

  async reconcileSubmitted(limit = 50) {
    const transactions = await this.db
      .select()
      .from(chainTransactions)
      .where(
        and(
          eq(chainTransactions.chainId, this.config.CELO_CHAIN_ID),
          eq(chainTransactions.status, 'SUBMITTED'),
          isNull(chainTransactions.confirmedAt),
        ),
      )
      .limit(limit);

    let confirmed = 0;
    let failed = 0;
    for (const transaction of transactions) {
      const receipt = await this.client
        .getTransactionReceipt({
          hash: transaction.transactionHash as `0x${string}`,
        })
        .catch(() => null);
      if (!receipt) continue;

      const successful = receipt.status === 'success';
      await this.db
        .update(chainTransactions)
        .set({
          status: successful ? 'CONFIRMED' : 'FAILED',
          blockNumber: Number(receipt.blockNumber),
          confirmedAt: new Date(),
          failureReason: successful ? null : 'Celo transaction reverted.',
        })
        .where(eq(chainTransactions.id, transaction.id));
      if (transaction.entityType === 'SETTLEMENT_EPOCH') {
        await this.db
          .update(settlementEpochs)
          .set({
            status: successful ? 'CONFIRMED' : 'FAILED',
            confirmedAt: successful ? new Date() : null,
          })
          .where(eq(settlementEpochs.id, transaction.entityId));
      }
      if (successful) confirmed += 1;
      else failed += 1;
    }
    return { scanned: transactions.length, confirmed, failed };
  }
}
