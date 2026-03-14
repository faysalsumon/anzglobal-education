import pkg from "pg";
const { Pool } = pkg;

const NEON_DATABASE_URL = process.env.NEON_DATABASE_URL;
const DATABASE_URL = process.env.DATABASE_URL;

if (!NEON_DATABASE_URL) {
  console.error("ERROR: NEON_DATABASE_URL not set.");
  process.exit(1);
}
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL not set.");
  process.exit(1);
}

const neonPool = new Pool({
  connectionString: NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
  connectionTimeoutMillis: 15000,
});

const devPool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
  connectionTimeoutMillis: 15000,
});

const USER_FK_COLS = new Set([
  "user_id",
  "created_by_user_id",
  "updated_by_user_id",
  "assigned_to_user_id",
  "published_by_user_id",
  "approved_by",
]);

async function getColumns(pool: InstanceType<typeof Pool>, table: string): Promise<string[]> {
  const res = await pool.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1
     ORDER BY ordinal_position`,
    [table],
  );
  return res.rows.map((r: any) => r.column_name);
}

async function getJsonbColumns(pool: InstanceType<typeof Pool>, table: string): Promise<Set<string>> {
  const res = await pool.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND data_type = 'jsonb'`,
    [table],
  );
  return new Set(res.rows.map((r: any) => r.column_name));
}

function serializeValue(val: any, col: string, jsonbCols: Set<string>): any {
  if (val === null || val === undefined) return null;
  if (jsonbCols.has(col) && typeof val === "object") {
    return JSON.stringify(val);
  }
  return val;
}

async function getCount(pool: InstanceType<typeof Pool>, table: string): Promise<number> {
  const res = await pool.query(`SELECT COUNT(*)::int AS cnt FROM "${table}"`);
  return res.rows[0].cnt;
}

