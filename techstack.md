# AdFlow — Tech Stack and Developer Tooling

> **Goal:** Define the complete implementation stack for AdFlow and give the team one authoritative place for packages, infrastructure, Celo documentation, MCP servers, Agent Skills, testing tools, and environment requirements.  
> **Principle:** Prefer boring, typed, inspectable infrastructure around money. Use AI where it improves judgment, not where deterministic code is safer.

---

## 1. Stack at a Glance

| Layer | Choice | Why |
|---|---|---|
| Monorepo | pnpm workspaces + Turborepo | Fast shared TypeScript packages, simple CI boundaries |
| Frontend | Next.js App Router + TypeScript | Mature React stack, SSR/streaming, easy wallet UX |
| Styling | Tailwind CSS + shadcn/ui + selected Composer Kit components | Fast product iteration without locking entire UI to a framework |
| Web3 frontend | wagmi + viem + RainbowKit/Reown-compatible connectors | Strong EVM UX; viem has first-class Celo transaction support |
| Backend API | Node.js LTS + TypeScript + Fastify | High-throughput measurement/API path with strong schema support |
| Runtime validation | Zod / TypeBox | Reject malformed agent/API/model data at boundaries |
| Database | PostgreSQL | Financial and relational correctness, constraints, SQL analytics |
| ORM/query layer | Drizzle ORM + SQL migrations | Typed queries without hiding important SQL semantics |
| Cache/queue | Redis + BullMQ | Rate limiting, distributed jobs, locks, fanout |
| Object storage | S3-compatible object storage + optional IPFS/Pinata publishing | Reliable creative/evidence storage with content-addressed public artifacts where useful |
| Smart contracts | Solidity + OpenZeppelin + Hardhat | Mature EVM tooling, strong testing/deployment ecosystem, and minimal migration cost for existing Solidity work |
| Chain client | viem | Recommended Celo backend/client library for fee-currency transactions |
| Agent model access | Provider-agnostic model gateway; AI SDK or thin custom adapter | Avoid vendor lock-in; structured output and streaming where useful |
| Agent orchestration | Explicit TypeScript state machines + BullMQ jobs | More auditable than hiding money flows inside a generic autonomous framework |
| x402 | thirdweb x402 SDK initially | Celo docs provide a concrete supported implementation path |
| Agent identity | ERC-8004 | Portable identity/reputation instead of proprietary registry |
| App attribution | `@celo/attribution-tags` / ERC-8021 | Attribute AdFlow on-chain activity |
| Observability | OpenTelemetry + structured logs + Sentry-compatible error tracking | Trace agent → policy → queue → chain actions |
| Tests | Vitest/Jest, Playwright, Hardhat tests, property/fuzz tools | Full-stack correctness |
| CI | GitHub Actions | Build/test/deploy gates |
| Local orchestration | Docker Compose | Postgres/Redis/local services |

---

## 2. Runtime Baseline

Recommended baseline:

```text
Node.js: active LTS, minimum 22+
pnpm: current stable major used consistently in lockfile
TypeScript: strict mode
Python: only for optional Celo MCP tooling; not required by core AdFlow runtime
Solidity: pin a compiler version across CI/deployments
PostgreSQL: managed 16+ or current provider-supported stable
Redis: managed Redis-compatible service or Redis 7+
```

Do not make the application depend on a developer machine's globally installed package versions. Commit lockfiles and pin CI toolchains.

---

## 3. Monorepo

### Recommended

- `pnpm`
- `turbo`
- shared TS configs
- shared linting
- package-level build/test scripts

```text
apps/web
apps/api
apps/agent-worker
apps/settlement-worker
packages/contracts
packages/chain
packages/db
packages/shared
packages/agent-core
packages/measurement-core
packages/ui
packages/config
```

### Why not one giant Next.js project?

Celo's own scaling guidance recommends separating heavy backend processing from frontend/API-route workloads. AdFlow has high-volume measurement, queues, settlement workers, and agent loops; those should scale independently from the web UI.

Celo scaling guide:  
https://docs.celo.org/build-on-celo/scaling-your-app

---

## 4. Frontend Stack

### Core

```text
next
react
react-dom
typescript
tailwindcss
zod
@tanstack/react-query
```

### Wallet / Chain

```text
wagmi
viem
@rainbow-me/rainbowkit
```

