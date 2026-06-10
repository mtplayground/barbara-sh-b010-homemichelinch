import express, { type NextFunction, type Request, type Response } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadConfig, type AppConfig } from "./config/env.js";
import { runMigrations } from "./db/migrate.js";
import { errorMiddleware } from "./middleware/errors.js";
import { createHealthRouter } from "./routes/health.js";
import { createGuideRouter } from "./routes/guide.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const webDistPath = path.resolve(currentDir, "../../web/dist");

startServer().catch((error: unknown) => {
  console.error("API server startup failed", {
    error: serializeStartupError(error),
  });
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception", { error: serializeStartupError(error) });
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection", { error: serializeStartupError(reason) });
  process.exit(1);
});

function loadServerConfig() {
  try {
    return loadConfig();
  } catch (error) {
    console.error("Invalid API server configuration", {
      error: serializeStartupError(error),
    });
    process.exit(1);
  }
}

async function startServer() {
  const config = loadServerConfig();
  await runStartupMigrations(config);

  const app = createApp();
  const server = app.listen(config.server.port, config.server.host, () => {
    console.log(
      `API server listening on http://${config.server.host}:${config.server.port}`,
    );
  });

  server.on("error", (error: Error) => {
    console.error("API server failed to start", {
      host: config.server.host,
      port: config.server.port,
      error: serializeStartupError(error),
    });
    process.exit(1);
  });
}

async function runStartupMigrations(config: AppConfig) {
  try {
    await runMigrations({ databaseUrl: config.database.url });
  } catch (error) {
    console.error("Database migration failed during API startup", {
      error: serializeStartupError(error),
    });
    throw error;
  }
}

function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));

  app.use("/api/health", createHealthRouter());

  app.use("/api/guide", createGuideRouter());

  app.use(express.static(webDistPath, { index: false, maxAge: "1h" }));

  app.get(/^(?!\/api\/).*/, (_req: Request, res: Response, next: NextFunction) => {
    res.sendFile(path.join(webDistPath, "index.html"), (error) => {
      if (error) {
        next(error);
      }
    });
  });

  app.use(errorMiddleware);

  return app;
}

function serializeStartupError(error: unknown): unknown {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: "cause" in error ? error.cause : undefined,
    };
  }

  return error;
}
