import dotenv from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";
import { z } from "zod";

import { createPostgresConnectionConfig } from "./connection.js";

dotenv.config({ quiet: true });

const postgresUrlSchema = z
  .string()
  .min(1)
  .refine(
    (value) => {
      try {
        const parsed = new URL(value);
        return parsed.protocol === "postgres:" || parsed.protocol === "postgresql:";
      } catch {
        return false;
      }
    },
    { message: "DATABASE_URL must be a valid PostgreSQL connection URL" },
  );

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(currentDir, "../../migrations");

async function readMigrations() {
  const entries = await fs.readdir(migrationsDir, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort();
}

async function runMigrations() {
  const databaseUrl = postgresUrlSchema.parse(process.env.DATABASE_URL);
  const client = new Client(createPostgresConnectionConfig(databaseUrl));

  await client.connect();

  try {
    await client.query("BEGIN");
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const appliedResult = await client.query<{ version: string }>(
      "SELECT version FROM schema_migrations",
    );
    const appliedVersions = new Set(appliedResult.rows.map((row) => row.version));

    for (const migrationFile of await readMigrations()) {
      if (appliedVersions.has(migrationFile)) {
        continue;
      }

      const sql = await fs.readFile(path.join(migrationsDir, migrationFile), "utf8");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (version) VALUES ($1)", [
        migrationFile,
      ]);
      console.log(`Applied migration ${migrationFile}`);
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

runMigrations().catch((error: unknown) => {
  console.error("Database migration failed", error);
  process.exitCode = 1;
});