Alternative wallet layer: Reown AppKit if product requirements make it preferable.

### UI

```text
shadcn/ui components
radix primitives
lucide-react
framer-motion (only where motion improves state comprehension)
recharts or lightweight chart package
```

### Celo-specific UI option

Composer Kit provides Celo-oriented wallet, balance, payment, transaction, identity, swap, and NFT React components. Use selectively rather than rebuilding obvious primitives.

Docs:  
https://docs.celo.org/tooling/libraries-sdks/composer-kit

Repository / ecosystem reference:  
https://github.com/celo-org/composer-kit

---

## 5. Backend Stack

### API Server

Recommended:

```text
fastify
@fastify/cors
@fastify/cookie
@fastify/helmet
@fastify/rate-limit
@fastify/multipart
zod or typebox
pino
```

Fastify is preferred over putting measurement and settlement work in Next.js API routes.

### DB

```text
postgresql
drizzle-orm
drizzle-kit
postgres or pg driver
```

Use native SQL for partitioning, locks, materialized views, and critical reconciliation queries where ORM abstraction becomes counterproductive.

### Redis / Queues

```text
ioredis
bullmq
```

Queue consumers:

```text
campaign agent jobs
publisher sync jobs
verification batches
settlement prepare/submit
chain reconciliation
reputation writes
notification/activity projection
```

### Authentication

Use wallet-signature/SIWE-style authentication. Useful packages can include:

```text
siwe
viem signature utilities
iron-session or signed secure cookie/session implementation
```

Do not use wallet address in a request body as authorization.

---

## 6. Celo Network Stack

### Celo Mainnet

```text
Chain ID: 42220
RPC best-effort: https://forno.celo.org
```

### Celo Sepolia

```text
Chain ID: 11142220
RPC best-effort: https://forno.celo-sepolia.celo-testnet.org
Explorer: https://celo-sepolia.blockscout.com
```

Official network docs:  
https://docs.celo.org/build-on-celo/network-overview

Celo Sepolia docs:  
https://docs.celo.org/tooling/testnets/celo-sepolia

MetaMask/network setup reference:  
https://docs.celo.org/tooling/wallets/metamask/setup

### RPC policy

For production:

- configure primary and secondary RPCs;
- do not rely on best-effort public RPC for high-volume production traffic;
- use health checks and provider failover;
- separate read clients from write clients;
- set request timeouts;
- batch/multicall reads where useful;
- cache stable metadata.

---

## 7. viem

Use `viem` for:

- public client;
- wallet client;
- contract reads;
- typed writes;
- simulations;
- transaction receipts;
- fee currency support;
- EIP-712 typed data;
- calldata encoding;
- attribution suffix composition.

Celo fee-abstraction guidance specifically recommends viem because it supports the Celo `feeCurrency` transaction field.

Celo fee abstraction overview:  
https://docs.celo.org/build-on-celo/fee-abstraction/overview

Using fee abstraction:  
https://docs.celo.org/build-on-celo/fee-abstraction/using-fee-abstraction

Celo transaction types / CIP-64 context:  
https://docs.celo.org/home/protocol/transactions/transaction-types

### Important token configuration model

Never define only:

```text
USDC_ADDRESS
```

Use:

```text
USDC_TOKEN_ADDRESS
USDC_DECIMALS
USDC_FEE_CURRENCY_ADDRESS
USDC_SUPPORTS_X402
USDC_IS_ALLOWED_SETTLEMENT_TOKEN
```

Token address and gas fee-currency adapter can be different.

---

## 8. Stablecoins

MVP settlement currency: **USDC**.

Follow-on:

- USDT;
- USDm;
- other Celo/Mento local stable assets only after settlement math, decimal handling, pricing UX, and fee-currency behavior are fully tested.

Celo x402 docs currently describe USDC, USDT, and USDm support in the documented thirdweb flow.

Docs:  
https://docs.celo.org/build-on-celo/build-with-ai/x402

General Celo transaction/fee abstraction context:  
https://docs.celo.org/home/protocol/transactions/overview

### Financial coding rule

All values:

```text
BIGINT / bigint atomic token units
```

Never use JavaScript floating-point values for settlement accounting.

---

## 9. Smart Contract Stack

### Packages

