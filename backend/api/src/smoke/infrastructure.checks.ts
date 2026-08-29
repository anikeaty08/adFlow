import { createCeloPublicClient } from '@adflow/chain';
import type { Database } from '@adflow/db';
import type { Config } from '../config.js';
import { ReadinessService } from '../modules/health/readiness.service.js';
import type { SmokeCheck } from './types.js';

export async function checkInfrastructure(config: Config, db: Database): Promise<SmokeCheck[]> {
  const readiness = await new ReadinessService(config, db).check();
  const client = createCeloPublicClient(config.CELO_RPC_URL);

  const [vaultBytecode, settlementBytecode, tokenBytecode] = await Promise.all([
    config.ADFLOW_CAMPAIGN_VAULT_ADDRESS
      ? client.getCode({ address: config.ADFLOW_CAMPAIGN_VAULT_ADDRESS as `0x${string}` })
      : Promise.resolve(undefined),
    config.ADFLOW_SETTLEMENT_ADDRESS
      ? client.getCode({ address: config.ADFLOW_SETTLEMENT_ADDRESS as `0x${string}` })
      : Promise.resolve(undefined),
    client.getCode({ address: config.USDC_TOKEN_ADDRESS as `0x${string}` }),
  ]);

  return [
    {
      name: 'dependencies.ready',
      status: readiness.status === 'ready' ? 'passed' : 'failed',
      details: readiness.dependencies,
    },
    {
      name: 'contracts.deployed',
      status: vaultBytecode && settlementBytecode ? 'passed' : 'failed',
      details: {
        vaultConfigured: Boolean(config.ADFLOW_CAMPAIGN_VAULT_ADDRESS),
        settlementConfigured: Boolean(config.ADFLOW_SETTLEMENT_ADDRESS),
        vaultHasBytecode: Boolean(vaultBytecode),
        settlementHasBytecode: Boolean(settlementBytecode),
      },
    },
    {
      name: 'settlement-token.deployed',
      status: tokenBytecode ? 'passed' : 'failed',
      details: {
        address: config.USDC_TOKEN_ADDRESS,
        hasBytecode: Boolean(tokenBytecode),
        decimals: config.USDC_DECIMALS,
      },
    },
  ];
}