async function main() {
  console.log("=".repeat(60));
  console.log("  NEON → DEV DB: Institution & Course Restoration");
  console.log("=".repeat(60));

  await neonPool.query("SELECT 1");
  console.log("Connected to Neon (source).");
  await devPool.query("SELECT 1");
  console.log("Connected to Dev DB (destination).");
  console.log();

  const uniBefore = await getCount(devPool, "universities");
  const courseBefore = await getCount(devPool, "courses");
  console.log(`Before: ${uniBefore} universities, ${courseBefore} courses in dev DB`);

  console.log("\n--- Step 1: Clear orphaned dev data ---");

  const devUnis = await devPool.query("SELECT id, name FROM universities");
  if (devUnis.rows.length > 0) {
    const devIds = devUnis.rows.map((r: any) => r.id);

    const depTables = [
      "course_english_requirements",
      "course_pricing_tiers",
      "course_pricing_config",
      "course_scholarships",
      "course_tags",
      "course_intake_templates",
      "course_region_variants",
      "course_entry_requirements",
      "favorites",
      "course_comparisons",
      "course_recommendations",
      "application_courses",
    ];

    const devCourseIds = await devPool.query(
      `SELECT id FROM courses WHERE university_id = ANY($1)`,
      [devIds],
    );
    const courseIds = devCourseIds.rows.map((r: any) => r.id);

    if (courseIds.length > 0) {
      for (const depTable of depTables) {
        try {
          const colCheck = await devPool.query(
            `SELECT column_name FROM information_schema.columns
             WHERE table_name = $1 AND column_name = 'course_id'`,
            [depTable],
          );
          if (colCheck.rows.length > 0) {
            const del = await devPool.query(
              `DELETE FROM "${depTable}" WHERE course_id = ANY($1)`,
              [courseIds],
            );
            if ((del.rowCount ?? 0) > 0) {
              console.log(`  Cleared ${del.rowCount} rows from ${depTable}`);
            }
          }
        } catch {
          // table might not exist
        }
      }
    }

    const coursesDel = await devPool.query(
      `DELETE FROM courses WHERE university_id = ANY($1)`,
      [devIds],
    );
    console.log(`  Deleted ${coursesDel.rowCount} courses linked to dev universities`);

    const uniDepTables = [
      "scholarships",
      "institution_business_terms",
      "institution_documents",
      "institution_tags",
      "university_team_members",
      "scraping_jobs",
      "seo_metadata",
    ];
    for (const depTable of uniDepTables) {
      try {
        const colCheck = await devPool.query(
          `SELECT column_name FROM information_schema.columns
           WHERE table_name = $1 AND column_name = 'university_id'`,
          [depTable],
        );
        if (colCheck.rows.length > 0) {
          const del = await devPool.query(
            `DELETE FROM "${depTable}" WHERE university_id = ANY($1)`,
            [devIds],
          );
          if ((del.rowCount ?? 0) > 0) {
            console.log(`  Cleared ${del.rowCount} rows from ${depTable}`);
          }
        }
      } catch {
        // table might not exist
      }
    }

    const uniDel = await devPool.query(
      `DELETE FROM universities WHERE id = ANY($1)`,
      [devIds],
    );
    console.log(`  Deleted ${uniDel.rowCount} orphaned universities`);
  } else {
    console.log("  No existing universities to clear.");
  }

  console.log("\n--- Step 2: Import universities from Neon ---");
  const neonUniCols = await getColumns(neonPool, "universities");
  const devUniCols = await getColumns(devPool, "universities");
  const commonUniCols = neonUniCols.filter((c) => devUniCols.includes(c));
  const uniJsonbCols = await getJsonbColumns(devPool, "universities");
  console.log(`  Common columns: ${commonUniCols.length}/${neonUniCols.length} Neon, ${devUniCols.length} dev`);
  console.log(`  JSONB columns: ${[...uniJsonbCols].join(", ")}`);

  const neonUnis = await neonPool.query("SELECT * FROM universities ORDER BY name");
  console.log(`  Fetched ${neonUnis.rows.length} universities from Neon`);

  let uniInserted = 0;
  for (const row of neonUnis.rows) {
    const values: any[] = [];
    const placeholders: string[] = [];

    for (let i = 0; i < commonUniCols.length; i++) {
      const col = commonUniCols[i];
      let val = row[col] !== undefined ? row[col] : null;
      if (USER_FK_COLS.has(col)) val = null;
      val = serializeValue(val, col, uniJsonbCols);
      values.push(val);
      placeholders.push(`$${i + 1}`);
    }

    const quotedCols = commonUniCols.map((c) => `"${c}"`).join(", ");
    const sql = `INSERT INTO universities (${quotedCols})
                 VALUES (${placeholders.join(", ")})
                 ON CONFLICT (id) DO NOTHING`;

    try {
      const r = await devPool.query(sql, values);
      if ((r.rowCount ?? 0) > 0) {
        uniInserted++;
      }
    } catch (err: any) {
      console.error(`  FAILED ${row.name}: ${err.message.slice(0, 120)}`);
    }
  }
  console.log(`  Inserted ${uniInserted}/${neonUnis.rows.length} universities`);

  console.log("\n--- Step 3: Import courses from Neon ---");
  const neonCourseCols = await getColumns(neonPool, "courses");
  const devCourseCols = await getColumns(devPool, "courses");
  const commonCourseCols = neonCourseCols.filter((c) => devCourseCols.includes(c));
  const courseJsonbCols = await getJsonbColumns(devPool, "courses");

  const neonOnlyCols = neonCourseCols.filter((c) => !devCourseCols.includes(c));
  const devOnlyCols = devCourseCols.filter((c) => !neonCourseCols.includes(c));
  if (neonOnlyCols.length > 0) {
    console.log(`  Neon-only columns (skipped): ${neonOnlyCols.join(", ")}`);
  }
  if (devOnlyCols.length > 0) {
    console.log(`  Dev-only columns (default): ${devOnlyCols.join(", ")}`);
  }
  console.log(`  Common columns: ${commonCourseCols.length}`);
  console.log(`  JSONB columns: ${[...courseJsonbCols].join(", ")}`);

  const devUniIds = await devPool.query("SELECT id FROM universities");
  const validUniIds = new Set(devUniIds.rows.map((r: any) => r.id));

  const devSubDisciplines = await devPool.query("SELECT id FROM sub_disciplines");
  const validSubDisciplineIds = new Set(devSubDisciplines.rows.map((r: any) => String(r.id)));

  const neonCourses = await neonPool.query("SELECT * FROM courses ORDER BY title");
  console.log(`  Fetched ${neonCourses.rows.length} courses from Neon`);

  let courseInserted = 0;
  let courseSkipped = 0;
  for (const row of neonCourses.rows) {
    if (!validUniIds.has(row.university_id)) {
      courseSkipped++;
      continue;
    }

    const values: any[] = [];
    const placeholders: string[] = [];

    for (let i = 0; i < commonCourseCols.length; i++) {
      const col = commonCourseCols[i];
      let val = row[col] !== undefined ? row[col] : null;
      if (USER_FK_COLS.has(col)) val = null;
      if (col === "sub_discipline_id" && val !== null && !validSubDisciplineIds.has(String(val))) {
        val = null;
      }
      val = serializeValue(val, col, courseJsonbCols);
      values.push(val);
      placeholders.push(`$${i + 1}`);
    }

    const quotedCols = commonCourseCols.map((c) => `"${c}"`).join(", ");
    const sql = `INSERT INTO courses (${quotedCols})
                 VALUES (${placeholders.join(", ")})
                 ON CONFLICT (id) DO NOTHING`;

    try {
      const r = await devPool.query(sql, values);
      if ((r.rowCount ?? 0) > 0) {
        courseInserted++;
      }
    } catch (err: any) {
      console.error(`  FAILED course "${row.title?.slice(0, 40)}": ${err.message.slice(0, 120)}`);
    }
  }
  console.log(`  Inserted ${courseInserted}/${neonCourses.rows.length} courses (${courseSkipped} skipped - missing university)`);

  console.log("\n--- Step 4: Import related data ---");
  const relatedTables = [
    "scholarships",
    "institution_business_terms",
    "institution_documents",
    "institution_tags",
  ];

  for (const table of relatedTables) {
    try {
      const neonCols = await getColumns(neonPool, table);
      const devCols = await getColumns(devPool, table);
      const common = neonCols.filter((c) => devCols.includes(c));
      if (common.length === 0) continue;

      const jsonbCols = await getJsonbColumns(devPool, table);

      const neonRows = await neonPool.query(`SELECT * FROM "${table}"`);
      if (neonRows.rows.length === 0) {
        console.log(`  ${table}: 0 rows in Neon`);
        continue;
      }

      let inserted = 0;
      for (const row of neonRows.rows) {
        if (row.university_id && !validUniIds.has(row.university_id)) continue;

        const values: any[] = [];
        const placeholders: string[] = [];
        for (let i = 0; i < common.length; i++) {
          const col = common[i];
          let val = row[col] !== undefined ? row[col] : null;
          if (USER_FK_COLS.has(col)) val = null;
          val = serializeValue(val, col, jsonbCols);
          values.push(val);
          placeholders.push(`$${i + 1}`);
        }

        const quotedCols = common.map((c) => `"${c}"`).join(", ");
        const sql = `INSERT INTO "${table}" (${quotedCols})
                     VALUES (${placeholders.join(", ")})
                     ON CONFLICT DO NOTHING`;

        try {
          const r = await devPool.query(sql, values);
          inserted += r.rowCount ?? 0;
        } catch {
          // skip conflicts
        }
      }
      console.log(`  ${table}: +${inserted} rows`);
    } catch {
      console.log(`  ${table}: skipped (table not found)`);
    }
  }

  const uniAfter = await getCount(devPool, "universities");
  const courseAfter = await getCount(devPool, "courses");

  const publishedUnis = await devPool.query(
    `SELECT COUNT(*)::int AS cnt FROM universities WHERE publish_status='published' AND approval_status='approved' AND is_active=true`,
  );
  const publishedCourses = await devPool.query(
    `SELECT COUNT(*)::int AS cnt FROM courses WHERE publish_status='published' AND approval_status='approved' AND is_active=true`,
  );
  const unisWithLogos = await devPool.query(
    `SELECT COUNT(*)::int AS cnt FROM universities WHERE logo IS NOT NULL AND logo != ''`,
  );

  console.log("\n" + "=".repeat(60));
  console.log("  RESTORATION SUMMARY");
  console.log("=".repeat(60));
  console.log(`  Universities: ${uniBefore} → ${uniAfter} (${uniInserted} inserted)`);
  console.log(`  Courses:      ${courseBefore} → ${courseAfter} (${courseInserted} inserted)`);
  console.log(`  Published universities: ${publishedUnis.rows[0].cnt}`);
  console.log(`  Published courses:      ${publishedCourses.rows[0].cnt}`);
  console.log(`  Universities with logos: ${unisWithLogos.rows[0].cnt}`);
  console.log("=".repeat(60));

  await neonPool.end();
  await devPool.end();
}

try {
  await main();
} catch (err: any) {
  console.error("Fatal error:", err.message);
  console.error(err.stack);
  process.exit(1);
}