```text
hardhat
@openzeppelin/contracts
hardhat-toolbox-compatible plugins
viem/ethers integration only as required by scripts
```

### Contract tooling

- Solidity compiler pinned;
- unit tests;
- fuzz/invariant tests where possible;
- Slither static analysis;
- contract size report;
- gas snapshot;
- deployment manifest;
- source verification on supported Celo explorers.

### Why Hardhat

AdFlow stays Hardhat-first so existing Solidity work can be migrated quickly without paying a framework-migration cost during the hackathon. The architecture does not depend on Hardhat-specific runtime behavior.

Celo Hardhat/dev tooling is supported by the Celo Agent Skills repository.

Celo quickstart:  
https://docs.celo.org/build-on-celo/quickstart

Celo Ethereum compatibility:  
https://docs.celo.org/tooling/overview/migrate/from-ethereum

---

## 10. ERC-8004 Stack

ERC-8004 provides portable identity and reputation for agents.

Celo docs:  
https://docs.celo.org/build-on-celo/build-with-ai/8004

EIP specification:  
https://eips.ethereum.org/EIPS/eip-8004

Reference contracts:  
https://github.com/erc-8004/erc-8004-contracts

Celo docs currently list Identity and Reputation registry deployments for Celo Mainnet and Celo Sepolia. **Treat deployment addresses as external configuration and verify them from the official docs before deploying**, rather than copying addresses permanently into application source.

### SDK

Celo's ERC-8004 guide currently documents ChaosChain SDK examples:

```text
@chaoschain/sdk
```

The exact integration can be swapped for direct viem contract calls if SDK compatibility becomes an issue.

### AdFlow use

- register Campaign/Publisher Agents;
- resolve endpoints;
- record wallet references;
- read reputation before selection;
- submit post-interaction feedback selectively;
- snapshot reputation used in decisions.

---

## 11. x402 Stack

### Recommended MVP implementation

Use thirdweb's documented x402 path because Celo's official guide gives client/server examples for it.

Packages conceptually:

```text
thirdweb
thirdweb/x402 APIs
```

Celo x402 docs:  
https://docs.celo.org/build-on-celo/build-with-ai/x402

thirdweb x402 docs:  
https://portal.thirdweb.com/x402

x402 protocol repository:  
https://github.com/coinbase/x402

x402 site:  
https://x402.org

### AdFlow x402 use cases

- premium publisher inventory discovery;
- reservation service;
- third-party verification service;
- paid publisher analytics;
- other immediate machine service exchanges.

### Not the core settlement engine

CPC/CPM earnings depend on later measurement evidence. Those use AdFlow settlement contracts rather than pretending they are immediate HTTP purchases.

---

## 12. Celo Attribution Tags / ERC-8021

Install:

```bash
pnpm add @celo/attribution-tags
```

Docs:  
https://docs.celo.org/build-on-celo/attribution-tags

Source:  
https://github.com/celo-org/attribution-tags

Use for:

- campaign create/fund contract interactions;
- agreement interactions;
- settlement submissions;
- claims where the app constructs calldata;
- relevant agent-originated writes.

### Rule

If the hackathon/program assigns AdFlow an attribution code, use that exact code. Do not fabricate a platform attribution tag.

---

## 13. Celo AI Documentation

Start here:  
https://docs.celo.org/build-on-celo/build-with-ai/overview

This is the central reference for:

- Celo agent architecture;
- x402/agent payments;
- fee abstraction for agents;
- ERC-8004;
- attribution;
- MCP references.

Celo docs machine-readable index:  
https://docs.celo.org/llms.txt

The `llms.txt` index is useful for coding agents and documentation retrieval.

---

## 14. MCP Servers

MCP is **developer/operator tooling and controlled agent integration**, not the trust boundary for production money movement.

### 14.1 Celo MCP Server — Recommended

Repository:  
https://github.com/celo-org/celo-mcp

Docs:  
https://docs.celo.org/build-on-celo/build-with-ai/mcp/celo-mcp

General MCP docs inside Celo docs:  
https://docs.celo.org/build-on-celo/build-with-ai/mcp

Current documented capabilities include:

- network status;
- block lookup;
- account info;
- transaction lookup;
- token metadata;
- balances;
- NFT reads;
- contract reads;
- gas estimation;
- transaction estimation;
- governance data;
- additional chain operations exposed by the server version.

