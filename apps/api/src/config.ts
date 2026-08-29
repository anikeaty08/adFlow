import { z } from 'zod';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

dotenv.config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)) });
const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3001),
    CORS_ORIGINS: z.string().default('http://localhost:3000'),
    DATABASE_URL: z.string().min(1),
    SESSION_SECRET: z.string().min(32),
    PLACEMENT_TOKEN_SECRET: z.string().min(32),
    CELO_NETWORK: z.enum(['sepolia', 'celo']).default('sepolia'),
    CELO_CHAIN_ID: z.coerce.number().int().positive().default(11142220),
    CELO_RPC_URL: z.url().default('https://forno.celo-sepolia.celo-testnet.org'),
    CELO_BLOCK_EXPLORER: z.url().default('https://celo-sepolia.blockscout.com'),
    USDC_TOKEN_ADDRESS: z
      .string()
      .regex(/^0x[a-fA-F0-9]{40}$/)
      .default('0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B'),
    USDC_DECIMALS: z.coerce.number().int().min(0).max(36).default(6),
    USDC_FEE_CURRENCY_ADDRESS: z
      .string()
      .regex(/^0x[a-fA-F0-9]{40}$/)
      .default('0x4822e58de6f5e485eF90df51C41CE01721331dC0'),
    ERC8004_IDENTITY_REGISTRY: z
      .string()
      .regex(/^0x[a-fA-F0-9]{40}$/)
      .default('0x8004A818BFB912233c491871b3d84c89A494BD9E'),
    ERC8004_REPUTATION_REGISTRY: z
      .string()
      .regex(/^0x[a-fA-F0-9]{40}$/)
      .default('0x8004B663056A597Dffe9eCcC1965A193B7388713'),
    ADFLOW_CAMPAIGN_VAULT_ADDRESS: z
      .string()
      .regex(/^0x[a-fA-F0-9]{40}$/)
      .optional(),
    ADFLOW_SETTLEMENT_ADDRESS: z
      .string()
      .regex(/^0x[a-fA-F0-9]{40}$/)
      .optional(),
    SETTLEMENT_OPERATOR_PRIVATE_KEY: z
      .string()
      .regex(/^0x[0-9a-fA-F]{64}$/)
      .optional(),
    CHAIN_WRITE_MODE: z.literal('frontend_wallet').default('frontend_wallet'),
    REDIS_URL: z.url().optional(),
    UPSTASH_REDIS_REST_URL: z.url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
    OPENAI_API_KEY: z.string().min(1).optional(),
    OPENAI_MODEL: z.literal('gpt-4o-mini').default('gpt-4o-mini'),
    MEM0_API_KEY: z.string().min(1).optional(),
    MEMO_API_KEY: z.string().min(1).optional(),
    MEM0_BASE_URL: z.url().default('https://api.mem0.ai'),
    X402_FACILITATOR_URL: z.url().optional(),
    MAINNET_ENABLED: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
    STRICT_POLICY_MODE: z
      .enum(['true', 'false'])
      .default('true')
      .transform((v) => v === 'true'),
    CLOUDINARY_CLOUD_NAME: z.string().optional(),
    CLOUDINARY_API_KEY: z.string().optional(),
    CLOUDINARY_API_SECRET: z.string().optional(),
    CLOUDINARY_FOLDER: z.string().default('adflow/creatives'),
  })
  .superRefine((v, ctx) => {
    if (v.CELO_NETWORK === 'sepolia' && v.CELO_CHAIN_ID !== 11142220)
      ctx.addIssue({ code: 'custom', message: 'Celo Sepolia requires chain ID 11142220' });
    if (v.CELO_NETWORK === 'celo' && !v.MAINNET_ENABLED)
      ctx.addIssue({ code: 'custom', message: 'CELO_NETWORK=celo requires MAINNET_ENABLED=true' });
    if (v.CELO_NETWORK === 'celo' && !v.STRICT_POLICY_MODE)
      ctx.addIssue({ code: 'custom', message: 'Mainnet requires STRICT_POLICY_MODE=true' });
  });
export type Config = z.infer<typeof schema>;
export const loadConfig = (): Config => {
  const rawNetwork = process.env.CELO_NETWORK?.toLowerCase();
  const normalizedNetwork = rawNetwork === 'celosepolia' ? 'sepolia' : rawNetwork;
  const rawOperatorKey = process.env.SETTLEMENT_OPERATOR_PRIVATE_KEY;
  const normalizedOperatorKey =
    rawOperatorKey && !rawOperatorKey.startsWith('0x') ? `0x${rawOperatorKey}` : rawOperatorKey;
  const environment = {
    ...process.env,
    SESSION_SECRET: process.env.SESSION_SECRET ?? randomBytes(32).toString('hex'),
    PLACEMENT_TOKEN_SECRET: process.env.PLACEMENT_TOKEN_SECRET ?? randomBytes(32).toString('hex'),
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? process.env.OPEN_AI_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ?? process.env.CLOUDINARY_SECCRET_KEY,
    REDIS_URL: process.env.REDIS_URL,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    CELO_NETWORK: normalizedNetwork,
    SETTLEMENT_OPERATOR_PRIVATE_KEY: normalizedOperatorKey,
    MEM0_API_KEY: process.env.MEM0_API_KEY ?? process.env.MEMO_API_KEY,
    MEMO_API_KEY: process.env.MEMO_API_KEY,
    MEM0_BASE_URL: process.env.MEM0_BASE_URL,
  };
  const parsed = schema.parse(environment);
  if (!parsed.REDIS_URL && parsed.UPSTASH_REDIS_REST_URL && parsed.UPSTASH_REDIS_REST_TOKEN) {
    const redisHost = new URL(parsed.UPSTASH_REDIS_REST_URL).hostname;
    parsed.REDIS_URL = `rediss://default:${encodeURIComponent(parsed.UPSTASH_REDIS_REST_TOKEN)}@${redisHost}:6379`;
  }
  return parsed;
};
