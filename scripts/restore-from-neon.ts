/**
 * One-time restoration script: copies missing rows from old Neon database
 * into the production database using INSERT ... ON CONFLICT DO NOTHING.
 *
 * Required environment variables:
 *   NEON_DATABASE_URL  – connection string for the old (source) Neon database
 *   PROD_DATABASE_URL  – connection string for the production (destination) database
 *
 * Usage:
 *   npx tsx scripts/restore-from-neon.ts
 */

import pkg from "pg";
const { Pool } = pkg;

const NEON_DATABASE_URL = process.env.NEON_DATABASE_URL;
const PROD_DATABASE_URL = process.env.PROD_DATABASE_URL;

if (!NEON_DATABASE_URL) {
  console.error("ERROR: NEON_DATABASE_URL environment variable is not set.");
  process.exit(1);
}
if (!PROD_DATABASE_URL) {
  console.error("ERROR: PROD_DATABASE_URL environment variable is not set.");
  process.exit(1);
}

const sslConfig = { rejectUnauthorized: false };

const neonPool = new Pool({
  connectionString: NEON_DATABASE_URL,
  ssl: sslConfig,
  max: 3,
  connectionTimeoutMillis: 15000,
});

const prodPool = new Pool({
  connectionString: PROD_DATABASE_URL,
  ssl: sslConfig,
  max: 3,
  connectionTimeoutMillis: 15000,
});

const TABLES_IN_FK_ORDER: string[] = [
  // Tier 0 – standalone / self-referencing only
  "sessions",
  "regions",
  "student_pathways",
  "academic_qualification_types",
  "scraping_templates",
  "email_accounts",
  "email_cache",
  "email_body_cache",
  "sub_disciplines",
  "tags",
  "global_notification_defaults",

  // Tier 1 – depends on Tier 0
  "branches",
  "roles",
  "permissions",
  "profiles",
  "visa_requirements",
  "qualification_equivalencies",
  "course_level_requirement_templates",
  "course_specializations",

  // Tier 2 – users (self-ref + regions/branches)
  "users",
  "role_permissions",
  "profile_permissions",

  // Tier 3 – depends on users
  "ai_settings",
  "site_settings",
  "universities",
  "admin_team_members",
  "activity_logs",
  "notifications",
  "contact_submissions",
  "import_batches",
  "user_notification_overrides",
  "email_templates",
  "channels",
  "saved_filters",
  "api_keys",
  "invitations",
  "blogs",
  "testimonials",
  "faqs",
  "public_team_members",
  "content_snippets",
  "conversations",
  "contact_inquiries",
  "chat_conversations",
  "seo_metadata",
  "email_account_secrets",
  "email_account_access",
  "attendance_records",
  "localized_content",
  "api_key_usage_logs",

  // Tier 4 – depends on universities
  "scholarships",
  "institution_business_terms",
  "institution_documents",
  "institution_tags",
  "university_team_members",
  "scraping_jobs",

  // Tier 5 – student_profiles & courses
  "student_profiles",
  "courses",

  // Tier 6 – depends on courses / student_profiles
  "document_folders",
  "crm_contacts",
  "course_english_requirements",
  "course_pricing_config",
  "course_pricing_tiers",
  "course_scholarships",
  "course_tags",
  "course_intake_templates",
  "course_region_variants",
  "course_entry_requirements",
  "favorites",
  "course_comparisons",
  "course_recommendations",
  "referrals",
  "referral_invitations",
  "student_employments",
  "channel_members",
  "messages",
  "channel_messages",
  "chat_messages",
  "attendance_breaks",
  "profile_section_verifications",
  "profile_change_history",

  // Tier 7 – applications
  "applications",

  // Tier 8 – depends on applications
  "documents",
  "application_courses",
  "application_stage_history",
  "application_internal_notes",
  "application_notes",
  "tasks",
  "follow_up_reminders",
  "contact_status_history",
  "contact_notes",
  "contact_history",
  "institution_contacts",

  // Tier 9 – depends on documents / tasks / scraped
  "student_educations",
  "student_language_scores",
  "application_stage_documents",
  "document_comments",
  "document_requests",
  "application_profile_snapshots",
  "scraped_courses",
  "scraped_institutions",

  // Tier 10 – leaf tables
  "discovered_course_urls",
  "task_notes",
];

async function getRowCount(pool: InstanceType<typeof Pool>, table: string): Promise<number> {
  try {
    const res = await pool.query(`SELECT COUNT(*)::int AS cnt FROM "${table}"`);
    return res.rows[0].cnt;
  } catch {
    return -1;
  }
}

async function tableExists(pool: InstanceType<typeof Pool>, table: string): Promise<boolean> {
  try {
    const res = await pool.query(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = $1
       ) AS exists`,
      [table],
    );
    return res.rows[0].exists;
  } catch {
    return false;
  }
}

async function getColumns(pool: InstanceType<typeof Pool>, table: string): Promise<string[]> {
  const res = await pool.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1
     ORDER BY ordinal_position`,
    [table],
  );
  return res.rows.map((r: any) => r.column_name);
}

async function getPrimaryKeyColumns(pool: InstanceType<typeof Pool>, table: string): Promise<string[]> {
  const res = await pool.query(
    `SELECT kcu.column_name
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu
       ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
     WHERE tc.table_schema = 'public'
       AND tc.table_name = $1
       AND tc.constraint_type = 'PRIMARY KEY'
     ORDER BY kcu.ordinal_position`,
    [table],
  );
  return res.rows.map((r: any) => r.column_name);
}

