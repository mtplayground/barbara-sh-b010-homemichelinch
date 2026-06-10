import { z, ZodError } from "zod";

import { HttpError } from "../../middleware/errors.js";
import {
  DishGuideCacheRepository,
  type JsonObject,
  normalizeDishName,
} from "../cache/dishGuideCache.js";
import {
  ClaudeGenerationService,
  type DishGuidePromptInput,
  GeneratedDishGuideSchema,
  type GeneratedDishGuide,
} from "../generation/index.js";
import { retry } from "../retry.js";

const GuideRequestSchema = z.object({
  dish: z.string().trim().min(1).max(120),
  notes: z.string().trim().max(1000).optional(),
});

const GuideMediaSchema = z
  .object({
    status: z.enum(["pending", "ready", "partial"]).default("pending"),
    youtube: z
      .object({
        videoId: z.string().trim().min(1).optional(),
        embedUrl: z.string().trim().min(1).optional(),
      })
      .optional(),
    photo: z
      .object({
        objectKey: z.string().trim().min(1).optional(),
        url: z.string().trim().min(1).optional(),
      })
      .optional(),
  })
  .passthrough();

export type GuideRequest = z.infer<typeof GuideRequestSchema>;
export type GuideMedia = z.infer<typeof GuideMediaSchema>;

export interface GuideResponse {
  cache: {
    hit: boolean;
    key: string;
    updatedAt?: string;
  };
  guide: GeneratedDishGuide;
  media: GuideMedia;
}

interface GuideOrchestratorOptions {
  cacheRepository?: DishGuideCacheRepository;
  generationService?: Pick<ClaudeGenerationService, "generateDishGuide">;
}

export class GuideOrchestrator {
  private readonly cacheRepository: DishGuideCacheRepository;
  private readonly generationService: Pick<ClaudeGenerationService, "generateDishGuide">;

  constructor(options: GuideOrchestratorOptions = {}) {
    this.cacheRepository = options.cacheRepository ?? new DishGuideCacheRepository();
    this.generationService = options.generationService ?? new ClaudeGenerationService();
  }

  async getGuide(rawInput: unknown): Promise<GuideResponse> {
    const input = parseGuideRequest(rawInput);
    const normalizedDishName = normalizeDishName(input.dish);

    if (!normalizedDishName) {
      throw new HttpError(400, "Dish name must not be blank", "INVALID_DISH_NAME");
    }

    const cached = await this.cacheRepository.findByNormalizedName(normalizedDishName);

    if (cached) {
      return {
        cache: {
          hit: true,
          key: cached.normalizedDishName,
          updatedAt: cached.updatedAt.toISOString(),
        },
        guide: GeneratedDishGuideSchema.parse(cached.guidePayload),
        media: GuideMediaSchema.catch({ status: "pending" }).parse(cached.mediaUrls),
      };
    }

    const guide = await retry(
      () => this.generationService.generateDishGuide(toPromptInput(input)),
      {
        attempts: 2,
        delayMs: 300,
      },
    );
    const media: GuideMedia = { status: "pending" };

    const stored = await this.cacheRepository.upsert({
      dishName: input.dish,
      englishName: guide.title,
      guidePayload: toJsonObject(guide),
      mediaUrls: toJsonObject(media),
    });

    return {
      cache: {
        hit: false,
        key: stored.normalizedDishName,
        updatedAt: stored.updatedAt.toISOString(),
      },
      guide,
      media,
    };
  }
}

function parseGuideRequest(rawInput: unknown): GuideRequest {
  try {
    return GuideRequestSchema.parse(rawInput);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new HttpError(
        400,
        "Invalid guide request",
        "INVALID_GUIDE_REQUEST",
        error.issues,
      );
    }

    throw error;
  }
}

function toPromptInput(input: GuideRequest): DishGuidePromptInput {
  return {
    dishName: input.dish,
    notes: input.notes,
  };
}

function toJsonObject(value: unknown): JsonObject {
  const parsed: unknown = JSON.parse(JSON.stringify(value));

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Expected JSON object");
  }

  return parsed as JsonObject;
}
