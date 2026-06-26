import pkg from "pg";

const { Pool } = pkg;

export type NeonMigrationState = {
  status: "idle" | "running" | "completed" | "failed";
  startedAt: number | null;
  finishedAt: number | null;
  tablesTotal: number;
  tablesDone: number;
  rowsCopied: number;
  currentTable: string | null;
  recentLog: string[];
  error?: string;
};

const state: NeonMigrationState = {
  status: "idle",
  startedAt: null,
  finishedAt: null,
  tablesTotal: 0,
  tablesDone: 0,
  rowsCopied: 0,
  currentTable: null,
  recentLog: [],
  error: undefined,
};

function log(msg: string) {
  console.log("[NeonMigration]", msg);
  state.recentLog = [...state.recentLog.slice(-49), msg];
}

export function getNeonMigrationState(): NeonMigrationState {
  return { ...state };
}

const SKIP_TABLES = new Set([
  "sessions",
  "email_cache",
  "email_body_cache",
]);

const BATCH_SIZE = 100;

export function startNeonMigration(): { state: NeonMigrationState; startedNew: boolean } {
  if (state.status === "running") {
    return { state: getNeonMigrationState(), startedNew: false };
  }

  Object.assign(state, {
    status: "running",
    startedAt: Date.now(),
    finishedAt: null,
    tablesTotal: 0,
    tablesDone: 0,
    rowsCopied: 0,
    currentTable: null,
    recentLog: [],
    error: undefined,
  });

  runMigration().catch((err: any) => {
    state.status = "failed";
    state.error = err.message;
    state.finishedAt = Date.now();
    log(`Migration failed: ${err.message}`);
  });

  return { state: getNeonMigrationState(), startedNew: true };
}

async function runMigration() {
  // NEON_SOURCE_URL overrides DATABASE_URL so this tool keeps working even after
  // DATABASE_URL has been switched to Supabase during the cutover process.
  const neonUrl = process.env.NEON_SOURCE_URL ?? process.env.DATABASE_URL;
  // Prefer the pooler URL (works from any host including Railway) over the direct
  // IPv6-only URL (which is unreachable from Replit deployment containers).
  const supabaseUrl = process.env.SUPABASE_DB_URL ?? process.env.SUPABASE_DB_DIRECT_URL;

  if (!neonUrl) throw new Error("NEON_SOURCE_URL or DATABASE_URL (Neon source) not configured");
  if (!supabaseUrl) throw new Error("SUPABASE_DB_URL (Supabase destination) not configured");

  const neonPool = new Pool({
    connectionString: neonUrl,
    ssl: { rejectUnauthorized: false },
    max: 2,
    connectionTimeoutMillis: 15000,
  });

  const supabasePool = new Pool({
    connectionString: supabaseUrl,
    ssl: { rejectUnauthorized: false },
    max: 2,
    connectionTimeoutMillis: 20000,
  });

  try {
    log("Connected to Neon (source) and Supabase (destination)");

    const tablesResult = await neonPool.query<{ tablename: string }>(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    const tables = tablesResult.rows
      .map((r) => r.tablename)
      .filter((t) => !SKIP_TABLES.has(t));

    state.tablesTotal = tables.length;
    log(`Found ${tables.length} tables to migrate (${SKIP_TABLES.size} skipped)`);

    await supabasePool.query("SET session_replication_role = replica");
    log("FK triggers disabled");

    for (const tableName of tables) {
      state.currentTable = tableName;

      const countResult = await neonPool.query<{ count: string }>(
        `SELECT COUNT(*) FROM "${tableName}"`
      );
      const totalRows = parseInt(countResult.rows[0].count, 10);

      if (totalRows === 0) {
        log(`  [${tableName}] 0 rows — skipped`);
        state.tablesDone++;
        continue;
      }

      let offset = 0;
      let tableCopied = 0;

      while (offset < totalRows) {
        const rowsResult = await neonPool.query(
          `SELECT * FROM "${tableName}" LIMIT ${BATCH_SIZE} OFFSET ${offset}`
        );
        if (rowsResult.rows.length === 0) break;

        const rows = rowsResult.rows;
        const columns = Object.keys(rows[0]);
        if (columns.length === 0) { offset += BATCH_SIZE; continue; }

        const placeholders: string[] = [];
        const values: unknown[] = [];
        let paramIdx = 1;

        for (const row of rows) {
          const rowPlaceholders = columns.map(() => `$${paramIdx++}`);
          placeholders.push(`(${rowPlaceholders.join(", ")})`);
          for (const col of columns) {
            values.push(row[col]);
          }
        }

        const colList = columns.map((c) => `"${c}"`).join(", ");
        const sql = `INSERT INTO "${tableName}" (${colList}) VALUES ${placeholders.join(", ")} ON CONFLICT DO NOTHING`;

        await supabasePool.query(sql, values);
        tableCopied += rows.length;
        state.rowsCopied += rows.length;
        offset += BATCH_SIZE;
      }

      state.tablesDone++;
      log(`  [${tableName}] ${tableCopied} rows copied`);
    }

    await supabasePool.query("SET session_replication_role = DEFAULT");
    log("FK triggers re-enabled");

    log("Resetting sequences…");
    await resetSequences(supabasePool);

    state.status = "completed";
    state.finishedAt = Date.now();
    state.currentTable = null;
    log(`Done. ${state.rowsCopied} rows copied across ${state.tablesDone} tables`);
  } finally {
    await neonPool.end().catch(() => {});
    await supabasePool.end().catch(() => {});
  }
}

async function resetSequences(pool: InstanceType<typeof Pool>) {
  const seqResult = await pool.query<{
    seq_name: string;
    table_name: string;
    col_name: string;
  }>(`
    SELECT
      seq.relname  AS seq_name,
      tab.relname  AS table_name,
      att.attname  AS col_name
    FROM pg_class seq
    JOIN pg_depend dep ON dep.objid = seq.oid AND dep.deptype = 'a'
    JOIN pg_class tab ON tab.oid = dep.refobjid
    JOIN pg_attribute att
      ON att.attrelid = tab.oid AND att.attnum = dep.refobjsubid
    WHERE seq.relkind = 'S'
      AND tab.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  `);

  let reset = 0;
  for (const row of seqResult.rows) {
    try {
      await pool.query(
        `SELECT setval('${row.seq_name}',
           COALESCE((SELECT MAX("${row.col_name}") FROM "${row.table_name}"), 0) + 1,
           false)`
      );
      reset++;
    } catch (e: any) {
      log(`  Warning: could not reset sequence ${row.seq_name}: ${e.message}`);
    }
  }
  log(`Reset ${reset} sequences`);
}
