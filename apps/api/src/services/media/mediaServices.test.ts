import assert from "node:assert/strict";
import test from "node:test";

import { DishPhotoService } from "./dishPhotoService.js";
import { ObjectStorageService, type StoredObjectInput } from "./objectStorageService.js";
import { YouTubeSearchService } from "./youtubeSearchService.js";

test("YouTubeSearchService ranks embeddable English cooking videos", async () => {
  const requests: string[] = [];
  const fetcher = async (url: string | URL | Request) => {
    const value = String(url);
    requests.push(value);

    if (value.includes("/search?")) {
      return jsonResponse({
        items: [
          { id: { videoId: "lowQuality1" } },
          { id: { videoId: "bestVideo2" } },
          { id: { videoId: "privateVid3" } },
        ],
      });
    }

    return jsonResponse({
      items: [
        videoDetails({
          id: "lowQuality1",
          title: "Mapo tofu mukbang shorts reaction",
          viewCount: "900000",
          duration: "PT8M",
        }),
        videoDetails({
          id: "bestVideo2",
          title: "Mapo Tofu Recipe - English Cooking Tutorial",
          description: "Chef explains how to cook mapo tofu at home.",
          viewCount: "250000",
          likeCount: "12000",
          duration: "PT12M30S",
        }),
        videoDetails({
          id: "privateVid3",
          title: "Mapo Tofu Recipe",
          embeddable: false,
          viewCount: "500000",
          duration: "PT10M",
        }),
      ],
    });
  };

  const service = new YouTubeSearchService({
    apiKey: "test-youtube-key",
    fetcher: fetcher as typeof fetch,
  });
  const result = await service.findBestCookingVideo("mapo tofu", { maxResults: 3 });

  assert.equal(result?.videoId, "bestVideo2");
  assert.equal(result?.embedUrl, "https://www.youtube.com/embed/bestVideo2");
  assert.equal(result?.durationSeconds, 750);
  assert.equal(requests.length, 2);
});

test("YouTubeSearchService skips enrichment when API key is absent", async () => {
  const service = new YouTubeSearchService({
    fetcher: async () => {
      throw new Error("fetch should not run without a YouTube API key");
    },
  });

  const result = await service.findBestCookingVideo("mapo tofu");

  assert.equal(result, null);
});

test("DishPhotoService skips enrichment when object storage is absent", async () => {
  const originalStorageEnv = snapshotStorageEnv();
  clearStorageEnv();

  try {
    const service = new DishPhotoService({
      imageSearchClient: {
        async search() {
          throw new Error("image search should not run without object storage");
        },
      },
      aiImageGenerator: {
        async generate() {
          throw new Error("AI image generation should not run without object storage");
        },
      },
    });

    const result = await service.getDishPhoto("mapo tofu");

    assert.equal(result, null);
  } finally {
    restoreStorageEnv(originalStorageEnv);
  }
});

test("DishPhotoService skips image search when image API key is absent", async () => {
  let generatedDishName = "";
  const service = new DishPhotoService({
    storage: {
      async getIfExists() {
        return null;
      },
      async putObject(input: StoredObjectInput) {
        return {
          objectKey: `app-prefix/${input.relativeKey}`,
          relativeKey: input.relativeKey,
          url: "https://signed.example/ai",
        };
      },
    },
    aiImageGenerator: {
      async generate(dishName: string) {
        generatedDishName = dishName;
        return { body: Buffer.from("png-bytes"), contentType: "image/png" };
      },
    },
  });

  const result = await service.getDishPhoto("mapo tofu");

  assert.equal(result?.source, "ai-generated");
  assert.equal(generatedDishName, "mapo tofu");
});

test("DishPhotoService returns cached object before calling externals", async () => {
  let searchCalls = 0;
  let generationCalls = 0;
  const service = new DishPhotoService({
    storage: {
      async getIfExists(relativeKey: string) {
        assert.match(relativeKey, /^dish-photos\/mapo-tofu-[a-f0-9]{16}$/);
        return {
          objectKey: `app-prefix/${relativeKey}`,
          relativeKey,
          url: "https://signed.example/cache",
          contentType: "image/webp",
        };
      },
      async putObject() {
        throw new Error("putObject should not run on cache hit");
      },
    },
    imageSearchClient: {
      async search() {
        searchCalls += 1;
        return null;
      },
    },
    aiImageGenerator: {
      async generate() {
        generationCalls += 1;
        return { body: Buffer.from("ai"), contentType: "image/png" };
      },
    },
  });

  const result = await service.getDishPhoto("mapo tofu");

  assert.ok(result);
  assert.equal(result.source, "cache");
  assert.equal(result.contentType, "image/webp");
  assert.equal(result.url, "https://signed.example/cache");
  assert.equal(searchCalls, 0);
  assert.equal(generationCalls, 0);
});

