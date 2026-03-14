-- 0003: Fix crm_leads identity column
--
-- Problem: 0002 created crm_leads with GENERATED ALWAYS AS IDENTITY.
-- PostgreSQL does NOT allow ALTER COLUMN SET DATA TYPE on identity columns.
-- Replit's auto-diff generates such a statement, causing the deployment to fail.
--
-- Fix: Drop and recreate crm_leads as a plain integer PK (no identity/sequence).
-- The table is temporary scaffolding that Replit's diff will drop immediately after.

DROP TABLE IF EXISTS "crm_leads";

CREATE TABLE "crm_leads" (
  "id" integer PRIMARY KEY DEFAULT 0,
  "status" text DEFAULT 'new'
);
