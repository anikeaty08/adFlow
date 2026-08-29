# AdFlow Backend

AdFlow is a single deployable TypeScript backend for a Celo-native agent advertising marketplace. Advertisers define an objective and hard limits; the Campaign Agent can propose bounded actions; deterministic policy, PostgreSQL, and Celo contracts decide what is actually allowed.

The backend is a modular monolith. It has one HTTP process and one deployment target, while keeping transport, domain rules, persistence, workers, contracts, and chain clients in distinct readable modules.

## Guarantees

- User-owned blockchain writes are prepared by the API and signed by the frontend wallet.
- The model never receives a private key, wallet client, transaction sender, or unrestricted tool.
- The settlement operator can only submit deterministic settlement epochs to the AdFlow settlement contract.
- Campaign Vault and Settlement contracts enforce ownership, allocation budgets, rate caps, replay protection, and claim accounting on-chain.
- PostgreSQL is canonical for application and financial workflow state. Redis is operational only.
- Mem0 provides contextual hints only. It never supplies balances, payment truth, contract state, or authorization.
- Every public input is validated, authenticated where required, rate limited, and represented in an audit-friendly data model.

## Repository Layout

```text
backend/
├── api/                         # The one Fastify runtime and every HTTP/worker module
│   └── src/
│       ├── modules/             # Domain modules; route → service → repository
│       │   ├── auth/ campaigns/ publishers/ quotes/ agreements/
│       │   ├── measurement/ settlement/ agents/ outbox/ activity/
│       │   └── public/ creatives/ embed/ health/ operations/
│       ├── shared/              # HTTP response and authentication helpers
│       ├── smoke/               # Safe real-integration smoke checks
│       ├── app.ts               # Fastify composition only
│       └── server.ts            # Process lifecycle only
└── packages/
    ├── shared/                  # Cross-domain schemas, errors, crypto helpers
    ├── db/                      # Drizzle schema, migrations, database factory
    ├── chain/                   # Celo client, generated contract ABIs, typed calldata
    ├── agent-core/              # LangGraph state graphs and proposal contracts
    └── contracts/               # Solidity, Hardhat tests, deploy/export scripts
```

`backend/api` is the only runnable application. The internal packages are compile-time and ownership boundaries, not separately deployed services.

## Architecture

```text
Frontend wallet ── signed user writes ──► Celo Sepolia
       │                                      ▲
       ▼                                      │ settlement epochs only
Fastify modular monolith ─────────────────────┘
       │
       ├── PostgreSQL / Neon: canonical state, audit records, epochs, outbox
       ├── Redis / Upstash: queues, locks, retry scheduling, rate limiting
       ├── LangGraph: durable Campaign and Publisher workflow state
       ├── OpenAI GPT-4o mini: bounded structured planning only
       ├── Mem0: scoped, non-financial long-term context
       ├── Cloudinary: direct creative uploads and trusted metadata
       └── Celo Sepolia: CampaignVault and AdFlowSettlement enforcement
```

Workers start inside the same backend process: campaign wakeups, measurement verification, settlement aggregation and submission, receipt reconciliation, chain indexing, and transactional-outbox delivery. This is one deployment, not independent services.

## Celo Deployment

The configured network is Celo Sepolia, chain ID `11142220`.

| Contract | Address |
| --- | --- |
| Campaign Vault | `0xea23F3cDde445305C294Be070BFfbb7475d93C50` |
| Settlement | `0xb245E1d7377Ffc1306Ca0e56c82DBDB7081b0796` |

Compiler-generated ABIs are at `backend/packages/chain/src/abis/`. The deployment manifest is at `backend/packages/contracts/deployments/celoSepolia.json`. Never hand-maintain production ABI files; run `pnpm --filter @adflow/contracts export-abi` after a deployment.

## Required Configuration

Copy `.env.example` to `.env`. Never commit `.env` or print its secrets.

```env
# Runtime
NODE_ENV=development
PORT=3001
CORS_ORIGINS=http://localhost:3000

# Canonical state and queue infrastructure
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
# Or use both Upstash settings instead of REDIS_URL
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# At least 32 characters each
SESSION_SECRET=...
PLACEMENT_TOKEN_SECRET=...

# Celo Sepolia
CELO_NETWORK=sepolia
CELO_CHAIN_ID=11142220
CELO_RPC_URL=https://forno.celo-sepolia.celo-testnet.org
CELO_BLOCK_EXPLORER=https://celo-sepolia.blockscout.com
USDC_TOKEN_ADDRESS=0x...
USDC_DECIMALS=6
ADFLOW_CAMPAIGN_VAULT_ADDRESS=0xea23F3cDde445305C294Be070BFfbb7475d93C50
ADFLOW_SETTLEMENT_ADDRESS=0xb245E1d7377Ffc1306Ca0e56c82DBDB7081b0796
CHAIN_WRITE_MODE=frontend_wallet
MAINNET_ENABLED=false
STRICT_POLICY_MODE=true

# Server-only integrations
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4.1
MEM0_API_KEY=...
# MEMO_API_KEY is supported as a compatibility alias.
MEM0_BASE_URL=https://api.mem0.ai
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Never expose these to a browser or prompt
DEPLOYER_PRIVATE_KEY=0x...
SETTLEMENT_OPERATOR_PRIVATE_KEY=0x...
```

