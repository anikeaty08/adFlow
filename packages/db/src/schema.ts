import { relations } from 'drizzle-orm';
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

const createdAt = timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

export const campaignStatus = pgEnum('campaign_status', [
  'DRAFT',
  'FUNDING_PENDING',
  'FUNDED',
  'DISCOVERING',
  'ACTIVE',
  'PAUSED',
  'SETTLING',
  'CLOSED',
  'BLOCKED',
]);
export const creativeStatus = pgEnum('creative_status', ['ACTIVE', 'DELETED']);
export const agreementStatus = pgEnum('agreement_status', [
  'PREPARED',
  'ACTIVE',
  'PAUSED',
  'ENDED',
  'SETTLED',
  'BLOCKED',
]);
export const measurementStatus = pgEnum('measurement_status', ['PENDING', 'ACCEPTED', 'REJECTED']);
export const agentRunStatus = pgEnum('agent_run_status', [
  'QUEUED',
  'RUNNING',
  'WAITING_FOR_APPROVAL',
  'COMPLETED',
  'FAILED',
  'BLOCKED',
]);
export const policyDecisionStatus = pgEnum('policy_decision_status', ['ALLOW', 'DENY', 'REQUIRES_APPROVAL']);

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  createdAt,
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
export const wallets = pgTable(
  'wallets',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    address: text('address').notNull(),
    chainId: integer('chain_id').notNull(),
    isPrimary: boolean('is_primary').notNull().default(true),
    verifiedAt: timestamp('verified_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('wallet_address_unique').on(table.address)],
);
export const authNonces = pgTable('auth_nonces', {
  nonce: text('nonce').primaryKey(),
  walletAddress: text('wallet_address').notNull(),
  message: text('message').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
});
export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt,
});

