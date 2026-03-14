-- 0007: Add available_markets column to universities and courses
--
-- Allows admins to target institutions and courses to specific regional markets
-- (AU, BD, or both). All existing records default to both markets.

ALTER TABLE "universities"
  ADD COLUMN IF NOT EXISTS "available_markets" text[] NOT NULL DEFAULT '{AU,BD}';

ALTER TABLE "courses"
  ADD COLUMN IF NOT EXISTS "available_markets" text[] NOT NULL DEFAULT '{AU,BD}';

CREATE INDEX IF NOT EXISTS "universities_available_markets_gin_idx"
  ON "universities" USING gin ("available_markets");

CREATE INDEX IF NOT EXISTS "courses_available_markets_gin_idx"
  ON "courses" USING gin ("available_markets");
