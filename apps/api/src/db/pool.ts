import pg from "pg";

import { config } from "../config/env.js";
import { createPostgresConnectionConfig } from "./connection.js";

export const pool = new pg.Pool({
  ...createPostgresConnectionConfig(config.database.url),
  max: 10,
});

export async function closeDatabasePool() {
  await pool.end();
}
