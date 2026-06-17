---
name: Drizzle DO block migration crash
description: PL/pgSQL DO $$ blocks in Drizzle migration SQL files crash the server at startup; approach and workarounds.
---

# PL/pgSQL DO $$ Blocks in Drizzle Migration Files

## The Rule
Never use `DO $$ BEGIN ... END $$` PL/pgSQL blocks inside Drizzle migration `.sql` files. They cause the server to fail to start (the port never opens).

**Why:** Drizzle's migrator splits SQL files on `--> statement-breakpoint` markers. The dollar-quoting used by PL/pgSQL blocks (`$$`) interacts badly with this splitting — the block either fails to parse or hangs the migrator, preventing the Express server from binding its port.

**How to apply:** When you need idempotent constraint creation (e.g. `ADD CONSTRAINT IF NOT EXISTS` which PostgreSQL does NOT support for foreign keys natively), use one of these alternatives instead:
1. Accept re-run risk and keep the constraint statement plain — if the migration hash matches the DB tracking table entry, the migration is skipped entirely.
2. Apply FK constraints manually via raw SQL outside of Drizzle migration files.
3. Create a separate, dedicated migration that handles idempotency at the application level in `server/migrate.ts`.

## What Happened
An attempt to make migration 0018 idempotent (for FK constraints) using DO $$ blocks caused the server to fail to start. Restoring the migration file to its original content (matching the hash in `drizzle.__drizzle_migrations`) resolved the crash immediately.
