import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
import * as schema from "@shared/schema";
import https from "https";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const { Pool } = pkg;

// TODO: rejectUnauthorized is intentionally false even in production.
// Bun 1.0.23 on NixOS (Replit's runtime for both dev and deployed builds)
// fails to parse Neon's certificate name constraints with
// "unsupported name constraint type", so cert verification cannot be enabled
// here. Full TLS encryption is still active — only server certificate
// verification is skipped. Revisit once Bun's TLS CA-bundle handling is fixed:
// https://github.com/oven-sh/bun/issues/4398
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // see TODO above
  },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('[DB] Pool error:', err.message);
});

export const db = drizzle({ client: pool, schema });
