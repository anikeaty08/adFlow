import { z } from 'zod';
const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3001),
    DATABASE_URL: z.string().min(1),
    SESSION_SECRET: z.string().min(32),
    PLACEMENT_TOKEN_SECRET: z.string().min(32),
    CELO_NETWORK: z.enum(['sepolia', 'celo']).default('sepolia'),
    CELO_CHAIN_ID: z.coerce.number().int().positive().default(11142220),
    CELO_RPC_URL: z.url().default('https://forno.celo-sepolia.celo-testnet.org'),
    CELO_BLOCK_EXPLORER: z.url().default('https://celo-sepolia.blockscout.com'),
    USDC_TOKEN_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    USDC_DECIMALS: z.coerce.number().int().min(0).max(36).default(6),
    USDC_FEE_CURRENCY_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    ERC8004_IDENTITY_REGISTRY: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    ERC8004_REPUTATION_REGISTRY: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    ADFLOW_CAMPAIGN_VAULT_ADDRESS: z
      .string()
      .regex(/^0x[a-fA-F0-9]{40}$/)
      .optional(),
    ADFLOW_SETTLEMENT_ADDRESS: z
      .string()
      .regex(/^0x[a-fA-F0-9]{40}$/)
      .optional(),
    CHAIN_WRITE_MODE: z.literal('frontend_wallet').default('frontend_wallet'),
    REDIS_URL: z.url().optional(),
    GROQ_API_KEY: z.string().min(1).optional(),
    GROQ_MODEL: z.string().min(1).default('llama-3.3-70b-versatile'),
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
export const loadConfig = (): Config => schema.parse(process.env);
