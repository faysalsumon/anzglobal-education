import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pkg from "pg";
import path from "path";

const { Pool } = pkg;

export async function runMigrations() {
  // Neon is the application database in all environments.
  // Migrations use a dedicated single-connection pool (max: 1) to avoid
  // prepared-statement conflicts during DDL execution.
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error("[Migrate] DATABASE_URL not set — skipping migrations");
    return;
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
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
