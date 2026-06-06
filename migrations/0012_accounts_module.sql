-- Accounts module: unified B2B partner registry
-- Creates: account_type_enum, account_product_type_enum, accounts, account_restricted_details, account_products
-- Modifies: crm_contacts (adds sub_agent_account_id)

DO $$ BEGIN
  CREATE TYPE "account_type_enum" AS ENUM (
    'institution',
    'super_agent',
    'sub_agent',
    'pathway_provider',
    'insurance_company',
    'migration_agent'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "account_product_type_enum" AS ENUM (
    'insurance',
    'visa'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "accounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "account_type" "account_type_enum" NOT NULL,
  "provider_type" text,
  "contract_type" text,
  "indirect_partner_id" uuid REFERENCES "accounts"("id") ON DELETE SET NULL,
  "institution_cms_id" varchar REFERENCES "universities"("id") ON DELETE SET NULL,
  "contact_name" text,
  "email" text,
  "phone" text,
  "website" text,
  "address" text,
  "city" text,
  "state" text,
  "country" text,
  "logo_url" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "account_restricted_details" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid UNIQUE NOT NULL REFERENCES "accounts"("id") ON DELETE CASCADE,
  "bank_name" text,
  "account_holder_name" text,
  "account_number" text,
  "bsb" text,
  "swift_code" text,
  "contract_start_date" date,
  "contract_end_date" date,
  "contract_notes" text,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "account_products" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE CASCADE,
  "product_type" "account_product_type_enum" NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "student_price" decimal(10, 2),
  "agent_cost" decimal(10, 2),
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "crm_contacts" ADD COLUMN IF NOT EXISTS "sub_agent_account_id" uuid REFERENCES "accounts"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "accounts_type_idx" ON "accounts"("account_type");
CREATE INDEX IF NOT EXISTS "accounts_active_idx" ON "accounts"("is_active");
CREATE INDEX IF NOT EXISTS "account_products_account_id_idx" ON "account_products"("account_id");
