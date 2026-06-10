import express, { type NextFunction, type Request, type Response } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createHealthResponse } from "@app/shared";

import { loadConfig } from "./config/env.js";
import { errorMiddleware } from "./middleware/errors.js";
import { createGuideRouter } from "./routes/guide.js";

const config = loadConfig();
const app = express();
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const webDistPath = path.resolve(currentDir, "../../web/dist");

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req: Request, res: Response) => {
  res.json(createHealthResponse());
});

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

app.listen(config.server.port, config.server.host, () => {
  console.log(
    `API server listening on http://${config.server.host}:${config.server.port}`,
  );
});
