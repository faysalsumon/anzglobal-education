---
name: Production DB — Neon fallback & SSL
description: Production app uses Neon (DATABASE_URL) not Supabase; SUPABASE_DB_URL is IPv6-only and unreachable from Replit's deployment container.
---

# Production Database is Neon, not Supabase

## The rule
The production deployed app connects to Neon (`DATABASE_URL`) because `SUPABASE_DB_URL` is IPv6-only and Replit's deployment container has IPv6 disabled. The Supabase database (referenced by `SUPABASE_DB_URL` / `SUPABASE_DB_DIRECT_URL`) is empty — no schema has ever been applied there.

**Why:** `server/db.ts` falls back to `DATABASE_URL` when `SUPABASE_DB_URL` is unreachable. Migrations in `server/migrate.ts` also fail silently against `SUPABASE_DB_DIRECT_URL` for the same reason, so the Supabase DB remains empty.

**How to apply:** Never assume production is on Supabase. All 35 migrations + all data live on Neon. Any future migration to Supabase requires running all migrations there manually first.

## SSL cert fix (required)
Neon's cert chain fails `rejectUnauthorized: true` in Bun/NixOS (both dev and deployed containers). The fix in `server/db.ts`:

```typescript
const isSupabaseConnection = connectionString === process.env.SUPABASE_DB_URL;
const sslRejectUnauthorized = isSupabaseConnection
  ? process.env.DB_SSL_VERIFY !== 'false'
  : false;
```

Only enforce strict SSL for Supabase connections. Always use `rejectUnauthorized: false` for Neon (`DATABASE_URL`). Do NOT use a flat `isProduction ? true : false` pattern — it will break Neon in production.
