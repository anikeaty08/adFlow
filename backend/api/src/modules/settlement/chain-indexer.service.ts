import { and, eq } from 'drizzle-orm';
import { adflowSettlementAbi, campaignVaultAbi, createCeloPublicClient } from '@adflow/chain';
import { chainEventLogs, chainIndexCursors, type Database } from '@adflow/db';
import { decodeEventLog, type Abi, type Address, type Hex } from 'viem';
import type { Config } from '../../config.js';

const FINALITY_BLOCKS = 3n;
const INITIAL_LOOKBACK_BLOCKS = 5_000n;
const BLOCK_RANGE = 1_000n;

type IndexedContract = { address: Address; abi: Abi };

/**
 * Polls AdFlow contracts in bounded, finalized ranges. Each raw chain log has a database primary
 * key of chain/transaction/log-index, so a process retry or a repeated RPC response is harmless.
 */
export class ChainIndexerService {
  private readonly client;

  constructor(
    private readonly config: Config,
    private readonly db: Database,
  ) {
    this.client = createCeloPublicClient(config.CELO_RPC_URL);
  }

  async indexFinalizedLogs() {
    const latestBlock = await this.client.getBlockNumber();
    if (latestBlock <= FINALITY_BLOCKS) return { indexed: 0, contracts: 0 };
    const finalizedBlock = latestBlock - FINALITY_BLOCKS;
    let indexed = 0;
    let contracts = 0;
    for (const contract of this.contracts()) {
      indexed += await this.indexContract(contract, finalizedBlock);
      contracts += 1;
    }
    return { indexed, contracts };
  }

  private contracts(): IndexedContract[] {
    const contracts: IndexedContract[] = [];
    if (this.config.ADFLOW_CAMPAIGN_VAULT_ADDRESS)
      contracts.push({
        address: this.config.ADFLOW_CAMPAIGN_VAULT_ADDRESS as Address,
        abi: campaignVaultAbi,
      });
    if (this.config.ADFLOW_SETTLEMENT_ADDRESS)
      contracts.push({ address: this.config.ADFLOW_SETTLEMENT_ADDRESS as Address, abi: adflowSettlementAbi });
    return contracts;
  }

  private async indexContract(contract: IndexedContract, finalizedBlock: bigint) {
    const [cursor] = await this.db
      .select()
      .from(chainIndexCursors)
      .where(
        and(
          eq(chainIndexCursors.chainId, this.config.CELO_CHAIN_ID),
          eq(chainIndexCursors.contractAddress, contract.address.toLowerCase()),
        ),
      )
      .limit(1);
    const fromBlock = cursor
      ? BigInt(cursor.lastFinalizedBlock) + 1n
      : finalizedBlock > INITIAL_LOOKBACK_BLOCKS
        ? finalizedBlock - INITIAL_LOOKBACK_BLOCKS
        : 0n;
    if (fromBlock > finalizedBlock) return 0;
    const toBlock =
      fromBlock + BLOCK_RANGE - 1n > finalizedBlock ? finalizedBlock : fromBlock + BLOCK_RANGE - 1n;
    const logs = await this.client.getLogs({ address: contract.address, fromBlock, toBlock });
    if (logs.length > 0) {
      await this.db
        .insert(chainEventLogs)
        .values(
          logs.map((log) => ({
            chainId: this.config.CELO_CHAIN_ID,
            transactionHash: log.transactionHash,
            logIndex: Number(log.logIndex),
            blockNumber: Number(log.blockNumber),
            contractAddress: contract.address.toLowerCase(),
            ...this.decode(log.data, log.topics, contract.abi),
          })),
        )
        .onConflictDoNothing();
    }
    await this.db
      .insert(chainIndexCursors)
      .values({
        chainId: this.config.CELO_CHAIN_ID,
        contractAddress: contract.address.toLowerCase(),
        lastFinalizedBlock: Number(toBlock),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [chainIndexCursors.chainId, chainIndexCursors.contractAddress],
        set: { lastFinalizedBlock: Number(toBlock), updatedAt: new Date() },
      });
    return logs.length;
  }

  private decode(data: Hex, topics: readonly Hex[], abi: Abi) {
    try {
      if (!topics[0]) throw new Error('Event log has no signature topic');
      const decoded = decodeEventLog({ abi, data, topics: topics as [Hex, ...Hex[]] });
      return {
        eventName: decoded.eventName ?? 'UNKNOWN',
        args: JSON.parse(
          JSON.stringify(decoded.args, (_key, value) =>
            typeof value === 'bigint' ? value.toString() : value,
          ),
        ) as Record<string, unknown>,
      };
    } catch {
      return { eventName: 'UNKNOWN', args: { data, topics } };
    }
  }
}
