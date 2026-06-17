ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS accounts_email text,
  ADD COLUMN IF NOT EXISTS admission_email text;
