import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import pkg from "pg";
import * as schema from "@shared/schema";
import { pushSchema } from "drizzle-kit/api";

const { Pool } = pkg;

async function migrate() {
  if (!process.env.DATABASE_URL) {
    console.error("[AutoMigrate] DATABASE_URL not set, skipping.");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 2,
  });

  const db = drizzle({ client: pool, schema });

  console.log("[AutoMigrate] Checking database schema...");

  const result = await db.execute(sql`
    SELECT count(*)::int as cnt FROM pg_catalog.pg_tables
    WHERE schemaname = 'public'
  `);
  const tableCount = (result.rows[0] as { cnt: number }).cnt;

  if (tableCount >= 100) {
    console.log(
      `[AutoMigrate] ${tableCount} tables exist — schema looks complete.`,
    );
    await pool.end();
    return;
  }

  console.log(
    `[AutoMigrate] Only ${tableCount} tables found, running schema push...`,
  );

  const pushResult = await pushSchema(
    schema,
    db as Parameters<typeof pushSchema>[1],
  );

  if (
    !pushResult.statementsToExecute ||
    pushResult.statementsToExecute.length === 0
  ) {
    console.log("[AutoMigrate] No schema changes needed.");
    await pool.end();
    return;
  }

  console.log(
    `[AutoMigrate] Applying ${pushResult.statementsToExecute.length} statements...`,
  );
  await pushResult.apply();

  const verify = await db.execute(sql`
    SELECT count(*)::int as cnt FROM pg_catalog.pg_tables
    WHERE schemaname = 'public'
  `);
  const finalCount = (verify.rows[0] as { cnt: number }).cnt;
  console.log(`[AutoMigrate] Done — ${finalCount} tables now exist.`);

  await pool.end();
}

migrate().catch((err) => {
  console.error("[AutoMigrate] Migration failed:", err);
  process.exit(1);
});
