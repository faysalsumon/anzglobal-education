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
  max: 2,
  connectionTimeoutMillis: 15000,
});

const devPool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 2,
  connectionTimeoutMillis: 15000,
});

async function main() {
  console.log("=".repeat(60));
  console.log("  NEON → DEV DB: User Profile Picture Sync");
  console.log("=".repeat(60));

  await neonPool.query("SELECT 1");
  console.log("Connected to Neon (source).");
  await devPool.query("SELECT 1");
  console.log("Connected to Dev DB (destination).\n");

  const neonUsers = await neonPool.query(
    `SELECT email, profile_image_url
     FROM users
     WHERE profile_image_url IS NOT NULL AND profile_image_url != ''
     ORDER BY email`,
  );
  console.log(`Neon users with profile images: ${neonUsers.rows.length}`);

  const devBefore = await devPool.query(
    `SELECT COUNT(*)::int AS cnt FROM users WHERE profile_image_url IS NOT NULL AND profile_image_url != ''`,
  );
  console.log(`Dev users with profile images (before): ${devBefore.rows[0].cnt}\n`);

  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  for (const row of neonUsers.rows) {
    const result = await devPool.query(
      `UPDATE users
       SET profile_image_url = $1
       WHERE LOWER(TRIM(email)) = LOWER(TRIM($2))
         AND (profile_image_url IS NULL OR TRIM(profile_image_url) = '')
       RETURNING email, first_name, last_name`,
      [row.profile_image_url, row.email],
    );

    if ((result.rowCount ?? 0) > 0) {
      const u = result.rows[0];
      console.log(`  Updated: ${u.email} (${u.first_name} ${u.last_name})`);
      updated++;
    } else {
      const exists = await devPool.query(
        `SELECT profile_image_url FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))`,
        [row.email],
      );
      if (exists.rows.length === 0) {
        console.log(`  Not found in dev: ${row.email}`);
        notFound++;
      } else {
        skipped++;
      }
    }
  }

  const devAfter = await devPool.query(
    `SELECT COUNT(*)::int AS cnt FROM users WHERE profile_image_url IS NOT NULL AND profile_image_url != ''`,
  );

  console.log("\n" + "=".repeat(60));
  console.log("  SYNC SUMMARY");
  console.log("=".repeat(60));
  console.log(`  Updated:    ${updated} users`);
  console.log(`  Skipped:    ${skipped} (already had a photo)`);
  console.log(`  Not found:  ${notFound} (email not in dev DB)`);
  console.log(`  Dev users with profile images: ${devBefore.rows[0].cnt} → ${devAfter.rows[0].cnt}`);
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
