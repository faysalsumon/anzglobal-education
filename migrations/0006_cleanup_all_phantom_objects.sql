-- 0006: Complete cleanup of all phantom scaffolding objects
--
-- Context: Migrations 0002-0005 added phantom objects to satisfy Replit's
-- auto-diff DROP statements (objects from the old schema). This approach
-- caused a cascade of ALTER COLUMN type-mismatch errors as Replit's internal
-- snapshot's expected types differed from what we created.
--
-- Final strategy: Remove ALL phantom objects from BOTH dev and production so
-- that dev DB exactly matches schema.ts. When Replit compares dev vs production
-- and finds them identical, it generates NO migration — deployment succeeds.
--
-- Safe: All operations use IF EXISTS / IF NOT EXISTS guards.

-- 1. Drop crm_leads and its dependent objects
ALTER TABLE "crm_contacts"
  DROP CONSTRAINT IF EXISTS "crm_contacts_source_lead_id_crm_leads_id_fk";

ALTER TABLE "crm_contacts"
  DROP COLUMN IF EXISTS "source_lead_id";

DROP TABLE IF EXISTS "crm_leads";

-- 2. Drop phantom columns from courses
ALTER TABLE "courses"
  DROP COLUMN IF EXISTS "academic_requirements",
  DROP COLUMN IF EXISTS "work_rights",
  DROP COLUMN IF EXISTS "scholarship_percentage_min",
  DROP COLUMN IF EXISTS "scholarship_percentage_max";

-- 3. Drop phantom columns from scraped_courses
ALTER TABLE "scraped_courses"
  DROP COLUMN IF EXISTS "academic_requirements",
  DROP COLUMN IF EXISTS "work_rights",
  DROP COLUMN IF EXISTS "scholarship_percentage_min",
  DROP COLUMN IF EXISTS "scholarship_percentage_max";

-- 4. Drop phantom column from scholarships
ALTER TABLE "scholarships"
  DROP COLUMN IF EXISTS "application_url";