Install options documented by Celo include Python/pipx/uvx flows.

Example developer configuration:

```text
celo-mcp
```

Use in Cursor/Claude/compatible MCP clients for chain inspection while developing.

**Production safety:** do not attach unrestricted mainnet signing credentials to a model-controlled MCP server.

### 14.2 Composer Kit MCP — Recommended for Frontend Work

Repository:  
https://github.com/celo-org/composer-kit-mcp

Purpose:

- retrieve Composer Kit component documentation;
- get usage examples;
- help coding agents build Celo-oriented wallet/transaction UI.

This is useful for the frontend development agent, not required in the runtime product.

### 14.3 AdFlow MCP — Optional Product Surface

Potential future server:

```text
adflow-mcp
```

Read-only first capabilities:

- list publisher inventory;
- query public agent profiles;
- retrieve campaign/public agreement status;
- retrieve public aggregate performance;
- inspect pricing capabilities.

Do not expose a generic `sendTransaction` or `transferToken` tool.

---

## 15. Celo Agent Skills — Install These for Coding Agents

Official repository:  
https://github.com/celo-org/agent-skills

The repository states compatibility with Claude Code, Cursor, Windsurf, OpenAI Codex, and other Agent Skills-compatible tools.

Install all skills:

```bash
npx openskills install celo-org/agent-skills -g
```

Or install only what AdFlow needs.

### Development Tool Skills

- `evm-hardhat` — contract setup, compile, test, deployment, verification.
- `evm-foundry` — useful reference even if AdFlow remains Hardhat-first.
- `celo-composer` — scaffold/reference for Celo dApps.
- `contract-verification` — Celoscan/Blockscout/Sourcify verification flows.

### Blockchain Interaction Skills

- `celo-rpc` — Celo RPC reads and Celo-specific methods.
- `viem` — TypeScript Celo integration and CIP-64/fee-currency behavior.
- `wagmi` — React hooks and transaction UX.
- `fee-abstraction` — ERC-20 gas fee payments on Celo.

### Wallet Skills

- `evm-wallet-integration` — Reown/Dynamic/custom wagmi patterns.
- `minipay-integration` — future MiniPay app work.
- `thirdweb` — full-stack thirdweb integration.

### AI Agent Infrastructure Skills

- `8004` — ERC-8004 identity/reputation/validation.
- `x402` — HTTP-native payments.

### Asset/DeFi Skills

- `celo-stablecoins` — stablecoin addresses/patterns.
- `celo-defi` — not core to MVP but useful if treasury functionality grows.
- `bridging` — not core to MVP; avoid introducing bridge complexity into the hackathon demo.

### AdFlow priority skill install

If installing selectively:

```text
evm-hardhat
contract-verification
celo-rpc
viem
wagmi
fee-abstraction
evm-wallet-integration
thirdweb
8004
x402
celo-stablecoins
```

---

## 16. Celopedia Skill — Strongly Recommended

Repository:  
https://github.com/celo-org/celopedia-skills

The repository describes Celopedia as a broad Celo builder skill containing ecosystem intelligence, developer references, MiniPay, AI-agent infrastructure, verified contract addresses, security patterns, attribution tags, and funding information.

For Codex/Agent Skills-compatible tools, its README documents:

```bash
npx skills add celo-org/celopedia-skills
```

Use it for:

- verified/current Celo addresses;
- SDK selection;
- Celo-specific gotchas;
- ERC-8021 attribution;
- AI agent references;
- x402/ERC-8004 references;
- ecosystem research;
- current program/grant context.

### Important

Celopedia itself instructs builders to fetch live data for changing items. Do not treat cached grant status, token addresses, or program dates as immutable truth.

---

## 17. Celo Composer

Celo Composer can scaffold Next.js/Celo projects and is useful as a reference even if AdFlow uses its own monorepo.

Docs:  
https://docs.celo.org/build-on-celo/quickstart

Typical command:

```bash
npx @celo/celo-composer@latest create
```

Celo Composer documents templates for:

- basic Next.js dApp;
- Farcaster MiniApp;
- MiniPay app;
- AI chat app.

Do not regenerate the AdFlow repo from Composer after core implementation begins; use it to inspect recommended integrations.

---

