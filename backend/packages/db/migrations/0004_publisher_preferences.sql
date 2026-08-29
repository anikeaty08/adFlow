ALTER TABLE "publishers"
  ADD COLUMN "blocked_categories" jsonb DEFAULT '[]'::jsonb NOT NULL,
  ADD COLUMN "accepted_categories" jsonb DEFAULT '[]'::jsonb NOT NULL,
  ADD COLUMN "minimum_advertiser_reputation_score" numeric(5, 2) DEFAULT '0' NOT NULL;
