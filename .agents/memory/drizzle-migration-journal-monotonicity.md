---
name: Drizzle migration journal monotonicity + enum/DB drift
description: The migrator silently skips journal entries whose `when` timestamp is not greater than the max already-applied migration. Keep `when` strictly increasing. Enum/DB drift needs a hand-written forward migration.
---

# Drizzle migration journal monotonicity + enum/DB drift

## The silent-skip failure mode
This project's startup migrator (`server/migrate.ts` via drizzle-orm's migrator) applies a journal
entry **only if its `when` timestamp is greater than the `created_at` of the most-recently-applied
migration**. It does NOT compare by `idx` or filename order. So a migration whose `when` is LESS
than an earlier-applied one's timestamp is **silently skipped** — no error, no log, the migration
just never runs.

**Symptom:** runtime `column/table does not exist` 500s even though the migration `.sql` file and
its journal entry both exist and look applied. Confirm by comparing
`SELECT max(created_at) FROM drizzle.__drizzle_migrations` against each entry's `when` in
`migrations/meta/_journal.json`.

**This has bitten this repo more than once** (two separate migrations had `when` values below the
prior entry and were skipped on every environment, including fresh DBs).

**How to apply / fix:** Ensure `when` values in `_journal.json` are **strictly increasing in `idx`
order**. When a skipped migration needs to run on DBs already past it, bump its `when` to just above
the current max-applied timestamp so the migrator picks it up on next startup (idempotent SQL makes
this safe to re-run). When fixing fresh-DB ordering, set the offending entry's `when` between its
neighbors so fresh clones apply everything in sequence.

## SQL file exists but has no journal entry — also silently ignored
The Drizzle migrator **only runs migrations that appear in `_journal.json`**. A `.sql` file in
`migrations/` with no matching `tag` entry in the journal is completely invisible to the migrator
(no error, no warning). This happened with migrations 0021–0024: the SQL files existed on disk,
the Drizzle schema referenced the new columns, but the journal stopped at 0020, so the migrations
never ran and every query touching those columns 500'd.

**Symptom:** `column "x" does not exist` on a column that is in `schema.ts` and has a migration
`.sql` file, but `SELECT tag FROM drizzle.__drizzle_migrations` doesn't list that migration.

**Fix:** append the missing entries to `_journal.json` with `when` values strictly greater than
the current max. Because all these SQL files used `ADD COLUMN IF NOT EXISTS` / `CREATE TABLE IF NOT
EXISTS`, they are safe to apply even if a column was manually added in the interim.

**Root-cause guard:** whenever you create a new `.sql` migration file, always add its journal
entry to `_journal.json` in the same commit.

## Enum / DB drift can't be fixed by db:generate
`db:generate` only diffs `schema.ts` against the latest **snapshot**. If an enum's values exist in
both `schema.ts` and the snapshot but are missing from a deployed **DB** (because the migration that
added them was skipped), `db:generate` sees no diff and generates nothing. The drift is invisible to
drizzle-kit.

**Fix:** hand-write a forward migration:
1. `migrations/XXXX_name.sql` with `ALTER TYPE "enum" ADD VALUE IF NOT EXISTS '...';` (idempotent;
   one per `--> statement-breakpoint`).
2. Append a `_journal.json` entry with a `when` greater than the current max.
3. Create a chained snapshot `migrations/meta/XXXX_snapshot.json`: copy the previous snapshot, set a
   new random `id`, and set `prevId` to the previous snapshot's `id`. (Content is otherwise identical
   when the schema didn't actually change — this keeps future `db:generate` clean and the chain valid.)

`ALTER TYPE ... ADD VALUE` runs fine inside the migrator's per-migration transaction on Neon
(PostgreSQL 12+); the only PG rule is you can't *use* the new value in the same transaction, which
migrations don't do. Never use PL/pgSQL `DO $$` blocks in migration SQL (they crash startup).
