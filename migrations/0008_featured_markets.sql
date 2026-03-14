-- 0008: Add featured_markets column to universities and courses
--
-- Allows admins to control which regional markets feature each institution
-- and course on their homepage. Default is empty array (not featured anywhere).
-- Existing items with the "featured" tag are migrated to featured on both markets.

ALTER TABLE "universities"
  ADD COLUMN IF NOT EXISTS "featured_markets" text[] NOT NULL DEFAULT '{}';

ALTER TABLE "courses"
  ADD COLUMN IF NOT EXISTS "featured_markets" text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS "universities_featured_markets_gin_idx"
  ON "universities" USING gin ("featured_markets");

CREATE INDEX IF NOT EXISTS "courses_featured_markets_gin_idx"
  ON "courses" USING gin ("featured_markets");

-- Migrate existing featured-tagged institutions to featured_markets = '{AU,BD}'
UPDATE "universities" u
SET "featured_markets" = '{AU,BD}'::text[]
FROM "institution_tags" it
INNER JOIN "tags" t ON t."id" = it."tag_id"
WHERE it."institution_id" = u."id"
  AND t."slug" = 'featured';

-- Migrate existing featured-tagged courses to featured_markets = '{AU,BD}'
UPDATE "courses" c
SET "featured_markets" = '{AU,BD}'::text[]
FROM "course_tags" ct
INNER JOIN "tags" t ON t."id" = ct."tag_id"
WHERE ct."course_id" = c."id"
  AND t."slug" = 'featured';
