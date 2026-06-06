ALTER TABLE crm_contacts
  ADD COLUMN IF NOT EXISTS sub_agent_account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL;
