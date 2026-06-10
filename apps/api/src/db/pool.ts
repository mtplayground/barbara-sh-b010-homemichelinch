import pg from "pg";

import { loadConfig } from "../config/env.js";
import { createPostgresConnectionConfig } from "./connection.js";

const config = loadConfig();

export const pool = new pg.Pool({
  ...createPostgresConnectionConfig(config.database.url),
  max: 10,
});

export async function closeDatabasePool() {
  await pool.end();
}
