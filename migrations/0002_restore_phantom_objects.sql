-- This migration temporarily restores phantom objects that Replit's deployment
-- system expects to clean up during its auto-generated schema reconciliation.
--
-- Context: When the migration history was regenerated (collapsing old migrations
-- into a single 0000), Replit's internal deployment snapshot was left referencing
-- columns/tables/constraints from the old schema. Its auto-diff tries to DROP
-- them, but fails because they no longer exist in the database.
--
-- Solution: We recreate those objects here so the auto-diff DROP statements
-- succeed. After the deployment auto-diff runs, production will match the schema.
-- Future deployments will find nothing to diff.
--
-- IMPORTANT: source_lead_id uses a CHECK constraint (not FK) because
-- "DROP TABLE crm_leads CASCADE" would auto-drop an FK before the explicit
-- "DROP CONSTRAINT" statement runs, causing a double-drop failure.
-- A CHECK constraint survives the CASCADE and allows the explicit drop to succeed.

-- 1. Recreate minimal crm_leads table (Replit auto-diff: DROP TABLE crm_leads CASCADE)
CREATE TABLE IF NOT EXISTS "crm_leads" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY
);

-- 2. Restore source_lead_id column on crm_contacts
--    (Replit auto-diff: DROP COLUMN "source_lead_id")
ALTER TABLE "crm_contacts" ADD COLUMN IF NOT EXISTS "source_lead_id" integer;

-- 3. Restore the named constraint as a CHECK (not FK) so it survives CASCADE
--    (Replit auto-diff: DROP CONSTRAINT "crm_contacts_source_lead_id_crm_leads_id_fk")
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'crm_contacts_source_lead_id_crm_leads_id_fk'
  ) THEN
    ALTER TABLE "crm_contacts"
      ADD CONSTRAINT "crm_contacts_source_lead_id_crm_leads_id_fk"
      CHECK (source_lead_id IS NULL OR source_lead_id >= 0);
  END IF;
END $$;

-- 4. Restore phantom columns on courses table
--    (Replit auto-diff: DROP COLUMN "academic_requirements", "work_rights", etc.)
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "academic_requirements" text;
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "work_rights" text;
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "scholarship_percentage_min" integer;
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "scholarship_percentage_max" integer;

-- 5. Restore phantom columns on scraped_courses table
ALTER TABLE "scraped_courses" ADD COLUMN IF NOT EXISTS "academic_requirements" text;
ALTER TABLE "scraped_courses" ADD COLUMN IF NOT EXISTS "work_rights" text;
ALTER TABLE "scraped_courses" ADD COLUMN IF NOT EXISTS "scholarship_percentage_min" integer;
ALTER TABLE "scraped_courses" ADD COLUMN IF NOT EXISTS "scholarship_percentage_max" integer;

-- 6. Restore phantom column on scholarships table
--    (Replit auto-diff: DROP COLUMN "application_url")
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "application_url" text;