export const campaigns = pgTable('campaigns', {
  id: text('id').primaryKey(),
  ownerUserId: text('owner_user_id')
    .notNull()
    .references(() => users.id),
  ownerWalletId: text('owner_wallet_id')
    .notNull()
    .references(() => wallets.id),
  name: text('name').notNull(),
  objectiveText: text('objective_text').notNull(),
  landingUrl: text('landing_url').notNull(),
  pricingModel: text('pricing_model').notNull(),
  settlementTokenSymbol: text('settlement_token_symbol').notNull(),
  settlementTokenAddress: text('settlement_token_address').notNull(),
  budgetPlannedAtomic: numeric('budget_planned_atomic', { precision: 78, scale: 0 }).notNull(),
  maxUnitPriceAtomic: numeric('max_unit_price_atomic', { precision: 78, scale: 0 }).notNull(),
  startAt: timestamp('start_at', { withTimezone: true }).notNull(),
  endAt: timestamp('end_at', { withTimezone: true }).notNull(),
  status: campaignStatus('status').notNull().default('DRAFT'),
  chainId: integer('chain_id').notNull().default(11142220),
  onchainCampaignId: text('onchain_campaign_id'),
  createdAt,
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
export const campaignPolicies = pgTable('campaign_policies', {
  campaignId: text('campaign_id')
    .primaryKey()
    .references(() => campaigns.id),
  allowedCategories: jsonb('allowed_categories').$type<string[]>().notNull().default([]),
  blockedCategories: jsonb('blocked_categories').$type<string[]>().notNull().default([]),
  blockedDomains: jsonb('blocked_domains').$type<string[]>().notNull().default([]),
  minReputationScore: numeric('min_reputation_score', { precision: 5, scale: 2 }).notNull().default('0'),
  maxPublisherAllocationAtomic: numeric('max_publisher_allocation_atomic', { precision: 78, scale: 0 }),
  explorationRatioBasisPoints: integer('exploration_ratio_basis_points').notNull().default(1000),
  version: text('version').notNull().default('v1'),
});

// Ads live in Cloudinary. The database stores trusted metadata and lifecycle state only.
export const creatives = pgTable(
  'creatives',
  {
    id: text('id').primaryKey(),
    ownerUserId: text('owner_user_id')
      .notNull()
      .references(() => users.id),
    cloudinaryPublicId: text('cloudinary_public_id').notNull(),
    assetUrl: text('asset_url').notNull(),
    mimeType: text('mime_type').notNull(),
    bytes: bigint('bytes', { mode: 'number' }).notNull(),
    width: integer('width'),
    height: integer('height'),
    sha256: text('sha256').notNull(),
    destinationUrl: text('destination_url').notNull(),
    headline: text('headline'),
    body: text('body'),
    status: creativeStatus('status').notNull().default('ACTIVE'),
    createdAt,
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('creative_cloudinary_unique').on(table.cloudinaryPublicId),
    uniqueIndex('creative_sha_unique').on(table.sha256),
  ],
);
export const campaignCreatives = pgTable(
  'campaign_creatives',
  {
    campaignId: text('campaign_id')
      .notNull()
      .references(() => campaigns.id),
    creativeId: text('creative_id')
      .notNull()
      .references(() => creatives.id),
  },
  (table) => [primaryKey({ columns: [table.campaignId, table.creativeId] })],
);

export const publishers = pgTable('publishers', {
  id: text('id').primaryKey(),
  ownerUserId: text('owner_user_id')
    .notNull()
    .references(() => users.id),
  name: text('name').notNull(),
  payoutWalletAddress: text('payout_wallet_address').notNull(),
  status: text('status').notNull().default('PENDING'),
  createdAt,
});
export const publisherSites = pgTable(
  'publisher_sites',
  {
    id: text('id').primaryKey(),
    publisherId: text('publisher_id')
      .notNull()
      .references(() => publishers.id),
    origin: text('origin').notNull(),
    normalizedDomain: text('normalized_domain').notNull(),
    verificationMethod: text('verification_method'),
    verificationChallengeHash: text('verification_challenge_hash'),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    status: text('status').notNull().default('PENDING'),
  },
  (table) => [uniqueIndex('publisher_domain_unique').on(table.publisherId, table.normalizedDomain)],
);
export const adSlots = pgTable(
  'ad_slots',
  {
    id: text('id').primaryKey(),
    siteId: text('site_id')
      .notNull()
      .references(() => publisherSites.id),
    publicKey: text('public_key').notNull(),
    name: text('name').notNull(),
    format: text('format').notNull(),
    width: integer('width'),
    height: integer('height'),
    floorCpcAtomic: numeric('floor_cpc_atomic', { precision: 78, scale: 0 }).notNull().default('0'),
    floorCpmAtomic: numeric('floor_cpm_atomic', { precision: 78, scale: 0 }).notNull().default('0'),
    status: text('status').notNull().default('DRAFT'),
    categories: jsonb('categories').$type<string[]>().notNull().default([]),
  },
  (table) => [uniqueIndex('slot_public_key_unique').on(table.publicKey)],
);
export const agents = pgTable('agents', {
  id: text('id').primaryKey(),
  ownerUserId: text('owner_user_id').references(() => users.id),
  publisherId: text('publisher_id').references(() => publishers.id),
  role: text('role').notNull(),
  name: text('name').notNull(),
  status: text('status').notNull().default('IDLE'),
  walletAddress: text('wallet_address'),
  erc8004ChainId: integer('erc8004_chain_id'),
  erc8004AgentId: text('erc8004_agent_id'),
  erc8004Uri: text('erc8004_uri'),
  protocolVersion: text('protocol_version').notNull().default('1.0'),
  createdAt,
});
export const quotes = pgTable(
  'publisher_quotes',
  {
    id: text('id').primaryKey(),
    campaignId: text('campaign_id')
      .notNull()
      .references(() => campaigns.id),
    publisherAgentId: text('publisher_agent_id')
      .notNull()
      .references(() => agents.id),
    slotId: text('slot_id')
      .notNull()
      .references(() => adSlots.id),
    pricingModel: text('pricing_model').notNull(),
    rateAtomic: numeric('rate_atomic', { precision: 78, scale: 0 }).notNull(),
    unitScale: integer('unit_scale').notNull(),
    maxAllocationAtomic: numeric('max_allocation_atomic', { precision: 78, scale: 0 }).notNull(),
    publisherWallet: text('publisher_wallet').notNull(),
    quoteNonce: text('quote_nonce').notNull(),
    validUntil: timestamp('valid_until', { withTimezone: true }).notNull(),
    signature: text('signature').notNull(),
    canonicalHash: text('canonical_hash').notNull(),
    status: text('status').notNull().default('OPEN'),
  },
  (table) => [uniqueIndex('quote_hash_unique').on(table.canonicalHash)],
);
export const agreements = pgTable(
  'placement_agreements',
  {
    id: text('id').primaryKey(),
    campaignId: text('campaign_id')
      .notNull()
      .references(() => campaigns.id),
    quoteId: text('quote_id')
      .notNull()
      .references(() => quotes.id),
    publisherAgentId: text('publisher_agent_id')
      .notNull()
      .references(() => agents.id),
    slotId: text('slot_id')
      .notNull()
      .references(() => adSlots.id),
    pricingModel: text('pricing_model').notNull(),
    rateAtomic: numeric('rate_atomic', { precision: 78, scale: 0 }).notNull(),
    unitScale: integer('unit_scale').notNull(),
    allocationCapAtomic: numeric('allocation_cap_atomic', { precision: 78, scale: 0 }).notNull(),
    startAt: timestamp('start_at', { withTimezone: true }).notNull(),
    endAt: timestamp('end_at', { withTimezone: true }).notNull(),
    agreementHash: text('agreement_hash').notNull(),
    onchainAgreementId: text('onchain_agreement_id'),
    status: agreementStatus('status').notNull().default('PREPARED'),
  },
  (table) => [uniqueIndex('agreement_hash_unique').on(table.agreementHash)],
);

export const measurementEvents = pgTable(
  'measurement_events',
  {
    id: text('id').primaryKey(),
    eventKey: text('event_key').notNull(),
    agreementId: text('agreement_id')
      .notNull()
      .references(() => agreements.id),
    eventType: text('event_type').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
    placementTokenHash: text('placement_token_hash').notNull(),
    originHash: text('origin_hash').notNull(),
    sessionDedupHash: text('session_dedup_hash').notNull(),
    viewabilityRatio: numeric('viewability_ratio'),
    viewabilityMs: integer('viewability_ms'),
    riskScore: numeric('risk_score'),
    status: measurementStatus('status').notNull().default('PENDING'),
    measurementPolicyVersion: text('measurement_policy_version').notNull(),
    settlementEpochId: text('settlement_epoch_id'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
  },
  (table) => [
    uniqueIndex('measurement_event_key_unique').on(table.eventKey),
    index('unsettled_events_idx').on(table.agreementId, table.occurredAt),
  ],
);
export const settlementEpochs = pgTable(
  'settlement_epochs',
  {
    id: text('id').primaryKey(),
    agreementId: text('agreement_id')
      .notNull()
      .references(() => agreements.id),
    epochKey: text('epoch_key').notNull(),
    windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
    windowEnd: timestamp('window_end', { withTimezone: true }).notNull(),
    verifiedUnits: bigint('verified_units', { mode: 'number' }).notNull(),
    evidenceRoot: text('evidence_root').notNull(),
    status: text('status').notNull().default('PREPARED'),
    chainTxHash: text('chain_tx_hash'),
    onchainAmountAtomic: numeric('onchain_amount_atomic', { precision: 78, scale: 0 }),
    createdAt,
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
  },
  (table) => [uniqueIndex('epoch_key_unique').on(table.epochKey)],
);
export const activityEvents = pgTable('activity_events', {
  id: text('id').primaryKey(),
  campaignId: text('campaign_id').references(() => campaigns.id),
  publisherId: text('publisher_id').references(() => publishers.id),
  actorType: text('actor_type').notNull(),
  actorId: text('actor_id'),
  eventType: text('event_type').notNull(),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  chainTxHash: text('chain_tx_hash'),
  visibility: text('visibility').notNull().default('PRIVATE'),
  createdAt,
});

// LangGraph checkpoint/state is operational evidence. Canonical balances and agreement status stay
// in their own tables and on-chain; this makes failed jobs resumable without duplicating finance.
export const agentRuns = pgTable(
  'agent_runs',
  {
    id: text('id').primaryKey(),
    campaignId: text('campaign_id')
      .notNull()
      .references(() => campaigns.id),
    agentId: text('agent_id').references(() => agents.id),
    trigger: text('trigger').notNull(),
    idempotencyKey: text('idempotency_key').notNull(),
    status: agentRunStatus('status').notNull().default('QUEUED'),
    graphState: jsonb('graph_state').$type<Record<string, unknown>>().notNull().default({}),
    failureCode: text('failure_code'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt,
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('agent_run_idempotency_unique').on(table.idempotencyKey)],
);
export const agentDecisionReceipts = pgTable(
  'agent_decision_receipts',
  {
    id: text('id').primaryKey(),
    agentRunId: text('agent_run_id')
      .notNull()
      .references(() => agentRuns.id),
    campaignId: text('campaign_id')
      .notNull()
      .references(() => campaigns.id),
    decisionType: text('decision_type').notNull(),
    proposal: jsonb('proposal').$type<Record<string, unknown>>().notNull(),
    policyDecision: policyDecisionStatus('policy_decision').notNull(),
    reasonCodes: jsonb('reason_codes').$type<string[]>().notNull().default([]),
    modelProvider: text('model_provider'),
    modelName: text('model_name'),
    promptVersion: text('prompt_version'),
    executedActionId: text('executed_action_id'),
    resultStatus: text('result_status').notNull(),
    createdAt,
  },
  (table) => [index('agent_decision_campaign_idx').on(table.campaignId, table.createdAt)],
);
export const chainTransactions = pgTable(
  'chain_transactions',
  {
    id: text('id').primaryKey(),
    chainId: integer('chain_id').notNull(),
    transactionHash: text('transaction_hash').notNull(),
    kind: text('kind').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    status: text('status').notNull().default('SUBMITTED'),
    blockNumber: bigint('block_number', { mode: 'number' }),
    failureReason: text('failure_reason'),
    createdAt,
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
  },
  (table) => [uniqueIndex('chain_transaction_hash_unique').on(table.transactionHash)],
);
export const outboxEvents = pgTable('outbox_events', {
  id: text('id').primaryKey(),
  topic: text('topic').notNull(),
  aggregateType: text('aggregate_type').notNull(),
  aggregateId: text('aggregate_id').notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
  createdAt,
  publishedAt: timestamp('published_at', { withTimezone: true }),
  attempts: integer('attempts').notNull().default(0),
});

export const userRelations = relations(users, ({ many }) => ({
  wallets: many(wallets),
  campaigns: many(campaigns),
  creatives: many(creatives),
}));
