ALTER TABLE "accounts"
  ADD COLUMN IF NOT EXISTS "primary_contact_id" text
    REFERENCES "crm_contacts"("id") ON DELETE SET NULL;
