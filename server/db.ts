import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
import * as schema from "@shared/schema";

const { Pool } = pkg;

// Neon PostgreSQL — used in both development and production.
// Supabase is used for authentication only (not as the application database).
// rejectUnauthorized is false because Bun/NixOS environments fail to parse
// Neon's certificate name constraints in the TLS chain.
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("[DB] FATAL: DATABASE_URL is not set. All database operations will fail. Set this environment variable in Railway.");
}

export const pool = new Pool({
  connectionString: connectionString || 'postgresql://localhost/placeholder',
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('[DB] Pool error:', err.message);
});

export const db = drizzle({ client: pool, schema });

// Secondary pool for RLS-enforced queries (app_user role, no BYPASSRLS).
// Only created when APP_DB_URL is configured.
// Used by server/middleware/db-context.ts to attach res.locals.rlsDb to each
// authenticated request so routes can optionally use tenant-isolated queries.
//
// To activate:
//   1. In psql / SQL client: CREATE ROLE app_user WITH LOGIN PASSWORD '...';
//   2. Grant permissions (see migrations/0033_rls_app_role.sql for the full SQL).
//   3. Add APP_DB_URL to Replit environment secrets:
//        postgresql://app_user:<password>@<neon-host>/neondb?sslmode=require
let _appUserPool: InstanceType<typeof Pool> | null = null;

if (process.env.APP_DB_URL) {
  _appUserPool = new Pool({
    connectionString: process.env.APP_DB_URL,
    ssl: { rejectUnauthorized: false },
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
