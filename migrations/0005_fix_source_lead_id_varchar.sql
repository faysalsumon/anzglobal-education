-- 0005: Fix source_lead_id column type — must be varchar (UUID), not integer
--
-- Root cause: The original source_lead_id was a FOREIGN KEY referencing
-- crm_leads.id (which was varchar/UUID). So Replit's internal deployment
-- snapshot has source_lead_id as varchar. Our 0002 migration created it
-- as integer, causing Replit's auto-diff to generate:
--   ALTER TABLE "crm_contacts" ALTER COLUMN "source_lead_id" SET DATA TYPE integer
-- which fails "cannot be cast automatically to type integer" because
-- production has varchar (from Replit's perspective of what should be there).
--
-- Fix: Drop the old integer-based CHECK constraint, change column to varchar,
-- re-add a varchar-compatible CHECK constraint with the same name.

-- Step 1: Drop the integer-based CHECK constraint (incompatible with varchar type)
ALTER TABLE "crm_contacts"
  DROP CONSTRAINT IF EXISTS "crm_contacts_source_lead_id_crm_leads_id_fk";

-- Step 2: Change source_lead_id from integer to varchar
ALTER TABLE "crm_contacts"
  ALTER COLUMN "source_lead_id" TYPE varchar USING source_lead_id::text;

-- Step 3: Re-add the named CHECK constraint (varchar-compatible)
--         The constraint name must stay the same — Replit's auto-diff will
--         DROP CONSTRAINT by this exact name.
ALTER TABLE "crm_contacts"
  ADD CONSTRAINT "crm_contacts_source_lead_id_crm_leads_id_fk"
  CHECK (source_lead_id IS NULL OR length(source_lead_id) > 0);
