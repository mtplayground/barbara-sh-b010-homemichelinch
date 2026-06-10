import express, { type NextFunction, type Request, type Response } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadConfig } from "./config/env.js";
import { errorMiddleware } from "./middleware/errors.js";
import { createHealthRouter } from "./routes/health.js";
import { createGuideRouter } from "./routes/guide.js";

const config = loadServerConfig();
const app = express();
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const webDistPath = path.resolve(currentDir, "../../web/dist");

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
