import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pkg from "pg";
import path from "path";

const { Pool } = pkg;

export async function runMigrations() {
  const isProduction = process.env.NODE_ENV === 'production';

  // For migrations we need a direct (non-pooler) connection so that DDL
  // statements and prepared statements used by the migrator work reliably.
  // In production: prefer SUPABASE_DB_DIRECT_URL (port 5432, direct connection).
  // Fall back to SUPABASE_DB_URL if the direct URL isn't configured yet.
  // In development: use DATABASE_URL (Neon).
  let connectionString: string | undefined;
  if (isProduction) {
    connectionString = process.env.SUPABASE_DB_DIRECT_URL ?? process.env.SUPABASE_DB_URL;
  } else {
    connectionString = process.env.DATABASE_URL;
  }

  if (!connectionString) {
    console.error("[Migrate] No database URL found — skipping migrations");
    return;
  }

  // Supabase direct URL needs SSL. In dev Bun/NixOS has TLS cert issues with Neon
  // so we skip verification. In production Supabase uses standard certs.
  const sslRejectUnauthorized = isProduction
    ? process.env.DB_SSL_VERIFY !== 'false'
    : false;

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: sslRejectUnauthorized },
    max: 1,
    connectionTimeoutMillis: 20000,
  });

  try {
    const db = drizzle({ client: pool });
    const migrationsFolder = path.resolve(import.meta.dirname, "../migrations");

    console.log("[Migrate] Running pending migrations…");
    await migrate(db, { migrationsFolder });
    console.log("[Migrate] All migrations applied successfully");
  } catch (err: any) {
    if (err.message?.includes("No migrations to run")) {
      console.log("[Migrate] No pending migrations");
    } else {
      console.error("[Migrate] Migration failed:", err);
      throw err;
    }
  } finally {
    await pool.end();
  }
}
