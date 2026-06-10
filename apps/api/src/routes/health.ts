import { Router } from "express";

import { asyncHandler } from "../middleware/asyncHandler.js";
import { checkReadiness } from "../services/health/readiness.js";

export function createHealthRouter() {
  const router = Router();

  router.get(
    "/",
    asyncHandler(async (_req, res) => {
      const response = await checkReadiness();
      res.status(response.ok ? 200 : 503).json(response);
    }),
  );

  return router;
}
