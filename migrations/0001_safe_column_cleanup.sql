-- Safe cleanup of legacy columns removed during schema refactoring.
-- All statements use IF EXISTS / DROP CONSTRAINT IF EXISTS so they are
-- completely idempotent — they succeed whether or not the column/constraint
-- still exists in the target database. No row data is ever deleted.
-- This migration reconciles Replit's internal deployment snapshot with the
-- current database state so future publishes generate zero diff conflicts.

ALTER TABLE "crm_contacts" DROP CONSTRAINT IF EXISTS "crm_contacts_source_lead_id_crm_leads_id_fk";
--> statement-breakpoint
ALTER TABLE "crm_contacts" DROP COLUMN IF EXISTS "source_lead_id";
--> statement-breakpoint
ALTER TABLE "courses" DROP COLUMN IF EXISTS "academic_requirements";
--> statement-breakpoint
ALTER TABLE "courses" DROP COLUMN IF EXISTS "work_rights";
--> statement-breakpoint
ALTER TABLE "courses" DROP COLUMN IF EXISTS "scholarship_percentage_min";
--> statement-breakpoint
ALTER TABLE "courses" DROP COLUMN IF EXISTS "scholarship_percentage_max";
--> statement-breakpoint
ALTER TABLE "scraped_courses" DROP COLUMN IF EXISTS "academic_requirements";
--> statement-breakpoint
ALTER TABLE "scraped_courses" DROP COLUMN IF EXISTS "work_rights";
--> statement-breakpoint
ALTER TABLE "scraped_courses" DROP COLUMN IF EXISTS "scholarship_percentage_min";
--> statement-breakpoint
ALTER TABLE "scraped_courses" DROP COLUMN IF EXISTS "scholarship_percentage_max";
--> statement-breakpoint
ALTER TABLE "scholarships" DROP COLUMN IF EXISTS "application_url";
