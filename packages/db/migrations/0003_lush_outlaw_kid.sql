CREATE TABLE "chain_event_logs" (
	"chain_id" integer NOT NULL,
	"transaction_hash" text NOT NULL,
	"log_index" integer NOT NULL,
	"block_number" bigint NOT NULL,
	"contract_address" text NOT NULL,
	"event_name" text NOT NULL,
	"args" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chain_event_logs_chain_id_transaction_hash_log_index_pk" PRIMARY KEY("chain_id","transaction_hash","log_index")
);
--> statement-breakpoint
CREATE TABLE "chain_index_cursors" (
	"chain_id" integer NOT NULL,
	"contract_address" text NOT NULL,
	"last_finalized_block" bigint NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chain_index_cursors_chain_id_contract_address_pk" PRIMARY KEY("chain_id","contract_address")
);
--> statement-breakpoint
CREATE INDEX "chain_event_contract_block_idx" ON "chain_event_logs" USING btree ("chain_id","contract_address","block_number");