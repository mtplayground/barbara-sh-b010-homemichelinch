import assert from "node:assert/strict";
import test from "node:test";

import type { DishGuideCacheRepository } from "../cache/dishGuideCache.js";
import { GuideOrchestrator } from "./guideOrchestrator.js";
import { createGuideFixture } from "../test/fixtures.js";

test("GuideOrchestrator returns cached guide without calling generation", async () => {
  const guide = createGuideFixture();
  const updatedAt = new Date("2026-06-01T12:00:00.000Z");
  let generationCalls = 0;
  const cacheRepository = {
    async findByNormalizedName(normalizedDishName: string) {
      assert.equal(normalizedDishName, "mapo tofu");
      return {
        normalizedDishName,
        englishName: guide.title,
        guidePayload: guide,
        mediaUrls: {
          status: "ready",
          youtube: { videoId: "abc123XYZ" },
        },
        createdAt: updatedAt,
        updatedAt,
      };
    },
    async upsert() {
      throw new Error("upsert should not run on cache hit");
    },
  } as unknown as DishGuideCacheRepository;
  const generationService = {
    async generateDishGuide() {
      generationCalls += 1;
      return guide;
    },
  };

  const orchestrator = new GuideOrchestrator({
    cacheRepository,
    generationService,
  });
  const response = await orchestrator.getGuide({ dish: "  Mapo   Tofu  " });

  assert.equal(response.cache.hit, true);
  assert.equal(response.cache.key, "mapo tofu");
  assert.equal(response.cache.updatedAt, updatedAt.toISOString());
  assert.equal(response.media.status, "ready");
  assert.equal(generationCalls, 0);
});

test("GuideOrchestrator generates and stores guide on cache miss", async () => {
  const guide = createGuideFixture();
  const updatedAt = new Date("2026-06-02T09:30:00.000Z");
  let generationInput: unknown;
  let upsertInput: unknown;
  const cacheRepository = {
    async findByNormalizedName(normalizedDishName: string) {
      assert.equal(normalizedDishName, "鱼香肉丝");
      return null;
    },
    async upsert(input: unknown) {
      upsertInput = input;
      return {
        normalizedDishName: "鱼香肉丝",
        englishName: guide.title,
        guidePayload: guide,
        mediaUrls: { status: "pending" },
        createdAt: updatedAt,
        updatedAt,
      };
    },
  } as unknown as DishGuideCacheRepository;
  const generationService = {
    async generateDishGuide(input: unknown) {
      generationInput = input;
      return guide;
    },
  };

  const orchestrator = new GuideOrchestrator({
    cacheRepository,
    generationService,
  });
  const response = await orchestrator.getGuide({
    dish: "鱼香肉丝",
    notes: "moderate heat",
  });

  assert.deepEqual(generationInput, {
    dishName: "鱼香肉丝",
    notes: "moderate heat",
  });
  assert.deepEqual(upsertInput, {
    dishName: "鱼香肉丝",
    englishName: "Mapo Tofu",
    guidePayload: guide,
    mediaUrls: { status: "pending" },
  });
  assert.equal(response.cache.hit, false);
  assert.equal(response.guide.title, guide.title);
  assert.equal(response.media.status, "pending");
});
