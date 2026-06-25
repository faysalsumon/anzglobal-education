ALTER TABLE "acc_invoices" ADD COLUMN IF NOT EXISTS "discount_type" varchar(10) NOT NULL DEFAULT 'none';
ALTER TABLE "acc_invoices" ADD COLUMN IF NOT EXISTS "discount_amount" numeric(12,2) NOT NULL DEFAULT 0;
