import { drizzle } from "drizzle-orm/node-postgres";
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

  console.log("[AutoMigrate] Running schema push...");

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
  console.log("[AutoMigrate] Schema push complete.");

  await pool.end();
}

migrate().catch((err) => {
  console.error("[AutoMigrate] Migration failed:", err);
  process.exit(1);
});
