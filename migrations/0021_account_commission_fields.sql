ALTER TABLE account_restricted_details
  ADD COLUMN IF NOT EXISTS commission_amount numeric(10,2),
  ADD COLUMN IF NOT EXISTS commission_percentage numeric(5,2);
