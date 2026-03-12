import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import pkg from "pg";
import * as schema from "@shared/schema";
import { pushSchema } from "drizzle-kit/api";

const { Pool } = pkg;

const SAFE_PATTERNS = [
  /^CREATE\s+TABLE/i,
  /^CREATE\s+INDEX/i,
  /^CREATE\s+UNIQUE\s+INDEX/i,
  /^CREATE\s+TYPE/i,
  /^ALTER\s+TABLE\s+.*\s+ADD\s+COLUMN/i,
  /^ALTER\s+TABLE\s+.*\s+ADD\s+CONSTRAINT/i,
  /^DO\s+\$/i,
];

function isSafe(statement: string): boolean {
  return SAFE_PATTERNS.some((pattern) => pattern.test(statement.trim()));
}

async function migrate() {
  if (!process.env.DATABASE_URL) {
    console.error("[AutoMigrate] DATABASE_URL not set.");
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

  const statements = pushResult.statementsToExecute ?? [];

  if (statements.length === 0 && !pushResult.hasDataLoss) {
    console.log("[AutoMigrate] No schema changes needed.");
    await pool.end();
    return;
  }

  if (pushResult.hasDataLoss) {
    console.error("[AutoMigrate] DATA-LOSS DETECTED by drizzle-kit.");
    if (pushResult.warnings.length > 0) {
      console.error("[AutoMigrate] Warnings:");
      for (const w of pushResult.warnings) {
        console.error(`  WARNING: ${w}`);
      }
    }

    const safeStatements: string[] = [];
    const blockedStatements: string[] = [];

    for (const stmt of statements) {
      if (isSafe(stmt)) {
        safeStatements.push(stmt);
      } else {
        blockedStatements.push(stmt);
      }
    }

    if (blockedStatements.length > 0) {
      console.error(
        `[AutoMigrate] ${blockedStatements.length} statement(s) blocked (not confirmed safe):`,
      );
      for (const stmt of blockedStatements) {
        console.error(`  BLOCKED: ${stmt}`);
      }
    }

    if (safeStatements.length > 0) {
      console.log(
        `[AutoMigrate] Applying ${safeStatements.length} confirmed-safe statement(s)...`,
      );
      let applied = 0;
      let skipped = 0;
      for (const stmt of safeStatements) {
        try {
          await db.execute(sql.raw(stmt));
          applied++;
        } catch (err: unknown) {
          const cause = (err as { cause?: { code?: string } })?.cause;
          const pgCode = cause?.code ?? (err as { code?: string })?.code;
          if (pgCode === "42P07" || pgCode === "42710") {
            skipped++;
          } else {
            const msg =
              (err as { message?: string })?.message ?? String(err);
            console.error(`[AutoMigrate] Failed: ${stmt}`);
            console.error(`  Error [${pgCode ?? "unknown"}]: ${msg}`);
          }
        }
      }
      console.log(
        `[AutoMigrate] Safe statements: ${applied} applied, ${skipped} skipped (already exist).`,
      );
    }

    await pool.end();
    console.error(
      "[AutoMigrate] Build FAILED: data-loss detected. Review blocked statements above.",
    );
    console.error(
      "[AutoMigrate] To apply intentionally, run: bun x drizzle-kit push",
    );
    process.exit(1);
  }

  console.log(
    `[AutoMigrate] Applying ${statements.length} statement(s) (no data loss)...`,
  );
  let applied = 0;
  let skipped = 0;
  let failed = 0;
  for (const stmt of statements) {
    try {
      await db.execute(sql.raw(stmt));
      applied++;
    } catch (err: unknown) {
      const cause = (err as { cause?: { code?: string } })?.cause;
      const pgCode = cause?.code ?? (err as { code?: string })?.code;
      if (pgCode === "42P07" || pgCode === "42710") {
        skipped++;
      } else {
        failed++;
        const msg = (err as { message?: string })?.message ?? String(err);
        console.error(`[AutoMigrate] Failed: ${stmt}`);
        console.error(`  Error [${pgCode ?? "unknown"}]: ${msg}`);
      }
    }
  }
  console.log(
    `[AutoMigrate] Statements: ${applied} applied, ${skipped} skipped (already exist), ${failed} failed.`,
  );

  if (failed > 0) {
    await pool.end();
    console.error(
      `[AutoMigrate] Build FAILED: ${failed} statement(s) could not be applied.`,
    );
    process.exit(1);
  }

  console.log("[AutoMigrate] Schema push complete.");
  await pool.end();
}

migrate().catch((err) => {
  console.error("[AutoMigrate] Migration failed:", err);
  process.exit(1);
});