## 18. MiniPay — Phase 4 / Adoption Expansion

MiniPay is a strong later distribution channel, especially for publishers/advertisers operating primarily from mobile and stablecoins.

Docs:  
https://docs.celo.org/build-on-celo/build-on-minipay/overview

AdFlow should not block hackathon delivery by making MiniPay mandatory in MVP. Add it after desktop/web marketplace and core economics work.

Potential MiniPay features:

- publisher earnings view;
- claim stablecoins;
- lightweight campaign create/top-up;
- campaign alerts;
- mobile publisher onboarding.

---

## 19. Optional Identity — Self

Self can provide privacy-preserving proof of humanity or other credential checks for future advertiser/publisher trust flows.

Celo Self docs:  
https://docs.celo.org/build-on-celo/build-with-self

Not required for MVP unless a hackathon integration makes it strategically valuable.

Potential later use:

- one-human-one-publisher reputation bootstrap;
- higher-trust advertiser verification;
- sybil resistance for reputation programs.

---

## 20. AI/LLM Stack

### Recommended architecture

Do not couple agent orchestration to one provider.

Use either:

- Vercel AI SDK as a provider-normalizing layer; or
- a small internal adapter around provider SDKs.

Core requirement:

```text
structured object generation
schema validation
streaming for human chat only
timeouts
provider failover optional
usage/cost logging
prompt versioning
```

### Providers

AdFlow can support:

```text
Groq — fast model inference / hackathon latency
OpenAI — high-quality structured reasoning option
Anthropic — alternative provider
other compatible provider — via adapter
```

Do not hard-code business behavior to a model name.

### Agent framework decision

**Do not make LangChain/LangGraph mandatory for MVP.**

Reason:

- financial flows need explicit state and typed tools;
- BullMQ + explicit TypeScript state machines are easier to debug and audit;
- a generic agent framework can be introduced later for non-financial workflows.

If LangGraph is used, it must sit above the same deterministic policy/executor boundary.

---

## 21. Data Stack

### PostgreSQL

Preferred providers can be any managed Postgres with:

- backups;
- TLS;
- connection pooling;
- migration support;
- metrics;
- regional deployment near backend.

Potential providers:

- Neon;
- Supabase Postgres;
- Railway/Render managed Postgres;
- AWS RDS;
- Cloud SQL.

The architecture must not depend on provider-specific SQL extensions for core correctness.

### Redis

Potential providers:

- Redis Cloud;
- Upstash Redis where BullMQ/connection semantics are suitable;
- managed provider co-located with backend.

Verify queue library compatibility before selecting a serverless Redis product.

### ClickHouse

Post-hackathon analytics scale only. Do not add until Postgres rollups are actually insufficient.

---

## 22. Object Storage / Creative Delivery

Preferred abstraction:

```text
S3-compatible bucket
+ CDN
+ optional IPFS publication/content hash
```

Potential services:

- Cloudflare R2;
- AWS S3;
- Backblaze B2;
- Pinata/IPFS for public content-addressed artifacts.

Creative validation:

- MIME sniffing;
- allowlisted media types;
- file-size limits;
- image dimensions;
- malware scan where available;
- strip dangerous metadata where appropriate;
- no executable HTML creatives in MVP.

---

## 23. Observability Stack

### Logging

`pino` JSON logs with correlation IDs.

Never log:

- private keys;
- signatures that should remain secret;
- session cookies;
- DB passwords;
- full auth headers;
- raw model prompts containing sensitive data unless explicitly redacted.

### Tracing

OpenTelemetry spans around:

```text
HTTP request
agent run
model call
external publisher call
policy evaluation
queue job
RPC call
chain transaction
settlement reconciliation
```

### Errors

Sentry or equivalent for:

- frontend exceptions;
- backend exceptions;
- worker failures.

### Metrics

Prometheus-compatible metrics or hosted equivalent.

---

## 24. Security Tooling

### JavaScript/TypeScript

- dependency audit;
- lockfile review;
- secret scanning;
- Semgrep optional;
- ESLint security rules where appropriate.

### Solidity

- Slither;
- Hardhat tests;
- fuzz/invariant testing;
- OpenZeppelin contracts;
- explorer source verification;
- manual invariant review.

### GitHub

Enable:

- secret scanning if available;
- Dependabot/Renovate;
- protected main branch;
- required CI checks;
- PR review for contract changes.

