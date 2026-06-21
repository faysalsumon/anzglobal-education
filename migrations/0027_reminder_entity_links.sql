ALTER TABLE "follow_up_reminders" ADD COLUMN IF NOT EXISTS "crm_contact_id" varchar REFERENCES "crm_contacts"("id") ON DELETE CASCADE;
ALTER TABLE "follow_up_reminders" ADD COLUMN IF NOT EXISTS "acc_invoice_id" varchar REFERENCES "acc_invoices"("id") ON DELETE CASCADE;
ALTER TABLE "follow_up_reminders" ADD COLUMN IF NOT EXISTS "account_id" uuid REFERENCES "accounts"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "reminders_crm_contact_idx" ON "follow_up_reminders" ("crm_contact_id");
CREATE INDEX IF NOT EXISTS "reminders_acc_invoice_idx" ON "follow_up_reminders" ("acc_invoice_id");
CREATE INDEX IF NOT EXISTS "reminders_account_idx" ON "follow_up_reminders" ("account_id");
