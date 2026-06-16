ALTER TYPE "entry_source" ADD VALUE IF NOT EXISTS 'social_media';--> statement-breakpoint
ALTER TYPE "entry_source" ADD VALUE IF NOT EXISTS 'marketing_campaign';--> statement-breakpoint
ALTER TYPE "entry_source" ADD VALUE IF NOT EXISTS 'phone_inquiry';--> statement-breakpoint
ALTER TABLE "crm_contacts" DROP CONSTRAINT IF EXISTS "crm_contacts_contact_owner_users_id_fk";--> statement-breakpoint
DROP INDEX IF EXISTS "crm_contacts_owner_idx";--> statement-breakpoint
ALTER TABLE "crm_contacts" DROP COLUMN IF EXISTS "contact_owner";
