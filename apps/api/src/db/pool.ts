import pg from "pg";

import { loadConfig } from "../config/env.js";
import { createPostgresConnectionConfig } from "./connection.js";

let pool: pg.Pool | null = null;

export function getDatabasePool() {
  if (!pool) {
    const config = loadConfig();
    pool = new pg.Pool({
      ...createPostgresConnectionConfig(config.database.url),
      max: 10,
    });
  }

  return pool;
}

export async function closeDatabasePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
