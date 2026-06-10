import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { type MigrationClient, runMigrations } from "./migrate.js";

const databaseUrl = "postgresql://user:pass@example.com:5432/app";

test("runMigrations applies pending SQL files in sorted order", async () => {
  const migrationsDir = await createMigrationDir({
    "0002_second.sql": "SELECT 'second'",
    "0001_first.sql": "SELECT 'first'",
  });
  const client = new FakeMigrationClient();
  const logs: string[] = [];

  try {
    await runMigrations({
      databaseUrl,
      client,
      migrationsDir,
      logger: {
        log(message) {
          logs.push(message);
        },
      },
    });
  } finally {
    await fs.rm(migrationsDir, { recursive: true, force: true });
  }

  assert.equal(client.connected, true);
  assert.equal(client.ended, false);
  assert.deepEqual(
    client.queries.map((query) => query.sql.trim()),
    [
      "BEGIN",
      "CREATE TABLE IF NOT EXISTS schema_migrations (\n        version TEXT PRIMARY KEY,\n        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()\n      )",
      "SELECT version FROM schema_migrations",
      "SELECT 'first'",
      "INSERT INTO schema_migrations (version) VALUES ($1)",
      "SELECT 'second'",
      "INSERT INTO schema_migrations (version) VALUES ($1)",
      "COMMIT",
    ],
  );
  assert.deepEqual(logs, [
    "Applied migration 0001_first.sql",
    "Applied migration 0002_second.sql",
  ]);
});

test("runMigrations skips versions already recorded in schema_migrations", async () => {
  const migrationsDir = await createMigrationDir({
    "0001_first.sql": "SELECT 'first'",
    "0002_second.sql": "SELECT 'second'",
  });
  const client = new FakeMigrationClient(["0001_first.sql"]);

  try {
    await runMigrations({
      databaseUrl,
      client,
      migrationsDir,
      logger: { log() {} },
    });
  } finally {
    await fs.rm(migrationsDir, { recursive: true, force: true });
  }

  assert.equal(
    client.queries.some((query) => query.sql.includes("SELECT 'first'")),
    false,
  );
  assert.equal(
    client.queries.some((query) => query.sql.includes("SELECT 'second'")),
    true,
  );
});

test("runMigrations rolls back and rethrows when a migration fails", async () => {
  const migrationsDir = await createMigrationDir({
    "0001_first.sql": "SELECT 'first'",
  });
  const client = new FakeMigrationClient([], "SELECT 'first'");

  try {
    await assert.rejects(
      () =>
        runMigrations({
          databaseUrl,
          client,
          migrationsDir,
          logger: { log() {} },
        }),
      /migration boom/,
    );
  } finally {
    await fs.rm(migrationsDir, { recursive: true, force: true });
  }

  assert.equal(client.queries.at(-1)?.sql, "ROLLBACK");
});

async function createMigrationDir(files: Record<string, string>) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "dish-guide-migrations-"));

  await Promise.all(
    Object.entries(files).map(([fileName, sql]) =>
      fs.writeFile(path.join(dir, fileName), sql, "utf8"),
    ),
  );

  return dir;
}

class FakeMigrationClient implements MigrationClient {
  readonly queries: Array<{ sql: string; values?: readonly unknown[] }> = [];
  connected = false;
  ended = false;

  constructor(
    private readonly appliedVersions: string[] = [],
    private readonly failOnSql?: string,
  ) {}

  async connect() {
    this.connected = true;
  }

  async query(sql: string, values?: readonly unknown[]) {
    this.queries.push({ sql, values });

    if (sql === this.failOnSql) {
      throw new Error("migration boom");
    }

    if (sql === "SELECT version FROM schema_migrations") {
      return {
        rows: this.appliedVersions.map((version) => ({ version })),
      };
    }

    return { rows: [] };
  }

  async end() {
    this.ended = true;
  }
}
