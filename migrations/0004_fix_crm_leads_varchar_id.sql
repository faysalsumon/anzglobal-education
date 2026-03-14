-- 0004: Fix crm_leads id column type — must be varchar (UUID), not integer
--
-- Root cause: Replit's internal deployment snapshot captured crm_leads.id as
-- varchar (UUID-based, like every other table in this codebase). Migration 0002
-- created it as integer GENERATED ALWAYS AS IDENTITY and 0003 as integer DEFAULT 0.
-- Replit's auto-diff generates:
--   ALTER TABLE "crm_leads" ALTER COLUMN "id" SET DATA TYPE integer
-- which PostgreSQL interprets as "cast current varchar column to integer" →
-- fails with "cannot be cast automatically to type integer".
--
-- Fix: recreate crm_leads with varchar id matching Replit's original snapshot.
-- After this, Replit's diff finds id already varchar → no ALTER COLUMN →
-- then safely executes DROP TABLE crm_leads CASCADE.

DROP TABLE IF EXISTS "crm_leads";

CREATE TABLE "crm_leads" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid()::text
);