test("DishPhotoService stores image-search match with downloaded bytes", async () => {
  let storedInput: StoredObjectInput | undefined;
  const service = new DishPhotoService({
    storage: {
      async getIfExists() {
        return null;
      },
      async putObject(input: StoredObjectInput) {
        storedInput = input;
        return {
          objectKey: `app-prefix/${input.relativeKey}`,
          relativeKey: input.relativeKey,
          url: "https://signed.example/search",
        };
      },
    },
    imageSearchClient: {
      async search(dishName: string) {
        assert.equal(dishName, "mapo tofu");
        return {
          imageUrl: "https://images.example/mapo.jpg",
          altText: "mapo tofu plated dish",
          score: 90,
          attribution: {
            label: "Photo by Test",
            url: "https://pexels.example/photo",
          },
        };
      },
    },
    aiImageGenerator: {
      async generate() {
        throw new Error("AI fallback should not run when image search succeeds");
      },
    },
    fetcher: async () =>
      new Response(Buffer.from("jpeg-bytes"), {
        status: 200,
        headers: {
          "content-type": "image/jpeg",
          "content-length": String(Buffer.byteLength("jpeg-bytes")),
        },
      }),
  });

  const result = await service.getDishPhoto("mapo tofu");

  assert.ok(result);
  assert.equal(result.source, "image-search");
  assert.equal(result.altText, "mapo tofu plated dish");
  assert.equal(result.attribution?.label, "Photo by Test");
  assert.equal(storedInput?.contentType, "image/jpeg");
  assert.equal(storedInput?.body.toString(), "jpeg-bytes");
  assert.match(storedInput?.relativeKey ?? "", /^dish-photos\/mapo-tofu-[a-f0-9]{16}$/);
});

test("DishPhotoService falls back to AI image when search has no match", async () => {
  let generatedDishName = "";
  const service = new DishPhotoService({
    storage: {
      async getIfExists() {
        return null;
      },
      async putObject(input: StoredObjectInput) {
        return {
          objectKey: `app-prefix/${input.relativeKey}`,
          relativeKey: input.relativeKey,
          url: "https://signed.example/ai",
        };
      },
    },
    imageSearchClient: {
      async search() {
        return null;
      },
    },
    aiImageGenerator: {
      async generate(dishName: string) {
        generatedDishName = dishName;
        return { body: Buffer.from("png-bytes"), contentType: "image/png" };
      },
    },
  });

  const result = await service.getDishPhoto("mapo tofu");

  assert.equal(generatedDishName, "mapo tofu");
  assert.ok(result);
  assert.equal(result.source, "ai-generated");
  assert.equal(result.contentType, "image/png");
  assert.equal(result.altText, "AI-generated photo of mapo tofu");
});

test("ObjectStorageService prefixes object keys", () => {
  const service = new ObjectStorageService({
    config: {
      bucket: "bucket",
      prefix: "app_barbara_sh_b010_homemichelinch_a42e73/",
      endpoint: "https://storage.example",
      region: "auto",
      forcePathStyle: true,
      accessKeyId: "key",
      secretAccessKey: "secret",
    },
    signedUrlTtlSeconds: 60,
  });

  assert.equal(
    service.toObjectKey("/dish-photos/mapo.jpg"),
    "app_barbara_sh_b010_homemichelinch_a42e73/dish-photos/mapo.jpg",
  );
});

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "content-type": "application/json",
    },
    ...init,
  });
}

function videoDetails(input: {
  id: string;
  title: string;
  description?: string;
  viewCount: string;
  likeCount?: string;
  duration: string;
  embeddable?: boolean;
}) {
  return {
    id: input.id,
    snippet: {
      title: input.title,
      description: input.description ?? input.title,
      channelTitle: "Test Kitchen",
      publishedAt: "2026-01-01T00:00:00Z",
      defaultAudioLanguage: "en",
      thumbnails: {
        high: { url: `https://img.example/${input.id}.jpg` },
      },
    },
    statistics: {
      viewCount: input.viewCount,
      likeCount: input.likeCount,
    },
    status: {
      embeddable: input.embeddable ?? true,
      privacyStatus: "public",
    },
    contentDetails: {
      duration: input.duration,
    },
  };
}

function snapshotStorageEnv() {
  return {
    OBJECT_STORAGE_ACCESS_KEY_ID: process.env.OBJECT_STORAGE_ACCESS_KEY_ID,
    OBJECT_STORAGE_SECRET_ACCESS_KEY: process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY,
    OBJECT_STORAGE_BUCKET: process.env.OBJECT_STORAGE_BUCKET,
    OBJECT_STORAGE_PREFIX: process.env.OBJECT_STORAGE_PREFIX,
    OBJECT_STORAGE_ENDPOINT: process.env.OBJECT_STORAGE_ENDPOINT,
    OBJECT_STORAGE_REGION: process.env.OBJECT_STORAGE_REGION,
    OBJECT_STORAGE_FORCE_PATH_STYLE: process.env.OBJECT_STORAGE_FORCE_PATH_STYLE,
  };
}

function clearStorageEnv() {
  delete process.env.OBJECT_STORAGE_ACCESS_KEY_ID;
  delete process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY;
  delete process.env.OBJECT_STORAGE_BUCKET;
  delete process.env.OBJECT_STORAGE_PREFIX;
  delete process.env.OBJECT_STORAGE_ENDPOINT;
  delete process.env.OBJECT_STORAGE_REGION;
  delete process.env.OBJECT_STORAGE_FORCE_PATH_STYLE;
}

function restoreStorageEnv(snapshot: ReturnType<typeof snapshotStorageEnv>) {
  for (const [key, value] of Object.entries(snapshot)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}
