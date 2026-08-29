CREATE TABLE "publisher_quote_requests" (
  "id" text PRIMARY KEY NOT NULL,
  "campaign_id" text NOT NULL REFERENCES "campaigns"("id"),
  "publisher_agent_id" text NOT NULL REFERENCES "agents"("id"),
  "slot_id" text NOT NULL REFERENCES "ad_slots"("id"),
  "status" text DEFAULT 'PENDING' NOT NULL,
  "requested_at" timestamp with time zone DEFAULT now() NOT NULL,
  "fulfilled_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX "quote_request_campaign_agent_slot_unique"
  ON "publisher_quote_requests" USING btree ("campaign_id", "publisher_agent_id", "slot_id");
