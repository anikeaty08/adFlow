CREATE TYPE "public"."agent_run_status" AS ENUM('QUEUED', 'RUNNING', 'WAITING_FOR_APPROVAL', 'COMPLETED', 'FAILED', 'BLOCKED');--> statement-breakpoint
CREATE TYPE "public"."policy_decision_status" AS ENUM('ALLOW', 'DENY', 'REQUIRES_APPROVAL');--> statement-breakpoint
CREATE TABLE "agent_decision_receipts" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_run_id" text NOT NULL,
	"campaign_id" text NOT NULL,
	"decision_type" text NOT NULL,
	"proposal" jsonb NOT NULL,
	"policy_decision" "policy_decision_status" NOT NULL,
	"reason_codes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"model_provider" text,
	"model_name" text,
	"prompt_version" text,
	"executed_action_id" text,
	"result_status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"campaign_id" text NOT NULL,
	"agent_id" text,
	"trigger" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"status" "agent_run_status" DEFAULT 'QUEUED' NOT NULL,
	"graph_state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"failure_code" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chain_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"chain_id" integer NOT NULL,
	"transaction_hash" text NOT NULL,
	"kind" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"status" text DEFAULT 'SUBMITTED' NOT NULL,
	"block_number" bigint,
	"failure_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "agent_decision_receipts" ADD CONSTRAINT "agent_decision_receipts_agent_run_id_agent_runs_id_fk" FOREIGN KEY ("agent_run_id") REFERENCES "public"."agent_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_decision_receipts" ADD CONSTRAINT "agent_decision_receipts_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_decision_campaign_idx" ON "agent_decision_receipts" USING btree ("campaign_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_run_idempotency_unique" ON "agent_runs" USING btree ("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "chain_transaction_hash_unique" ON "chain_transactions" USING btree ("transaction_hash");