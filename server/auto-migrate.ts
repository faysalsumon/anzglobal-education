import { db } from "./db";
import { sql } from "drizzle-orm";
import * as schema from "@shared/schema";
import { pushSchema } from "drizzle-kit/api";

export async function autoMigrate(): Promise<void> {
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
    return;
  }

  console.log(
    `[AutoMigrate] Only ${tableCount} tables found, running schema push...`,
  );

  const pushResult = await pushSchema(schema, db as Parameters<typeof pushSchema>[1]);

  if (
    !pushResult.statementsToExecute ||
    pushResult.statementsToExecute.length === 0
  ) {
    console.log("[AutoMigrate] No schema changes needed.");
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
}