The deployer key is used only by the deployment command. The settlement key is only used for `settleEpoch`; it cannot withdraw campaign funds or claim publisher balances.

## Local Development

```powershell
pnpm install
pnpm db:migrate
pnpm dev
```

For local infrastructure instead of Neon and Upstash:

```powershell
docker compose up -d
```

The API listens on `http://localhost:3001` by default.

## API Surface

All application endpoints return a consistent `{ data, meta }` shape. Protected endpoints require the signed wallet-session cookie established through the auth flow.

| Area | Main routes |
| --- | --- |
| Health | `GET /health/live`, `GET /health/ready` |
| Wallet authentication | `POST /api/v1/auth/nonce`, `POST /api/v1/auth/verify`, `POST /api/v1/auth/logout` |
| Campaigns | `/api/v1/campaigns`, funding sync, prepared funding/pause/resume/end calls |
| Creatives | `/api/v1/creatives/upload-signature`, `/api/v1/creatives` |
| Publishers | `/api/v1/publishers`, sites, slots, site verification |
| Quotes and agreements | `/agent/v1/quotes`, campaign quotes, agreement previews and typed chain calls |
| Public embed | public slots, placements, signed placement tokens, click redirect |
| Measurement | `/measure/v1/impression`, `/measure/v1/click` |
| Agent control | campaign wake/start/run-now/pause, runs, activity |
| Activity | history and `GET /api/v1/campaigns/:campaignId/activity/stream` SSE |

Public agent metadata is available at `/.well-known/agent.json`; the capabilities document is at `/agent/v1/capabilities`.

## Agent System

`backend/packages/agent-core` owns the LangGraph state machines. Each Campaign Agent run loads canonical campaign state, retrieves scoped Mem0 hints, observes candidates and quotes, proposes a bounded action, passes it through policy, and records a durable decision receipt.

The model boundary is deliberate:

1. OpenAI GPT-4o mini receives a compact observation and immutable system policy.
2. It returns one strict JSON proposal: quote request, agreement preparation, allocation pause, or no action.
3. The policy engine rechecks campaign status, categories, token, price cap, reputation requirement, allocation, and approval limits.
4. Typed executors use canonical data and contracts. The model cannot submit a transaction.

Mem0 is searched with advertiser, agent, and campaign scope. It may remember durable preferences such as technical-audience affinity. It must never store or override balances, verified measurements, agreement economics, keys, authorization, or on-chain state.

## Financial and Measurement Flow

```text
Browser embed
  → validates a signed placement token
  → appends an idempotent measurement event
  → deterministic verification accepts, rejects, or flags it
  → settlement aggregation locks eligible events in PostgreSQL
  → settlement worker submits verified units and evidence hash
  → contract calculates payout from accepted agreement rate
  → publisher signs their own claim transaction
```

The backend never chooses an arbitrary payout value:

```text
verifiedUnits × agreementRate ÷ unitScale
```

## Security Controls

- Strict CORS allow-list, security headers, 1 MB body cap, and route rate limits.
- Zod validation at every transport boundary.
- EIP-191 wallet authentication with nonce replay prevention.
- Signed quote validation and publisher quote-nonce uniqueness.
- Signed placement tokens, semantic deduplication, and append-only measurement records.
- Prepared calldata for frontend-wallet writes; no user private key on the server.
- Chain-indexing finality window, idempotent event storage, receipt reconciliation, and transactional outbox.
- Prompt-injection containment: external observations and memories are explicitly untrusted.

## Commands

```powershell
# Quality
pnpm format:check
pnpm typecheck
pnpm test

# Database
pnpm db:migrate

# Contracts
pnpm contracts:compile
pnpm contracts:test
pnpm --filter @adflow/contracts deploy:celo-sepolia
pnpm --filter @adflow/contracts export-abi

# Real configured integration checks; this never sends a transaction
pnpm smoke:testnet
```

`pnpm smoke:testnet` checks Neon/Postgres, Redis or Upstash, Celo chain ID, deployed AdFlow contract bytecode, configured settlement-token bytecode, OpenAI structured planning on normal and adversarial input, and Mem0 retrieval. It exits non-zero if any required dependency is unsafe or unavailable.

It deliberately does not fund a campaign, submit a settlement, or claim tokens. Those actions require a user signature or a valid authorized settlement job with verified delivery data.

## Testing Standard

Before a pull request is ready, run:

```powershell
pnpm format:check
pnpm typecheck
pnpm test
pnpm contracts:test
pnpm smoke:testnet
```

Unit tests cover deterministic policy, verification, settlement arithmetic/windows, transactional outbox behavior, agent graphs, prompt boundaries, route authorization, and smoke-report behavior. The smoke suite exercises configured live dependencies without leaking secrets or moving funds.

## Deployment

Build and deploy only `backend/api`. Supply all secrets through the deployment environment; do not bake `.env` into an image.

- `/health/live` means the HTTP process is running.
- `/health/ready` checks PostgreSQL, Celo RPC chain identity, and Redis/Upstash; it returns `503` when a required dependency is unavailable.

Use one process for the hackathon/demo environment. If later operational volume requires scaling workers separately, run them from the same monolith build and source tree; do not split the domain code into a second backend.
