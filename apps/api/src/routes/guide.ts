import { Router } from "express";

import { asyncHandler } from "../middleware/asyncHandler.js";
import { GuideOrchestrator } from "../services/guide/guideOrchestrator.js";

export function createGuideRouter(orchestrator = new GuideOrchestrator()) {
  const router = Router();

  router.post(
    "/",
    asyncHandler(async (req, res) => {
      const response = await orchestrator.getGuide(req.body);
      res.status(response.cache.hit ? 200 : 201).json(response);
    }),
  );

  return router;
}
