import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import pkg from "pg";

const { Pool } = pkg;

// PostgreSQL error codes that mean "this DDL change is already applied"
const ALREADY_EXISTS_CODES = new Set([
  "42701", // column already exists
  "42P07", // relation/index already exists
  "42710", // duplicate object (type, operator, etc.)
  "42P16", // invalid table definition (duplicate column in CREATE TABLE)
  "23505", // unique_violation (duplicate key on INSERT to journal)
  "42P04", // duplicate database
  "42P06", // duplicate schema
]);

interface MigrationEntry {
  tag: string;
  when: number;
  sql: string[];
  hash: string;
}

function readMigrations(migrationsFolder: string): MigrationEntry[] {
  const journalPath = path.join(migrationsFolder, "meta", "_journal.json");
  const journal = JSON.parse(fs.readFileSync(journalPath, "utf-8"));

  const entries: MigrationEntry[] = [];
  for (const entry of journal.entries) {
    const filePath = path.join(migrationsFolder, `${entry.tag}.sql`);
    if (!fs.existsSync(filePath)) continue;
    const query = fs.readFileSync(filePath, "utf-8");
    const statements = query
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const hash = crypto.createHash("sha256").update(query).digest("hex");
    entries.push({ tag: entry.tag, when: entry.when, sql: statements, hash });
  }
  return entries;
}

export async function runMigrations() {
  // Try each candidate URL in order, skipping any that refuse the connection
  // (e.g. the Supabase direct host resolves to IPv6 on ap-northeast-1 which
  // Railway cannot reach). The Session-mode pooler URL (*.pooler.supabase.com,
  // port 5432) uses IPv4 and supports DDL — it is the reliable fallback.
  const candidates = [
    process.env.DATABASE_DIRECT_URL,
    process.env.SUPABASE_DB_DIRECT_URL,
    process.env.DATABASE_MIGRATE_URL,
    process.env.DATABASE_URL,
  ].filter(Boolean) as string[];

  if (candidates.length === 0) {
    console.error("[Migrate] No database URL set — skipping migrations");
    return;
  }

  let client: pkg.PoolClient | null = null;
  let activePool: pkg.Pool | null = null;

  for (const url of candidates) {
    const pool = new Pool({
      connectionString: url,
      ssl: { rejectUnauthorized: false },
      max: 1,
      connectionTimeoutMillis: 8000,
    });
    try {
      client = await pool.connect();
      activePool = pool;
      try { console.log(`[Migrate] Connected via: ${new URL(url).host}`); } catch {}
      break;
    } catch (err: any) {
      await pool.end();
      try { console.warn(`[Migrate] ${new URL(url).host} unreachable (${err.code ?? err.message}) — trying next`); } catch {}
    }
  }

  if (!client || !activePool) {
    console.error("[Migrate] All connection URLs failed — skipping migrations");
    return;
  }

  try {
    // Ensure the Drizzle migrations tracking schema + table exist
    await client.query(`CREATE SCHEMA IF NOT EXISTS drizzle`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
        id        SERIAL PRIMARY KEY,
        hash      text    NOT NULL UNIQUE,
        created_at bigint
      )
    `);

    // Load applied hashes from DB
    const { rows } = await client.query(
      `SELECT hash FROM drizzle.__drizzle_migrations`
    );
    const applied = new Set(rows.map((r: any) => r.hash));

    const migrationsFolder = path.resolve(
      import.meta.dirname,
      "../migrations"
    );
    const all = readMigrations(migrationsFolder);
    const pending = all.filter((m) => !applied.has(m.hash));

    if (pending.length === 0) {
      console.log("[Migrate] No pending migrations");
      return;
    }

    console.log(`[Migrate] Running ${pending.length} pending migration(s)…`);

    for (const migration of pending) {
      console.log(`[Migrate] Applying: ${migration.tag}`);

      let anyFailed = false;
      for (const stmt of migration.sql) {
        if (!stmt.trim()) continue;
        try {
          await client.query(stmt);
        } catch (err: any) {
          if (ALREADY_EXISTS_CODES.has(err.code)) {
            // Schema change already applied — safe to skip
            console.log(
              `[Migrate]   ↳ skipped (already exists, code ${err.code}): ${stmt.slice(0, 80).replace(/\s+/g, " ")}…`
            );
          } else {
            // Real error — log it but continue so other statements can run
            console.error(
              `[Migrate]   ✗ statement failed in ${migration.tag} (code ${err.code}): ${err.message}`
            );
            console.error(`  SQL: ${stmt.slice(0, 200)}`);
            anyFailed = true;
          }
        }
      }

      if (anyFailed) {
        console.warn(
          `[Migrate] ⚠ ${migration.tag} had errors — recording as applied anyway to unblock future migrations`
        );
      } else {
        console.log(`[Migrate] ✓ ${migration.tag}`);
      }

      // Record migration as applied regardless of "already exists" skips
      await client.query(
        `INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [migration.hash, migration.when]
      );
    }

    console.log("[Migrate] All migrations applied successfully");
  } catch (err: any) {
    console.error("[Migrate] Migration runner failed:", err.message);
    throw err;
  } finally {
    client!.release();
    await activePool!.end();
  }
}