async function restoreTable(table: string): Promise<{ before: number; after: number; inserted: number; skipped: boolean }> {
  const existsInNeon = await tableExists(neonPool, table);
  if (!existsInNeon) {
    return { before: -1, after: -1, inserted: 0, skipped: true };
  }

  const existsInProd = await tableExists(prodPool, table);
  if (!existsInProd) {
    return { before: -1, after: -1, inserted: 0, skipped: true };
  }

  const neonColumns = await getColumns(neonPool, table);
  const prodColumns = await getColumns(prodPool, table);
  const pkColumns = await getPrimaryKeyColumns(prodPool, table);

  if (pkColumns.length === 0) {
    console.warn(`  ⚠ No primary key found for "${table}", skipping.`);
    return { before: -1, after: -1, inserted: 0, skipped: true };
  }

  const commonColumns = neonColumns.filter((c) => prodColumns.includes(c));
  if (commonColumns.length === 0) {
    return { before: -1, after: -1, inserted: 0, skipped: true };
  }

  const before = await getRowCount(prodPool, table);

  const neonRows = await neonPool.query(`SELECT * FROM "${table}"`);
  if (neonRows.rows.length === 0) {
    return { before, after: before, inserted: 0, skipped: false };
  }

  const quotedCols = commonColumns.map((c) => `"${c}"`).join(", ");
  const conflictCols = pkColumns.map((c) => `"${c}"`).join(", ");

  let insertedCount = 0;
  const BATCH_SIZE = 100;

  for (let i = 0; i < neonRows.rows.length; i += BATCH_SIZE) {
    const batch = neonRows.rows.slice(i, i + BATCH_SIZE);
    const valuePlaceholders: string[] = [];
    const values: any[] = [];
    let paramIdx = 1;

    for (const row of batch) {
      const rowPlaceholders: string[] = [];
      for (const col of commonColumns) {
        rowPlaceholders.push(`$${paramIdx}`);
        values.push(row[col] !== undefined ? row[col] : null);
        paramIdx++;
      }
      valuePlaceholders.push(`(${rowPlaceholders.join(", ")})`);
    }

    const sql = `INSERT INTO "${table}" (${quotedCols})
                 VALUES ${valuePlaceholders.join(",\n       ")}
                 ON CONFLICT (${conflictCols}) DO NOTHING`;

    try {
      const result = await prodPool.query(sql, values);
      insertedCount += result.rowCount ?? 0;
    } catch (err: any) {
      console.error(`  ✗ Error inserting batch into "${table}": ${err.message}`);
      for (const row of batch) {
        const singlePlaceholders = commonColumns.map((_, idx) => `$${idx + 1}`);
        const singleValues = commonColumns.map((col) => row[col] !== undefined ? row[col] : null);
        const singleSql = `INSERT INTO "${table}" (${quotedCols})
                           VALUES (${singlePlaceholders.join(", ")})
                           ON CONFLICT (${conflictCols}) DO NOTHING`;
        try {
          const r = await prodPool.query(singleSql, singleValues);
          insertedCount += r.rowCount ?? 0;
        } catch (rowErr: any) {
          console.error(`    Row-level error in "${table}" (PK=${pkColumns.map((c) => row[c]).join(",")}): ${rowErr.message}`);
        }
      }
    }
  }

  const after = await getRowCount(prodPool, table);
  return { before, after, inserted: insertedCount, skipped: false };
}

async function main() {
  console.log("=".repeat(70));
  console.log("  NEON → PRODUCTION DATA RESTORATION");
  console.log("  One-time restore using INSERT ... ON CONFLICT DO NOTHING");
  console.log("=".repeat(70));
  console.log();

  try {
    await neonPool.query("SELECT 1");
    console.log("Connected to Neon (source) database.");
  } catch (err: any) {
    console.error(`Failed to connect to Neon database: ${err.message}`);
    process.exit(1);
  }

  try {
    await prodPool.query("SELECT 1");
    console.log("Connected to Production (destination) database.");
  } catch (err: any) {
    console.error(`Failed to connect to Production database: ${err.message}`);
    process.exit(1);
  }

  console.log();
  console.log(`Processing ${TABLES_IN_FK_ORDER.length} tables in foreign-key-safe order...`);
  console.log();

  const summary: Array<{
    table: string;
    before: number;
    after: number;
    inserted: number;
    skipped: boolean;
  }> = [];

  for (const table of TABLES_IN_FK_ORDER) {
    process.stdout.write(`  Restoring "${table}"...`);
    const result = await restoreTable(table);
    summary.push({ table, ...result });

    if (result.skipped) {
      console.log(" SKIPPED (table missing in source or destination)");
    } else if (result.inserted === 0) {
      console.log(` no new rows (${result.before} already present)`);
    } else {
      console.log(` +${result.inserted} rows (${result.before} → ${result.after})`);
    }
  }

  console.log();
  console.log("=".repeat(70));
  console.log("  RESTORATION SUMMARY");
  console.log("=".repeat(70));
  console.log();
  console.log(
    "Table".padEnd(45) +
    "Before".padStart(8) +
    "After".padStart(8) +
    "Inserted".padStart(10) +
    "  Status",
  );
  console.log("-".repeat(80));

  let totalInserted = 0;
  for (const row of summary) {
    if (row.skipped) {
      console.log(`${row.table.padEnd(45)}${"—".padStart(8)}${"—".padStart(8)}${"—".padStart(10)}  SKIPPED`);
    } else {
      totalInserted += row.inserted;
      const status = row.inserted > 0 ? "RESTORED" : "OK";
      console.log(
        `${row.table.padEnd(45)}${String(row.before).padStart(8)}${String(row.after).padStart(8)}${String(row.inserted).padStart(10)}  ${status}`,
      );
    }
  }

  console.log("-".repeat(80));
  console.log(`Total rows inserted: ${totalInserted}`);
  console.log();
  console.log("Restoration complete. Running again is safe (idempotent).");

  await neonPool.end();
  await prodPool.end();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
