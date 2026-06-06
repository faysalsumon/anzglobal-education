-- Profiles and profile_permissions tables for RBAC profile system
-- Creates: profiles, profile_permissions
-- Modifies: users (adds profile_id FK)

CREATE TABLE IF NOT EXISTS "profiles" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(50) NOT NULL UNIQUE,
  "display_name" varchar(100) NOT NULL,
  "description" text,
  "is_system_profile" boolean DEFAULT false,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "profile_permissions" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "profile_id" varchar NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "module" varchar(50) NOT NULL,
  "can_create" boolean DEFAULT false,
  "can_read" boolean DEFAULT false,
  "can_update" boolean DEFAULT false,
  "can_delete" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now(),
  CONSTRAINT "profile_permissions_unique" UNIQUE ("profile_id", "module")
);

DO $$ BEGIN
  ALTER TABLE "users" ADD COLUMN "profile_id" varchar REFERENCES "profiles"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;
