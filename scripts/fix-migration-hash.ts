import pkg from "pg";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
  connectionTimeoutMillis: 10000,
});

const content = fs.readFileSync(
  path.resolve(import.meta.dirname, "../migrations/0018_lucky_iron_lad.sql"),
  "utf8"
);
const newHash = crypto.createHash("sha256").update(content).digest("hex");
console.log("New hash:", newHash);

const r = await pool.query(
  "UPDATE drizzle.__drizzle_migrations SET hash = $1 WHERE id = 18 RETURNING id, hash",
  [newHash]
);
console.log("Updated:", r.rows);
await pool.end();
