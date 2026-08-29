import {
  createWalletClient,
  http,
  type Address,
  type Hash,
} from 'viem';
import { privateKeyToAccount, type PrivateKeyAccount } from 'viem/accounts';
import { adflowSettlementAbi, celoSepolia } from '@adflow/chain';
import type { Config } from '../../config.js';

export type SettlementSubmission = {
  agreementId: bigint;
  verifiedUnits: bigint;
  epochReference: `0x${string}`;
  evidenceRoot: `0x${string}`;
};

export interface SettlementExecutor {
  submit(input: SettlementSubmission): Promise<Hash>;
}

/** The only backend signer: a narrowly-scoped settlement operator account. */
export class ViemSettlementExecutor implements SettlementExecutor {
  private readonly client;
  private readonly account: PrivateKeyAccount;

  constructor(private readonly config: Config) {
    if (!config.SETTLEMENT_OPERATOR_PRIVATE_KEY) {
      throw new Error('SETTLEMENT_OPERATOR_PRIVATE_KEY is required for settlement submission');
    }
    if (!config.ADFLOW_SETTLEMENT_ADDRESS) {
      throw new Error('ADFLOW_SETTLEMENT_ADDRESS is required for settlement submission');
    }
    this.account = privateKeyToAccount(config.SETTLEMENT_OPERATOR_PRIVATE_KEY as `0x${string}`);
    this.client = createWalletClient({ account: this.account, chain: celoSepolia, transport: http(config.CELO_RPC_URL) });
  }

  submit(input: SettlementSubmission): Promise<Hash> {
    return this.client.writeContract({
      address: this.config.ADFLOW_SETTLEMENT_ADDRESS as Address,
      abi: adflowSettlementAbi,
      functionName: 'settleEpoch',
      args: [input.agreementId, input.verifiedUnits, input.epochReference, input.evidenceRoot],
      account: this.account,
    });
  }
}
