import { createHash } from "node:crypto";

import { z, ZodError } from "zod";

import { loadConfig } from "../../config/env.js";
import { retry } from "../retry.js";
import { ObjectStorageService, type StoredObject } from "./objectStorageService.js";

const PEXELS_SEARCH_URL = "https://api.pexels.com/v1/search";
const POLLINATIONS_IMAGE_BASE_URL = "https://image.pollinations.ai/prompt";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MIN_SEARCH_SCORE = 46;
const IMAGE_CACHE_CONTROL = "public, max-age=31536000, immutable";
const APPETIZING_TERMS = [
  "food",
  "dish",
  "meal",
  "plate",
  "plated",
  "recipe",
  "cuisine",
  "dinner",
  "lunch",
  "restaurant",
  "gourmet",
];
const LOW_QUALITY_TERMS = [
  "person",
  "people",
  "menu",
  "market",
  "grocery",
  "raw",
  "uncooked",
  "empty",
  "sign",
  "text",
];

const PexelsPhotoSchema = z
  .object({
    id: z.number(),
    width: z.number().default(0),
    height: z.number().default(0),
    url: z.string().url().optional(),
    photographer: z.string().optional(),
    photographer_url: z.string().url().optional(),
    alt: z.string().default(""),
    src: z
      .object({
        original: z.string().url().optional(),
        large2x: z.string().url().optional(),
        large: z.string().url().optional(),
        medium: z.string().url().optional(),
      })
      .passthrough(),
  })
  .passthrough();

const PexelsSearchResponseSchema = z
  .object({
    photos: z.array(PexelsPhotoSchema).default([]),
  })
  .passthrough();

type PexelsPhoto = z.infer<typeof PexelsPhotoSchema>;

export type DishPhotoSource = "cache" | "image-search" | "ai-generated";

export interface DishPhotoResult {
  source: DishPhotoSource;
  objectKey: string;
  relativeKey: string;
  url: string;
  contentType: string;
  altText: string;
  attribution?: {
    label: string;
    url?: string;
  };
}

interface DownloadedImage {
  body: Buffer;
  contentType: string;
}

interface ImageSearchCandidate {
  imageUrl: string;
  altText: string;
  score: number;
  attribution?: {
    label: string;
    url?: string;
  };
}

interface ImageSearchClient {
  search(dishName: string): Promise<ImageSearchCandidate | null>;
}

interface AiImageGenerator {
  generate(dishName: string): Promise<DownloadedImage>;
}

interface DishPhotoServiceOptions {
  storage?: Pick<ObjectStorageService, "getIfExists" | "putObject">;
  imageSearchClient?: ImageSearchClient;
  aiImageGenerator?: AiImageGenerator;
  fetcher?: typeof fetch;
}

export class DishPhotoServiceError extends Error {
  constructor(
    message: string,
    readonly statusCode?: number,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "DishPhotoServiceError";
  }
}

export class DishPhotoService {
  private readonly storage: Pick<ObjectStorageService, "getIfExists" | "putObject">;
  private readonly imageSearchClient: ImageSearchClient;
  private readonly aiImageGenerator: AiImageGenerator;
  private readonly fetcher: typeof fetch;

  constructor(options: DishPhotoServiceOptions = {}) {
    const config =
      options.storage && options.imageSearchClient ? undefined : loadConfig();
    this.fetcher = options.fetcher ?? fetch;
    this.storage =
      options.storage ?? new ObjectStorageService({ config: config?.objectStorage });
    this.imageSearchClient =
      options.imageSearchClient ??
      new PexelsImageSearchClient({
        apiKey: config?.media.imageApiKey ?? loadConfig().media.imageApiKey,
        fetcher: this.fetcher,
      });
    this.aiImageGenerator =
      options.aiImageGenerator ??
      new PollinationsAiImageGenerator({
        fetcher: this.fetcher,
      });
  }

  async getDishPhoto(dishName: string): Promise<DishPhotoResult> {
    const normalizedDishName = dishName.trim();

    if (!normalizedDishName) {
      throw new DishPhotoServiceError("Dish name is required for photo lookup");
    }

    const relativeKey = toDishPhotoRelativeKey(normalizedDishName);
    const cached = await this.storage.getIfExists(relativeKey);

    if (cached) {
      return toDishPhotoResult({
        source: "cache",
        stored: cached,
        contentType: cached.contentType ?? "image/jpeg",
        altText: `${normalizedDishName} dish photo`,
      });
    }

    const searchedPhoto = await this.findSearchPhoto(normalizedDishName);

    if (searchedPhoto) {
      return searchedPhoto;
    }

    const generated = await retry(
      () => this.aiImageGenerator.generate(normalizedDishName),
      {
        attempts: 2,
        delayMs: 350,
        shouldRetry: isRetryableDishPhotoError,
      },
    );
    const stored = await this.storage.putObject({
      relativeKey,
      body: generated.body,
      contentType: generated.contentType,
      cacheControl: IMAGE_CACHE_CONTROL,
    });

    return toDishPhotoResult({
      source: "ai-generated",
      stored,
      contentType: generated.contentType,
      altText: `AI-generated photo of ${normalizedDishName}`,
    });
  }