---

## 25. Testing Stack

### TypeScript unit/integration

```text
vitest
supertest or Fastify inject
Testcontainers optional
```

### Frontend

```text
Playwright
React Testing Library where useful
```

### Contracts

```text
Hardhat test suite
Solidity/TypeScript tests
fuzz/property tools
```

### End-to-end

Playwright + real Celo Sepolia smoke commands.

### Load

`k6` or Artillery for:

- measurement ingestion;
- embed config;
- click redirect;
- publisher A2A reads.

---

## 26. Deployment Stack

### Frontend

- Vercel is fine for the Next.js UI.

### Backend/workers

Use a long-running container platform rather than forcing workers into serverless functions.

Suitable categories:

- Railway;
- Render;
- Fly.io;
- Google Cloud Run with correctly configured workers;
- AWS ECS/Fargate;
- Kubernetes later.

### Why

Need:

- queue consumers;
- stable connections;
- background settlement;
- long-running agent loops;
- independent scaling.

---

## 27. Environment Variables

Representative environment contract:

```text
# App
NODE_ENV
APP_ENV
APP_BASE_URL
API_BASE_URL

# Network
CELO_NETWORK=celoSepolia|celo
CELO_CHAIN_ID
CELO_RPC_URL
CELO_RPC_FALLBACK_URL
BLOCK_EXPLORER_BASE_URL

# Contracts
ADFLOW_CAMPAIGN_VAULT_ADDRESS
ADFLOW_SETTLEMENT_ADDRESS
ERC8004_IDENTITY_REGISTRY_ADDRESS
ERC8004_REPUTATION_REGISTRY_ADDRESS
ADFLOW_ATTRIBUTION_CODE

# Tokens
USDC_TOKEN_ADDRESS
USDC_DECIMALS=6
USDC_FEE_CURRENCY_ADDRESS
USDT_TOKEN_ADDRESS
USDT_FEE_CURRENCY_ADDRESS
USDM_TOKEN_ADDRESS

# Database
DATABASE_URL
REDIS_URL

# Auth
SESSION_SECRET
WALLET_AUTH_DOMAIN
WALLET_AUTH_URI

# Embed/measurement
EMBED_SIGNING_SECRET_CURRENT
EMBED_SIGNING_KEY_ID
MEASUREMENT_HASH_SECRET

# Chain execution
SETTLEMENT_PRIVATE_KEY_OR_SIGNER_REFERENCE
DEPLOYER_PRIVATE_KEY_OR_SIGNER_REFERENCE
X402_AGENT_PRIVATE_KEY_OR_SIGNER_REFERENCE

# x402 / thirdweb
THIRDWEB_CLIENT_ID
THIRDWEB_SECRET_KEY
X402_ENABLED
X402_MAX_PAYMENT_ATOMIC

# AI
AI_PROVIDER
AI_MODEL
GROQ_API_KEY
OPENAI_API_KEY
ANTHROPIC_API_KEY
AI_MAX_CALLS_PER_RUN

# Object storage
S3_ENDPOINT
S3_BUCKET
S3_ACCESS_KEY_ID
S3_SECRET_ACCESS_KEY
CDN_BASE_URL
PINATA_JWT

# Observability
OTEL_EXPORTER_OTLP_ENDPOINT
SENTRY_DSN
LOG_LEVEL

# Safety
MAINNET_ENABLED=false
STRICT_POLICY_MODE=true
MAX_MAINNET_CAMPAIGN_VALUE_ATOMIC
MAX_MAINNET_X402_DAILY_ATOMIC
```

Use an environment schema at process startup and refuse to boot when required values are missing.

---

## 28. Package Ownership Rules

### `packages/chain`

Only package allowed to know:

- chain IDs;
- contract addresses;
- token configuration;
- viem clients;
- attribution encoding;
- transaction simulation helpers.

### `packages/agent-core`

Must not import private-key env vars directly. It calls typed executor interfaces.

### `packages/db`

Owns schema/migrations/repositories. No UI imports.

### `apps/web`

Never imports backend private env variables.

### `apps/settlement-worker`

Only service with settlement signing capability.

---

## 29. Recommended Developer Setup

