ALTER TABLE account_restricted_details
  ADD COLUMN IF NOT EXISTS has_application_portal boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS application_form text,
  ADD COLUMN IF NOT EXISTS portal_details text,
  ADD COLUMN IF NOT EXISTS portal_link text,
  ADD COLUMN IF NOT EXISTS portal_username text,
  ADD COLUMN IF NOT EXISTS portal_password text;