  private async findSearchPhoto(dishName: string): Promise<DishPhotoResult | null> {
    const candidate = await retry(() => this.imageSearchClient.search(dishName), {
      attempts: 2,
      delayMs: 350,
      shouldRetry: isRetryableDishPhotoError,
    });

    if (!candidate) {
      return null;
    }

    const downloaded = await retry(
      () => downloadImage(candidate.imageUrl, this.fetcher),
      {
        attempts: 2,
        delayMs: 350,
        shouldRetry: isRetryableDishPhotoError,
      },
    );
    const stored = await this.storage.putObject({
      relativeKey: toDishPhotoRelativeKey(dishName),
      body: downloaded.body,
      contentType: downloaded.contentType,
      cacheControl: IMAGE_CACHE_CONTROL,
    });

    return toDishPhotoResult({
      source: "image-search",
      stored,
      contentType: downloaded.contentType,
      altText: candidate.altText,
      attribution: candidate.attribution,
    });
  }
}

class PexelsImageSearchClient implements ImageSearchClient {
  private readonly apiKey: string;
  private readonly fetcher: typeof fetch;

  constructor(options: { apiKey: string; fetcher: typeof fetch }) {
    this.apiKey = options.apiKey;
    this.fetcher = options.fetcher;
  }

  async search(dishName: string): Promise<ImageSearchCandidate | null> {
    const params = new URLSearchParams({
      query: `${dishName} plated dish food`,
      per_page: "12",
      orientation: "landscape",
      size: "large",
      locale: "en-US",
    });
    const response = await this.fetcher(`${PEXELS_SEARCH_URL}?${params}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: this.apiKey,
      },
    });
    const body = await response.text();
    const parsedBody = parseJsonBody(body);

    if (!response.ok) {
      throw new DishPhotoServiceError(
        `Image search request failed: ${extractApiErrorMessage(parsedBody) ?? response.statusText}`,
        response.status,
        parsedBody,
      );
    }

    const parsed = parseImageSearchResponse(parsedBody);
    const best = parsed.photos
      .map((photo) => toImageSearchCandidate(dishName, photo))
      .filter((candidate): candidate is ImageSearchCandidate => candidate !== null)
      .sort((left, right) => right.score - left.score)[0];

    return best && best.score >= MIN_SEARCH_SCORE ? best : null;
  }
}

class PollinationsAiImageGenerator implements AiImageGenerator {
  private readonly fetcher: typeof fetch;

  constructor(options: { fetcher: typeof fetch }) {
    this.fetcher = options.fetcher;
  }

  async generate(dishName: string): Promise<DownloadedImage> {
    const prompt = [
      "appetizing plated food photography",
      dishName,
      "natural light",
      "restaurant table",
      "realistic",
      "no text",
      "no people",
    ].join(", ");
    const url = `${POLLINATIONS_IMAGE_BASE_URL}/${encodeURIComponent(prompt)}?width=1280&height=960&model=flux&nologo=true`;

    return downloadImage(url, this.fetcher);
  }
}

function toImageSearchCandidate(
  dishName: string,
  photo: PexelsPhoto,
): ImageSearchCandidate | null {
  const imageUrl = choosePexelsImageUrl(photo);

  if (!imageUrl) {
    return null;
  }

  const altText = photo.alt.trim() || `${dishName} dish photo`;
  const score = calculatePhotoScore(dishName, photo, altText);

  return {
    imageUrl,
    altText,
    score,
    attribution: photo.photographer
      ? {
          label: `Photo by ${photo.photographer} on Pexels`,
          url: photo.photographer_url ?? photo.url,
        }
      : undefined,
  };
}

function choosePexelsImageUrl(photo: PexelsPhoto): string | undefined {
  return photo.src.large2x ?? photo.src.large ?? photo.src.original ?? photo.src.medium;
}

function calculatePhotoScore(
  dishName: string,
  photo: PexelsPhoto,
  altText: string,
): number {
  const haystack = `${altText} ${photo.url ?? ""}`.toLowerCase();
  const dishTerms = tokenize(dishName);
  const dishScore =
    dishTerms.length === 0
      ? 0
      : (dishTerms.filter((term) => haystack.includes(term)).length / dishTerms.length) *
        48;
  const foodScore = APPETIZING_TERMS.filter((term) => haystack.includes(term)).length * 5;
  const lowQualityPenalty =
    LOW_QUALITY_TERMS.filter((term) => haystack.includes(term)).length * 14;
  const aspectRatio = photo.height > 0 ? photo.width / photo.height : 0;
  const aspectScore = aspectRatio >= 1.15 && aspectRatio <= 1.9 ? 14 : 2;
  const sizeScore = Math.min((photo.width * photo.height) / 150_000, 18);

  return (
    Math.round(
      (dishScore + foodScore + aspectScore + sizeScore - lowQualityPenalty) * 100,
    ) / 100
  );
}

async function downloadImage(
  url: string,
  fetcher: typeof fetch,
): Promise<DownloadedImage> {
  const response = await fetcher(url, {
    method: "GET",
    headers: {
      Accept: "image/avif,image/webp,image/png,image/jpeg;q=0.9,*/*;q=0.5",
    },
  });
  const contentType = normalizeImageContentType(response.headers.get("content-type"));
  const contentLength = Number(response.headers.get("content-length") ?? "0");

  if (!response.ok) {
    throw new DishPhotoServiceError(
      `Image download failed: ${response.statusText}`,
      response.status,
    );
  }

  if (!contentType) {
    throw new DishPhotoServiceError(
      "Downloaded image did not have a supported content type",
    );
  }

  if (contentLength > MAX_IMAGE_BYTES) {
    throw new DishPhotoServiceError("Downloaded image exceeded the maximum size");
  }

  const body = Buffer.from(await response.arrayBuffer());

  if (body.byteLength === 0) {
    throw new DishPhotoServiceError("Downloaded image was empty");
  }

  if (body.byteLength > MAX_IMAGE_BYTES) {
    throw new DishPhotoServiceError("Downloaded image exceeded the maximum size");
  }

  return {
    body,
    contentType,
  };
}

function toDishPhotoResult(input: {
  source: DishPhotoSource;
  stored: StoredObject;
  contentType: string;
  altText: string;
  attribution?: DishPhotoResult["attribution"];
}): DishPhotoResult {
  return {
    source: input.source,
    objectKey: input.stored.objectKey,
    relativeKey: input.stored.relativeKey,
    url: input.stored.url,
    contentType: input.contentType,
    altText: input.altText,
    attribution: input.attribution,
  };
}

function toDishPhotoRelativeKey(dishName: string): string {
  const slug = dishName
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const digest = createHash("sha256")
    .update(dishName.toLowerCase())
    .digest("hex")
    .slice(0, 16);

  return `dish-photos/${slug || "dish"}-${digest}`;
}

function parseImageSearchResponse(
  value: unknown,
): z.infer<typeof PexelsSearchResponseSchema> {
  try {
    return PexelsSearchResponseSchema.parse(value);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new DishPhotoServiceError(
        "Image search response did not match the expected shape",
        undefined,
        error.issues,
      );
    }

    throw error;
  }
}

function parseJsonBody(body: string): unknown {
  if (!body) {
    return {};
  }

  try {
    return JSON.parse(body);
  } catch (error) {
    throw new DishPhotoServiceError(
      "Image search returned invalid JSON",
      undefined,
      error,
    );
  }
}

function extractApiErrorMessage(body: unknown): string | undefined {
  const parsed = z
    .object({
      error: z.union([z.string(), z.object({ message: z.string() })]).optional(),
    })
    .safeParse(body);

  if (!parsed.success || parsed.data.error === undefined) {
    return undefined;
  }

  return typeof parsed.data.error === "string"
    ? parsed.data.error
    : parsed.data.error.message;
}

function normalizeImageContentType(contentType: string | null): string | null {
  const normalized = contentType?.split(";")[0]?.trim().toLowerCase();

  if (
    normalized === "image/jpeg" ||
    normalized === "image/png" ||
    normalized === "image/webp" ||
    normalized === "image/avif"
  ) {
    return normalized;
  }

  return null;
}

function isRetryableDishPhotoError(error: unknown): boolean {
  if (!(error instanceof DishPhotoServiceError)) {
    return false;
  }

  return (
    error.statusCode === undefined ||
    error.statusCode === 408 ||
    error.statusCode === 429 ||
    error.statusCode >= 500
  );
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 3);
}
