import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
import * as schema from "@shared/schema";

const { Pool } = pkg;

const isProduction = process.env.NODE_ENV === 'production';

// Production → Supabase PostgreSQL (SUPABASE_DB_URL, postgres/superuser role).
// The superuser has BYPASSRLS, so this pool is used for migrations, seeding, and
// admin operations where RLS must not interfere.
// Development → Neon (DATABASE_URL).
const connectionString = isProduction
  ? (process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL)
  : process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    isProduction
      ? "SUPABASE_DB_URL must be set in production."
      : "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}

// SSL is always enabled (encrypted connection).
// rejectUnauthorized is false in dev because Bun 1.x / NixOS fails to parse
// Neon's certificate name constraints. Supabase uses standard certs so strict
// verification works in production; override with DB_SSL_VERIFY=false if needed.
const sslRejectUnauthorized = isProduction
  ? process.env.DB_SSL_VERIFY !== 'false'
  : process.env.DB_SSL_VERIFY === 'true';

export const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: sslRejectUnauthorized },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('[DB] Pool error:', err.message);
});

export const db = drizzle({ client: pool, schema });

// Secondary pool for RLS-enforced queries (app_user role, no BYPASSRLS).
// Only created when APP_DB_URL is configured in production.
// Used by server/middleware/db-context.ts to attach res.locals.rlsDb to each
// authenticated request so routes can optionally use tenant-isolated queries.
//
// To activate:
//   1. Run migration 0033 on Supabase (creates app_user role).
//   2. In Supabase Dashboard > SQL Editor: ALTER ROLE app_user WITH LOGIN PASSWORD '...';
//   3. Add APP_DB_URL to Replit environment secrets:
//        postgresql://app_user:<password>@<host>:5432/<dbname>?sslmode=require
let _appUserPool: InstanceType<typeof Pool> | null = null;

if (isProduction && process.env.APP_DB_URL) {
  _appUserPool = new Pool({
    connectionString: process.env.APP_DB_URL,
    ssl: { rejectUnauthorized: sslRejectUnauthorized },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  _appUserPool.on('error', (err) => {
    console.error('[DB/AppUser] Pool error:', err.message);
  });
  console.log('[DB] app_user pool created — RLS will be enforced on tenant-scoped queries');
}

export const appUserPool: InstanceType<typeof Pool> | null = _appUserPool;
