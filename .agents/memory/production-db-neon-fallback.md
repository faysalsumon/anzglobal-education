---
name: Production DB — Supabase (migrated from Neon)
description: Production app uses Supabase Postgres. Schema migrations must run against the Supabase DIRECT url (5432), not the pooler (6543). Neon is retained only as the migration source.
---

# Production Database is Supabase (migrated from Neon)

## The rule
The app's runtime database is **Supabase Postgres**. `server/db.ts` connects via
`DATABASE_URL`, which should be the Supabase **pooler** URL (port 6543) in Railway.

The legacy **Neon** database is retained ONLY as the data-migration source,
referenced by `NEON_SOURCE_URL` (see `server/neon-data-migration.ts`). Do not
treat Neon as the live database.

> History: this project originally ran on Neon under Replit. It was migrated to
> Supabase (DB + object storage) on Railway. An earlier version of this note
> claimed "production is Neon, Supabase is empty" — that is no longer true.

## Schema migrations must use the DIRECT url, not the pooler
`server/migrate.ts` runs DDL (CREATE/ALTER TABLE). pgBouncer in transaction mode
(the pooler on port 6543) does not support DDL, so migrations resolve a direct
(port 5432) connection in this order:

```
DATABASE_DIRECT_URL ?? SUPABASE_DB_DIRECT_URL ?? DATABASE_URL
```

In Railway, `SUPABASE_DB_DIRECT_URL` is the provisioned direct URL, so migrations
work without adding `DATABASE_DIRECT_URL`. Never point migrations at the pooler.

## Neon → Supabase data copy (one-time, admin-triggered)
- `POST /api/admin/migrate-neon-to-supabase` (CTO role) — copies data only,
  table-by-table, FK triggers disabled, sequences reset. Source `NEON_SOURCE_URL`
  → destination `SUPABASE_DB_URL`. Schema must already exist on Supabase first.
- `GET /api/admin/migrate-neon-to-supabase/status` — poll for progress.

## SSL
`rejectUnauthorized: false` in `server/db.ts` tolerates Bun/NixOS TLS
cert-parsing quirks. Supabase presents a valid public CA cert, so this can be
tightened to `true` once verified — unlike the old Neon constraint, it is no
longer strictly required.
