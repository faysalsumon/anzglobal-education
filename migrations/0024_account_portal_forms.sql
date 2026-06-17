CREATE TABLE IF NOT EXISTS account_portal_forms (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  file_size integer,
  uploaded_by_id varchar REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS account_portal_forms_account_idx ON account_portal_forms(account_id);
