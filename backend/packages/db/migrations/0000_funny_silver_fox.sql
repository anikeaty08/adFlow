CREATE TYPE "public"."agreement_status" AS ENUM('PREPARED', 'ACTIVE', 'PAUSED', 'ENDED', 'SETTLED', 'BLOCKED');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('DRAFT', 'FUNDING_PENDING', 'FUNDED', 'DISCOVERING', 'ACTIVE', 'PAUSED', 'SETTLING', 'CLOSED', 'BLOCKED');--> statement-breakpoint
CREATE TYPE "public"."creative_status" AS ENUM('ACTIVE', 'DELETED');--> statement-breakpoint
CREATE TYPE "public"."measurement_status" AS ENUM('PENDING', 'ACCEPTED', 'REJECTED');--> statement-breakpoint
CREATE TABLE "activity_events" (
	"id" text PRIMARY KEY NOT NULL,
	"campaign_id" text,
	"publisher_id" text,
	"actor_type" text NOT NULL,
	"actor_id" text,
	"event_type" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"chain_tx_hash" text,
	"visibility" text DEFAULT 'PRIVATE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ad_slots" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"public_key" text NOT NULL,
	"name" text NOT NULL,
	"format" text NOT NULL,
	"width" integer,
	"height" integer,
	"floor_cpc_atomic" numeric(78, 0) DEFAULT '0' NOT NULL,
	"floor_cpm_atomic" numeric(78, 0) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"categories" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text,
	"publisher_id" text,
	"role" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'IDLE' NOT NULL,
	"wallet_address" text,
	"erc8004_chain_id" integer,
	"erc8004_agent_id" text,
	"erc8004_uri" text,
	"protocol_version" text DEFAULT '1.0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "placement_agreements" (
	"id" text PRIMARY KEY NOT NULL,
	"campaign_id" text NOT NULL,
	"quote_id" text NOT NULL,
	"publisher_agent_id" text NOT NULL,
	"slot_id" text NOT NULL,
	"pricing_model" text NOT NULL,
	"rate_atomic" numeric(78, 0) NOT NULL,
	"unit_scale" integer NOT NULL,
	"allocation_cap_atomic" numeric(78, 0) NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"agreement_hash" text NOT NULL,
	"onchain_agreement_id" text,
	"status" "agreement_status" DEFAULT 'PREPARED' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_nonces" (
	"nonce" text PRIMARY KEY NOT NULL,
	"wallet_address" text NOT NULL,
	"message" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "campaign_creatives" (
	"campaign_id" text NOT NULL,
	"creative_id" text NOT NULL,
	CONSTRAINT "campaign_creatives_campaign_id_creative_id_pk" PRIMARY KEY("campaign_id","creative_id")
);
--> statement-breakpoint
CREATE TABLE "campaign_policies" (
	"campaign_id" text PRIMARY KEY NOT NULL,
	"allowed_categories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"blocked_categories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"blocked_domains" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"min_reputation_score" numeric(5, 2) DEFAULT '0' NOT NULL,
	"max_publisher_allocation_atomic" numeric(78, 0),
	"exploration_ratio_basis_points" integer DEFAULT 1000 NOT NULL,
	"version" text DEFAULT 'v1' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"owner_wallet_id" text NOT NULL,
	"name" text NOT NULL,
	"objective_text" text NOT NULL,
	"landing_url" text NOT NULL,
	"pricing_model" text NOT NULL,
	"settlement_token_symbol" text NOT NULL,
	"settlement_token_address" text NOT NULL,
	"budget_planned_atomic" numeric(78, 0) NOT NULL,
	"max_unit_price_atomic" numeric(78, 0) NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"status" "campaign_status" DEFAULT 'DRAFT' NOT NULL,
	"chain_id" integer DEFAULT 11142220 NOT NULL,
	"onchain_campaign_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creatives" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"cloudinary_public_id" text NOT NULL,
	"asset_url" text NOT NULL,
	"mime_type" text NOT NULL,
	"bytes" bigint NOT NULL,
	"width" integer,
	"height" integer,
	"sha256" text NOT NULL,
	"destination_url" text NOT NULL,
	"headline" text,
	"body" text,
	"status" "creative_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "measurement_events" (
	"id" text PRIMARY KEY NOT NULL,
	"event_key" text NOT NULL,
	"agreement_id" text NOT NULL,
	"event_type" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"placement_token_hash" text NOT NULL,
	"origin_hash" text NOT NULL,
	"session_dedup_hash" text NOT NULL,
	"viewability_ratio" numeric,
	"viewability_ms" integer,
	"risk_score" numeric,
	"status" "measurement_status" DEFAULT 'PENDING' NOT NULL,
	"measurement_policy_version" text NOT NULL,
	"settlement_epoch_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outbox_events" (
	"id" text PRIMARY KEY NOT NULL,
	"topic" text NOT NULL,
	"aggregate_type" text NOT NULL,
	"aggregate_id" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publisher_sites" (
	"id" text PRIMARY KEY NOT NULL,
	"publisher_id" text NOT NULL,
	"origin" text NOT NULL,
	"normalized_domain" text NOT NULL,
	"verification_method" text,
	"verification_challenge_hash" text,
	"verified_at" timestamp with time zone,
	"status" text DEFAULT 'PENDING' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publishers" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"name" text NOT NULL,
	"payout_wallet_address" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publisher_quotes" (
	"id" text PRIMARY KEY NOT NULL,
	"campaign_id" text NOT NULL,
	"publisher_agent_id" text NOT NULL,
	"slot_id" text NOT NULL,
	"pricing_model" text NOT NULL,
	"rate_atomic" numeric(78, 0) NOT NULL,
	"unit_scale" integer NOT NULL,
	"max_allocation_atomic" numeric(78, 0) NOT NULL,
	"publisher_wallet" text NOT NULL,
	"quote_nonce" text NOT NULL,
	"valid_until" timestamp with time zone NOT NULL,
	"signature" text NOT NULL,
	"canonical_hash" text NOT NULL,
	"status" text DEFAULT 'OPEN' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settlement_epochs" (
	"id" text PRIMARY KEY NOT NULL,
	"agreement_id" text NOT NULL,
	"epoch_key" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"window_end" timestamp with time zone NOT NULL,
	"verified_units" bigint NOT NULL,
	"evidence_root" text NOT NULL,
	"status" text DEFAULT 'PREPARED' NOT NULL,
	"chain_tx_hash" text,
	"onchain_amount_atomic" numeric(78, 0),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"address" text NOT NULL,
	"chain_id" integer NOT NULL,
	"is_primary" boolean DEFAULT true NOT NULL,
	"verified_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_publisher_id_publishers_id_fk" FOREIGN KEY ("publisher_id") REFERENCES "public"."publishers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_slots" ADD CONSTRAINT "ad_slots_site_id_publisher_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."publisher_sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_publisher_id_publishers_id_fk" FOREIGN KEY ("publisher_id") REFERENCES "public"."publishers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placement_agreements" ADD CONSTRAINT "placement_agreements_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placement_agreements" ADD CONSTRAINT "placement_agreements_quote_id_publisher_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."publisher_quotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placement_agreements" ADD CONSTRAINT "placement_agreements_publisher_agent_id_agents_id_fk" FOREIGN KEY ("publisher_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placement_agreements" ADD CONSTRAINT "placement_agreements_slot_id_ad_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."ad_slots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_creatives" ADD CONSTRAINT "campaign_creatives_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_creatives" ADD CONSTRAINT "campaign_creatives_creative_id_creatives_id_fk" FOREIGN KEY ("creative_id") REFERENCES "public"."creatives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_policies" ADD CONSTRAINT "campaign_policies_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_owner_wallet_id_wallets_id_fk" FOREIGN KEY ("owner_wallet_id") REFERENCES "public"."wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creatives" ADD CONSTRAINT "creatives_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "measurement_events" ADD CONSTRAINT "measurement_events_agreement_id_placement_agreements_id_fk" FOREIGN KEY ("agreement_id") REFERENCES "public"."placement_agreements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publisher_sites" ADD CONSTRAINT "publisher_sites_publisher_id_publishers_id_fk" FOREIGN KEY ("publisher_id") REFERENCES "public"."publishers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publishers" ADD CONSTRAINT "publishers_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publisher_quotes" ADD CONSTRAINT "publisher_quotes_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publisher_quotes" ADD CONSTRAINT "publisher_quotes_publisher_agent_id_agents_id_fk" FOREIGN KEY ("publisher_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publisher_quotes" ADD CONSTRAINT "publisher_quotes_slot_id_ad_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."ad_slots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_epochs" ADD CONSTRAINT "settlement_epochs_agreement_id_placement_agreements_id_fk" FOREIGN KEY ("agreement_id") REFERENCES "public"."placement_agreements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "slot_public_key_unique" ON "ad_slots" USING btree ("public_key");--> statement-breakpoint
CREATE UNIQUE INDEX "agreement_hash_unique" ON "placement_agreements" USING btree ("agreement_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "creative_cloudinary_unique" ON "creatives" USING btree ("cloudinary_public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "creative_sha_unique" ON "creatives" USING btree ("sha256");--> statement-breakpoint
CREATE UNIQUE INDEX "measurement_event_key_unique" ON "measurement_events" USING btree ("event_key");--> statement-breakpoint
CREATE INDEX "unsettled_events_idx" ON "measurement_events" USING btree ("agreement_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "publisher_domain_unique" ON "publisher_sites" USING btree ("publisher_id","normalized_domain");--> statement-breakpoint
CREATE UNIQUE INDEX "quote_hash_unique" ON "publisher_quotes" USING btree ("canonical_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "epoch_key_unique" ON "settlement_epochs" USING btree ("epoch_key");--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_address_unique" ON "wallets" USING btree ("address");