---
name: Accounts table UUID FK type
description: accounts.id and all account FK columns are uuid in BOTH the live DB and the Drizzle schema (aligned). New FKs to accounts.id must use uuid. Also covers drizzle migration tracking table location.
---

# Accounts table UUID FK type

## The rule
`accounts.id` is stored as `uuid` in the live DB. The Drizzle schema (`shared/schema.ts`) now
also declares it `uuid()`, along with every column that FKs to it. Any **new** column that FKs
to `accounts.id` must be `uuid` (not `text`/`varchar`) or PostgreSQL rejects the FK constraint
("cannot be implemented").

**Why:** `accounts.id` was originally created as `uuid` (early non-Drizzle config). The schema
historically mis-declared it as `text`, which (a) risked FK type-mismatch failures in raw SQL and
(b) made `db:generate` emit `text` for new account FK columns. Both schema and DB are now `uuid`,
so `db:generate` emits the correct type — no manual correction needed anymore.

**How to apply:** Declare new account FK columns as `uuid("...").references(() => accounts.id, ...)`.
The columns aligned to uuid: `accounts.id`, `accounts.indirect_partner_id`,
`account_restricted_details.account_id`, `account_products.account_id`,
`crm_contacts.sub_agent_account_id`, `crm_contacts.account_id`, `acc_invoices.account_id`,
`account_notes.account_id`. NOTE: `accounts.primary_contact_id` and `crm_contacts.referral_contact_id`
stay `text` — they FK to `crm_contacts.id` which is varchar/text, not uuid.

uuid() infers `string` in TS (same as text/varchar), so this is a DB-type-only concern — no
runtime, zod, or insert-schema changes result from switching a column between these types.

## Drizzle migration tracking
`__drizzle_migrations` lives in the `drizzle` schema (not `public`):
```sql
SELECT id, created_at FROM drizzle.__drizzle_migrations ORDER BY id DESC;
```
Each applied migration is recorded with the `when` value from `migrations/meta/_journal.json` as
its `created_at`. The migrator uses these timestamps to decide what to apply — see
`drizzle-migration-journal-monotonicity.md`.

## queryClient array key URL building
`buildUrlFromQueryKey` in `client/src/lib/queryClient.ts` joins string parts of a query key array
with `/`, so `["/api/admin/accounts", id, "notes"]` -> `/api/admin/accounts/${id}/notes`.
