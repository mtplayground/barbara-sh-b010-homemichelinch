import assert from "node:assert/strict";
import test from "node:test";

import type { AppConfig } from "../../config/env.js";
import { checkReadiness } from "./readiness.js";

const baseConfig: AppConfig = {
  server: {
    host: "0.0.0.0",
    port: 8080,
  },
  database: {
    url: "postgresql://user:pass@example.com:5432/app",
  },
  ai: {
    claudeApiKey: "claude-key",
    claudeModel: "claude-sonnet-4-6",
  },
  media: {},
};

test("checkReadiness reports all dependencies healthy", async () => {
  const response = await checkReadiness({
    config: baseConfig,
    database: createDatabase([
      { rows: [{ ok: 1 }] },
      { rows: [{ table_name: "dish_guides" }] },
    ]),
    now: new Date("2026-06-10T03:00:00.000Z"),
  });

  assert.equal(response.ok, true);
  assert.equal(response.timestamp, "2026-06-10T03:00:00.000Z");
  assert.equal(response.dependencies.database.ok, true);
  assert.equal(response.dependencies.schema.ok, true);
  assert.equal(response.dependencies.claude.ok, true);
});

test("checkReadiness reports database failures and skips schema check", async () => {
  const response = await checkReadiness({
    config: baseConfig,
    database: {
      async query() {
        throw new Error("connection refused");
      },
    },
  });

  assert.equal(response.ok, false);
  assert.equal(response.dependencies.database.ok, false);
  assert.match(
    response.dependencies.database.message ?? "",
    /Database connection failed: connection refused/,
  );
  assert.equal(response.dependencies.schema.ok, false);
  assert.match(
    response.dependencies.schema.message ?? "",
    /database dependency is unavailable/,
  );
});

test("checkReadiness reports missing dish_guides schema", async () => {
  const response = await checkReadiness({
    config: baseConfig,
    database: createDatabase([{ rows: [{ ok: 1 }] }, { rows: [{ table_name: null }] }]),
  });

  assert.equal(response.ok, false);
  assert.equal(response.dependencies.database.ok, true);
  assert.equal(response.dependencies.schema.ok, false);
  assert.match(response.dependencies.schema.message ?? "", /dish_guides/);
});

test("checkReadiness reports missing Claude key", async () => {
  const response = await checkReadiness({
    config: {
      ...baseConfig,
      ai: {
        ...baseConfig.ai,
        claudeApiKey: "",
      },
    },
    database: createDatabase([
      { rows: [{ ok: 1 }] },
      { rows: [{ table_name: "public.dish_guides" }] },
    ]),
  });

  assert.equal(response.ok, false);
  assert.equal(response.dependencies.claude.ok, false);
  assert.match(response.dependencies.claude.message ?? "", /CLAUDE_API_KEY/);
});

function createDatabase(results: Array<{ rows: Record<string, unknown>[] }>) {
  let index = 0;

  return {
    async query() {
      const result = results[index];
      index += 1;

      if (!result) {
        throw new Error("unexpected query");
      }

      return result;
    },
  };
}
