ALTER TABLE "acc_customers" ADD COLUMN "account_id" uuid REFERENCES "accounts"("id") ON DELETE SET NULL;
