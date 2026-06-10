import express, { type NextFunction, type Request, type Response } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createHealthResponse } from "@app/shared";

const app = express();
const host = process.env.HOST ?? "0.0.0.0";
const port = Number.parseInt(process.env.PORT ?? "8080", 10);
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const webDistPath = path.resolve(currentDir, "../../web/dist");

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req: Request, res: Response) => {
  res.json(createHealthResponse());
});

app.use(express.static(webDistPath, { index: false, maxAge: "1h" }));

app.get(/^(?!\/api\/).*/, (_req: Request, res: Response, next: NextFunction) => {
  res.sendFile(path.join(webDistPath, "index.html"), (error) => {
    if (error) {
      next(error);
    }
  });
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  void _next;
  console.error("Unhandled request error", error);

  if (res.headersSent) {
    return;
  }

  res.status(500).json({
    error: "Internal Server Error",
  });
});

if (!Number.isInteger(port) || port <= 0 || port > 65535) {
  throw new Error(`Invalid PORT value: ${process.env.PORT}`);
}

app.listen(port, host, () => {
  console.log(`API server listening on http://${host}:${port}`);
});
