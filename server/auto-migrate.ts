import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import pkg from "pg";
import * as schema from "@shared/schema";
import { pushSchema } from "drizzle-kit/api";

const { Pool } = pkg;

const DESTRUCTIVE_PATTERNS = [
  /^DROP\s+TABLE/i,
  /^DROP\s+INDEX/i,
  /^DROP\s+TYPE/i,
  /^ALTER\s+TABLE\s+.*\s+DROP\s+COLUMN/i,
  /^ALTER\s+TABLE\s+.*\s+ALTER\s+COLUMN\s+.*\s+SET\s+DATA\s+TYPE/i,
  /^ALTER\s+TABLE\s+.*\s+DROP\s+CONSTRAINT/i,
  /^TRUNCATE/i,
  /^DELETE\s+FROM/i,
];

function isDestructive(statement: string): boolean {
  return DESTRUCTIVE_PATTERNS.some((pattern) => pattern.test(statement.trim()));
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

  if (statements.length === 0) {
    console.log("[AutoMigrate] No schema changes needed.");
    await pool.end();
    return;
  }

  const safeStatements = statements.filter((s) => !isDestructive(s));
  const destructiveStatements = statements.filter((s) => isDestructive(s));

  if (pushResult.hasDataLoss || destructiveStatements.length > 0) {
    console.error(
      "[AutoMigrate] DATA-LOSS DETECTED — blocking destructive statements.",
    );
    console.error(
      `[AutoMigrate] ${destructiveStatements.length} destructive statement(s) blocked:`,
    );
    for (const stmt of destructiveStatements) {
      console.error(`  BLOCKED: ${stmt}`);
    }
    if (pushResult.warnings.length > 0) {
      console.error("[AutoMigrate] Warnings from drizzle-kit:");
      for (const w of pushResult.warnings) {
        console.error(`  WARNING: ${w}`);
      }
    }
    console.error(
      "[AutoMigrate] To apply destructive changes intentionally, run: bun x drizzle-kit push",
    );
  }

  if (safeStatements.length > 0) {
    console.log(
      `[AutoMigrate] Applying ${safeStatements.length} safe statement(s)...`,
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
          console.error(`[AutoMigrate] Statement failed: ${stmt}`);
          console.error(`  Error [${pgCode ?? "unknown"}]: ${msg}`);
          skipped++;
        }
      }
    }
    console.log(
      `[AutoMigrate] Safe statements: ${applied} applied, ${skipped} skipped (already exist).`,
    );
  }

  if (destructiveStatements.length > 0) {
    await pool.end();
    console.error(
      "[AutoMigrate] Build failed: destructive schema changes require manual review.",
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
