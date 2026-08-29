# AdFlow backend

AdFlow is one deployable Fastify service. Its code is split into domain folders—rather than separate deployments—so it remains easy to understand and independently test:

```text
apps/api/src/
├── modules/          # auth, campaigns, creatives, measurement, and later domains
├── shared/           # HTTP and authentication helpers
├── app.ts            # transport composition only
└── server.ts         # process startup only
packages/db/src/
├── schema.ts          # typed Drizzle source of truth
└── client.ts          # PostgreSQL connection factory
```

Creatives are uploaded directly to **Cloudinary**; PostgreSQL stores only trusted metadata, the Cloudinary public ID, and lifecycle state. Migrations are generated from the typed Drizzle schema with `pnpm --filter @adflow/db generate`.

```bash
pnpm install
Copy-Item .env.example .env
docker compose up -d
pnpm db:migrate
pnpm dev:api
```

Use `pnpm format` and `pnpm typecheck` before committing.

Use `POST /api/v1/auth/nonce` then `POST /api/v1/auth/verify` to establish a wallet session. In development, signature verification is still real EIP-191 verification; use a wallet client to sign the returned message.
