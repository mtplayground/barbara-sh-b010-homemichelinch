import {
  createHealthResponse,
  type HealthDependencyStatus,
  type HealthResponse,
} from "@app/shared";

import { loadConfig, type AppConfig } from "../../config/env.js";
import { getDatabasePool } from "../../db/pool.js";

interface Queryable {
  query(sql: string): Promise<{ rows: Record<string, unknown>[] }>;
}

interface ReadinessOptions {
  config?: AppConfig;
  database?: Queryable;
  now?: Date;
}

export async function checkReadiness(
  options: ReadinessOptions = {},
): Promise<HealthResponse> {
  const config = options.config ?? loadConfig();
  const database = options.database ?? getDatabasePool();
  const databaseStatus = await checkDatabase(database);
  const schemaStatus = databaseStatus.ok
    ? await checkDishGuidesSchema(database)
    : {
        ok: false,
        message: "Skipped because the database dependency is unavailable",
      };
  const claudeStatus = checkClaudeConfig(config);

  return createHealthResponse(
    {
      database: databaseStatus,
      schema: schemaStatus,
      claude: claudeStatus,
    },
    options.now,
  );
}

async function checkDatabase(database: Queryable): Promise<HealthDependencyStatus> {
  try {
    await database.query("SELECT 1");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: `Database connection failed: ${toErrorMessage(error)}`,
    };
  }
}

async function checkDishGuidesSchema(
  database: Queryable,
): Promise<HealthDependencyStatus> {
  try {
    const result = await database.query(
      "SELECT to_regclass('public.dish_guides')::text AS table_name",
    );
    const tableName = result.rows[0]?.table_name;

    if (tableName === "dish_guides" || tableName === "public.dish_guides") {
      return { ok: true };
    }

    return {
      ok: false,
      message: 'Required table "dish_guides" does not exist',
    };
  } catch (error) {
    return {
      ok: false,
      message: `Schema check failed: ${toErrorMessage(error)}`,
    };
  }
}

function checkClaudeConfig(config: AppConfig): HealthDependencyStatus {
  return config.ai.claudeApiKey
    ? { ok: true }
    : { ok: false, message: "CLAUDE_API_KEY is not configured" };
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