```bash
# 1. Install JS deps
pnpm install

# 2. Start local infra
docker compose up -d postgres redis

# 3. Install Celo agent skills for your coding agent
npx openskills install celo-org/agent-skills -g

# 4. Optional broad Celopedia skill
npx skills add celo-org/celopedia-skills

# 5. Optional Celo MCP
pipx install celo-mcp

# 6. Configure .env.local/.env

# 7. Run migrations
pnpm db:migrate

# 8. Compile/test contracts
pnpm contracts:test

# 9. Start apps
pnpm dev
```

Exact scripts should be standardized in root `package.json`.

---

## 30. Documentation Index for the Team

### Celo core

- Celo home: https://docs.celo.org/home/celo
- Network overview: https://docs.celo.org/build-on-celo/network-overview
- Celo L2 architecture: https://docs.celo.org/build-on-celo/cel2-architecture
- Celo Sepolia: https://docs.celo.org/tooling/testnets/celo-sepolia
- Celo quickstart: https://docs.celo.org/build-on-celo/quickstart
- Developer tooling overview: https://docs.celo.org/tooling/overview
- SDK overview: https://docs.celo.org/tooling/libraries-sdks/celo-sdks
- Scaling: https://docs.celo.org/build-on-celo/scaling-your-app

### AI / agents

- Build with AI: https://docs.celo.org/build-on-celo/build-with-ai/overview
- ERC-8004: https://docs.celo.org/build-on-celo/build-with-ai/8004
- x402: https://docs.celo.org/build-on-celo/build-with-ai/x402
- MCP overview: https://docs.celo.org/build-on-celo/build-with-ai/mcp
- Celo MCP: https://docs.celo.org/build-on-celo/build-with-ai/mcp/celo-mcp
- Celo MCP repo: https://github.com/celo-org/celo-mcp
- Celo Agent Skills: https://github.com/celo-org/agent-skills
- Celopedia Skill: https://github.com/celo-org/celopedia-skills

### Transactions / payments

- Fee abstraction: https://docs.celo.org/build-on-celo/fee-abstraction/overview
- Using fee abstraction: https://docs.celo.org/build-on-celo/fee-abstraction/using-fee-abstraction
- Transactions: https://docs.celo.org/home/protocol/transactions/overview
- Transaction types: https://docs.celo.org/home/protocol/transactions/transaction-types
- Attribution tags: https://docs.celo.org/build-on-celo/attribution-tags

### UI / wallets

- Composer Kit: https://docs.celo.org/tooling/libraries-sdks/composer-kit
- Composer Kit MCP: https://github.com/celo-org/composer-kit-mcp
- MiniPay: https://docs.celo.org/build-on-celo/build-on-minipay/overview
- MetaMask setup: https://docs.celo.org/tooling/wallets/metamask/setup

### Optional trust/identity

- Self: https://docs.celo.org/build-on-celo/build-with-self

### Machine-readable docs

- Celo docs index: https://docs.celo.org/llms.txt

---

## 31. What We Deliberately Do Not Add to MVP

- Kafka;
- Kubernetes;
- ClickHouse;
- GraphQL gateway;
- custom blockchain indexer cluster;
- confidential-compute/FHE bidding;
- cross-chain bridge abstraction;
- custom AA/bundler infrastructure;
- LangChain as a hard dependency;
- vector DB as a source of financial truth;
- multiple settlement tokens on day one;
- MiniPay as a mandatory launch surface.

These can be added later only when the need is proven.

---

## 32. Tech Stack Acceptance Checklist

- [ ] pnpm/Turbo monorepo boots from a clean clone.
- [ ] strict TypeScript passes.
- [ ] Celo Sepolia chain config is centralized.
- [ ] viem is used for Celo-specific backend writes.
- [ ] Postgres migrations are reproducible.
- [ ] Redis jobs are idempotent.
- [ ] Hardhat contracts compile/test/deploy.
- [ ] ERC-8004 reads work on configured Celo network.
- [ ] x402 demo path works or is feature-gated with documented blocker.
- [ ] attribution tag can be verified from a Celo transaction.
- [ ] Celo Agent Skills are documented for contributors.
- [ ] Celo MCP setup is documented but not wired to production signing authority.
- [ ] frontend and workers deploy separately.
- [ ] env validation prevents accidental mainnet boot.
- [ ] all financial amounts use integer atomic units.
