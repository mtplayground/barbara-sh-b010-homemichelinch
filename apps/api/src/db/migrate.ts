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

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const defaultMigrationsDir = path.resolve(currentDir, "../../migrations");

interface MigrationQueryResult {
  rows: Array<{ version?: string }>;
}

export interface MigrationClient {
  connect(): Promise<void>;
  query(sql: string, values?: readonly unknown[]): Promise<MigrationQueryResult>;
  end(): Promise<void>;
}

interface MigrationLogger {
  log(message: string): void;
}

export interface RunMigrationsOptions {
  databaseUrl?: string;
  client?: MigrationClient;
  migrationsDir?: string;
  logger?: MigrationLogger;
}

export async function runMigrations(options: RunMigrationsOptions = {}) {
  const databaseUrl = postgresUrlSchema.parse(
    options.databaseUrl ?? process.env.DATABASE_URL,
  );
  const migrationsDir = options.migrationsDir ?? defaultMigrationsDir;
  const logger = options.logger ?? console;
  const client =
    options.client ?? new Client(createPostgresConnectionConfig(databaseUrl));
  const shouldCloseClient = !options.client;

  await client.connect();

  try {
    await client.query("BEGIN");
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const appliedResult = await client.query("SELECT version FROM schema_migrations");
    const appliedVersions = new Set(
      appliedResult.rows
        .map((row) => row.version)
        .filter((version): version is string => Boolean(version)),
    );

    for (const migrationFile of await readMigrations(migrationsDir)) {
      if (appliedVersions.has(migrationFile)) {
        continue;
      }

      const sql = await fs.readFile(path.join(migrationsDir, migrationFile), "utf8");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (version) VALUES ($1)", [
        migrationFile,
      ]);
      logger.log(`Applied migration ${migrationFile}`);
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    if (shouldCloseClient) {
      await client.end();
    }
  }
}

async function readMigrations(migrationsDir: string) {
  const entries = await fs.readdir(migrationsDir, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort();
}

if (path.resolve(process.argv[1] ?? "") === currentFile) {
  runMigrations().catch((error: unknown) => {
    console.error("Database migration failed", error);
    process.exitCode = 1;
  });
}
