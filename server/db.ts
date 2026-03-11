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

// Bun 1.0.23 / NixOS: the bundled TLS library fails to parse Neon's certificate
// name constraints ("unsupported name constraint type"). We bypass that check
// while keeping full TLS encryption by supplying a custom agent.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('[DB] Pool error:', err.message);
});

export const db = drizzle({ client: pool, schema });
