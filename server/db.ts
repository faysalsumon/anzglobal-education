import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
import * as schema from "@shared/schema";

const { Pool } = pkg;

const isProduction = process.env.NODE_ENV === 'production';

// Production → Supabase PostgreSQL (SUPABASE_DB_URL, typically the session/transaction pooler).
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

const pool = new Pool({
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
