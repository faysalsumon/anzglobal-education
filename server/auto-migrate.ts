import { db } from "./db";
import { sql } from "drizzle-orm";
import { getTableConfig, PgTable } from "drizzle-orm/pg-core";
import { is } from "drizzle-orm";
import * as schema from "@shared/schema";

function columnToSQL(col: any): string {
  const name = col.name;
  let typeParts: string[] = [];
  const ct = col.columnType;

  if (ct === "PgSerial") typeParts.push("SERIAL");
  else if (ct === "PgInteger") typeParts.push("INTEGER");
  else if (ct === "PgBigSerial53") typeParts.push("BIGSERIAL");
  else if (ct === "PgBigInt53") typeParts.push("BIGINT");
  else if (ct === "PgSmallInt") typeParts.push("SMALLINT");
  else if (ct === "PgVarchar") typeParts.push("VARCHAR");
  else if (ct === "PgText") typeParts.push("TEXT");
  else if (ct === "PgBoolean") typeParts.push("BOOLEAN");
  else if (ct === "PgTimestamp") typeParts.push("TIMESTAMP");
  else if (ct === "PgJsonb") typeParts.push("JSONB");
  else if (ct === "PgJson") typeParts.push("JSON");
  else if (ct === "PgDate") typeParts.push("DATE");
  else if (ct === "PgNumeric") typeParts.push("NUMERIC");
  else if (ct === "PgReal") typeParts.push("REAL");
  else if (ct === "PgDoublePrecision") typeParts.push("DOUBLE PRECISION");
  else if (ct === "PgUUID") typeParts.push("UUID");
  else typeParts.push("TEXT");

  if (col.isArray) typeParts.push("[]");

  let def = `"${name}" ${typeParts.join("")}`;

  if (col.primary) def += " PRIMARY KEY";
  if (col.notNull && !col.primary) def += " NOT NULL";
  if (col.isUnique) def += " UNIQUE";

  if (col.hasDefault) {
    const dv = col.default;
    if (dv !== undefined && dv !== null) {
      if (typeof dv === "object" && dv.queryChunks) {
        try {
          const chunks = dv.queryChunks || [];
          let sqlStr = "";
          for (const chunk of chunks) {
            if (chunk && chunk.value) {
              if (Array.isArray(chunk.value)) {
                sqlStr += chunk.value.join("");
              } else {
                sqlStr += String(chunk.value);
              }
            }
          }
          if (sqlStr) def += ` DEFAULT ${sqlStr}`;
        } catch {}
      } else if (typeof dv === "string") {
        def += ` DEFAULT '${dv.replace(/'/g, "''")}'`;
      } else if (typeof dv === "boolean") {
        def += ` DEFAULT ${dv}`;
      } else if (typeof dv === "number") {
        def += ` DEFAULT ${dv}`;
      }
    }
  }

  return def;
}

export async function autoMigrate(): Promise<void> {
  console.log("[AutoMigrate] Checking database schema...");

  const result = await db.execute(sql`
    SELECT tablename FROM pg_catalog.pg_tables
    WHERE schemaname = 'public' ORDER BY tablename
  `);
  const existingTables = new Set(
    result.rows.map((r: any) => r.tablename),
  );

  const tables: Array<{ key: string; value: any }> = [];
  for (const [key, value] of Object.entries(schema)) {
    if (is(value, PgTable)) {
      tables.push({ key, value });
    }
  }

  const missingTables = tables.filter((t) => {
    const config = getTableConfig(t.value as any);
    return !existingTables.has(config.name);
  });

  if (missingTables.length === 0) {
    console.log(
      `[AutoMigrate] All ${tables.length} tables exist — no migration needed.`,
    );
    return;
  }

  console.log(
    `[AutoMigrate] ${missingTables.length} tables missing, creating...`,
  );

  for (const [key, value] of Object.entries(schema)) {
    const v = value as any;
    if (v && v.enumName && v.enumValues && Array.isArray(v.enumValues)) {
      const values = v.enumValues
        .map((val: string) => `'${val}'`)
        .join(", ");
      try {
        await db.execute(
          sql.raw(
            `DO $$ BEGIN CREATE TYPE "${v.enumName}" AS ENUM (${values}); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
          ),
        );
      } catch {}
    }
  }

  let created = 0;
  let failed = 0;

  for (const t of missingTables) {
    const config = getTableConfig(t.value as any);
    try {
      const colDefs = config.columns.map((col) => {
        const c = col as any;
        if (c.columnType === "PgEnumColumn" && c.enum) {
          let def = `"${c.name}" "${c.enum.enumName}"`;
          if (c.isArray) def += "[]";
          if (c.primary) def += " PRIMARY KEY";
          if (c.notNull && !c.primary) def += " NOT NULL";
          if (c.isUnique) def += " UNIQUE";
          if (
            c.hasDefault &&
            c.default !== undefined &&
            c.default !== null
          ) {
            if (typeof c.default === "string") {
              def += ` DEFAULT '${c.default.replace(/'/g, "''")}'`;
            }
          }
          return def;
        }
        return columnToSQL(c);
      });

      const createSQL = `CREATE TABLE IF NOT EXISTS "${config.name}" (\n  ${colDefs.join(",\n  ")}\n)`;
      await db.execute(sql.raw(createSQL));
      created++;
    } catch (err: any) {
      failed++;
      console.error(
        `[AutoMigrate] Failed to create ${config.name}: ${err.message}`,
      );
    }
  }

  try {
    await db.execute(
      sql.raw(
        `CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "sessions" ("expire")`,
      ),
    );
  } catch {}

  console.log(
    `[AutoMigrate] Done — created ${created} tables${failed > 0 ? `, ${failed} failed` : ""}.`,
  );
}
