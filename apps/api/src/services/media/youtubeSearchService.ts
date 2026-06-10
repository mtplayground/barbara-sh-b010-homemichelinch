import { z, ZodError } from "zod";

import { loadConfig } from "../../config/env.js";
import { retry } from "../retry.js";

const YOUTUBE_API_BASE_URL = "https://www.googleapis.com/youtube/v3";
const DEFAULT_MAX_RESULTS = 10;
const SEARCH_QUERY_SUFFIX = "recipe cooking tutorial English";
const QUALITY_KEYWORDS = [
  "recipe",
  "cook",
  "cooking",
  "homemade",
  "how to",
  "tutorial",
  "chef",
  "kitchen",
];
const LOW_QUALITY_KEYWORDS = [
  "shorts",
  "#shorts",
  "mukbang",
  "reaction",
  "asmr",
  "compilation",
  "street food",
];

const ThumbnailSchema = z.object({
  url: z.string().url(),
});

const SearchResponseSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            id: z.object({
              videoId: z.string().min(1).optional(),
            }),
          })
          .passthrough(),
      )
      .default([]),
  })
  .passthrough();

const VideoResponseSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            id: z.string().min(1),
            snippet: z
              .object({
                title: z.string().default(""),
                description: z.string().default(""),
                channelTitle: z.string().default(""),
                publishedAt: z.string().optional(),
                defaultAudioLanguage: z.string().optional(),
                defaultLanguage: z.string().optional(),
                thumbnails: z
                  .object({
                    maxres: ThumbnailSchema.optional(),
                    high: ThumbnailSchema.optional(),
                    medium: ThumbnailSchema.optional(),
                    default: ThumbnailSchema.optional(),
                  })
                  .optional(),
              })
              .passthrough(),
            statistics: z
              .object({
                viewCount: z.string().optional(),
                likeCount: z.string().optional(),
              })
              .passthrough()
              .default({}),
            status: z
              .object({
                embeddable: z.boolean().optional(),
                privacyStatus: z.string().optional(),
              })
              .passthrough()
              .default({}),
            contentDetails: z
              .object({
                duration: z.string().optional(),
              })
              .passthrough()
              .default({}),
          })
          .passthrough(),
      )
      .default([]),
  })
  .passthrough();

type VideoItem = z.infer<typeof VideoResponseSchema>["items"][number];

export interface YouTubeVideoResult {
  videoId: string;
  embedUrl: string;
  watchUrl: string;
  title: string;
  channelTitle: string;
  publishedAt?: string;
  thumbnailUrl?: string;
  viewCount: number;
  likeCount?: number;
  durationSeconds?: number;
  score: number;
}

export interface YouTubeSearchOptions {
  maxResults?: number;
}

interface YouTubeSearchServiceOptions {
  apiKey?: string;
  fetcher?: typeof fetch;
}

export class YouTubeSearchError extends Error {
  constructor(
    message: string,
    readonly statusCode?: number,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "YouTubeSearchError";
  }
}

export class YouTubeSearchService {
  private readonly apiKey: string;
  private readonly fetcher: typeof fetch;

  constructor(options: YouTubeSearchServiceOptions = {}) {
    this.apiKey = options.apiKey ?? loadConfig().media.youtubeApiKey;
    this.fetcher = options.fetcher ?? fetch;
  }

  async findBestCookingVideo(
    dishName: string,
    options: YouTubeSearchOptions = {},
  ): Promise<YouTubeVideoResult | null> {
    const normalizedDishName = dishName.trim();

    if (!normalizedDishName) {
      throw new YouTubeSearchError("Dish name is required for YouTube search");
    }

    const maxResults = clampMaxResults(options.maxResults ?? DEFAULT_MAX_RESULTS);
    const videoIds = await retry(
      () => this.searchVideoIds(normalizedDishName, maxResults),
      {
        attempts: 2,
        delayMs: 250,
        shouldRetry: isRetryableYouTubeError,
      },
    );

    if (videoIds.length === 0) {
      return null;
    }

    const videos = await retry(() => this.fetchVideoDetails(videoIds), {
      attempts: 2,
      delayMs: 250,
      shouldRetry: isRetryableYouTubeError,
    });

    return rankVideos(normalizedDishName, videos)[0] ?? null;
  }

  private async searchVideoIds(dishName: string, maxResults: number): Promise<string[]> {
    const response = await this.getJson(
      "/search",
      new URLSearchParams({
        part: "snippet",
        type: "video",
        q: `${dishName} ${SEARCH_QUERY_SUFFIX}`,
        maxResults: String(maxResults),
        order: "relevance",
        relevanceLanguage: "en",
        regionCode: "US",
        safeSearch: "moderate",
        videoEmbeddable: "true",
        videoSyndicated: "true",
        videoDuration: "medium",
        key: this.apiKey,
      }),
    );

    const parsed = parseYouTubeResponse(SearchResponseSchema, response, "search");

    return parsed.items
      .map((item) => item.id.videoId)
      .filter((videoId): videoId is string => Boolean(videoId));
  }

  private async fetchVideoDetails(videoIds: string[]): Promise<VideoItem[]> {
    const response = await this.getJson(
      "/videos",
      new URLSearchParams({
        part: "snippet,statistics,status,contentDetails",
        id: videoIds.join(","),
        key: this.apiKey,
      }),
    );

    return parseYouTubeResponse(VideoResponseSchema, response, "videos").items;
  }

  private async getJson(path: string, params: URLSearchParams): Promise<unknown> {
    const response = await this.fetcher(`${YOUTUBE_API_BASE_URL}${path}?${params}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    const body = await response.text();
    const parsedBody = parseJsonBody(body);

    if (!response.ok) {
      const message = extractYouTubeErrorMessage(parsedBody) ?? response.statusText;
      throw new YouTubeSearchError(
        `YouTube API request failed: ${message}`,
        response.status,
        parsedBody,
      );
    }

    return parsedBody;
  }
}

function rankVideos(dishName: string, videos: VideoItem[]): YouTubeVideoResult[] {
  return videos
    .map((video) => toRankedResult(dishName, video))
    .filter((video): video is YouTubeVideoResult => video !== null)
    .sort((left, right) => right.score - left.score);
}

function toRankedResult(dishName: string, video: VideoItem): YouTubeVideoResult | null {
  if (video.status.embeddable !== true || video.status.privacyStatus === "private") {
    return null;
  }

  const title = video.snippet.title.trim();
  const description = video.snippet.description.trim();
  const durationSeconds = parseIsoDurationSeconds(video.contentDetails.duration);

  if (!title || (durationSeconds !== undefined && durationSeconds < 180)) {
    return null;
  }

  const viewCount = parseCount(video.statistics.viewCount);
  const likeCount = parseOptionalCount(video.statistics.likeCount);
  const score = calculateScore({
    dishName,
    title,
    description,
    channelTitle: video.snippet.channelTitle,
    language:
      video.snippet.defaultAudioLanguage ?? video.snippet.defaultLanguage ?? undefined,
    viewCount,
    likeCount,
    durationSeconds,
  });

  return {
    videoId: video.id,
    embedUrl: `https://www.youtube.com/embed/${video.id}`,
    watchUrl: `https://www.youtube.com/watch?v=${video.id}`,
    title,
    channelTitle: video.snippet.channelTitle,
    publishedAt: video.snippet.publishedAt,
    thumbnailUrl: chooseThumbnailUrl(video.snippet.thumbnails),
    viewCount,
    likeCount,
    durationSeconds,
    score,
  };
}

function calculateScore(input: {
  dishName: string;
  title: string;
  description: string;
  channelTitle: string;
  language?: string;
  viewCount: number;
  likeCount?: number;
  durationSeconds?: number;
}): number {
  const text = `${input.title} ${input.description} ${input.channelTitle}`.toLowerCase();
  const dishTerms = tokenize(input.dishName);
  const matchedDishTerms = dishTerms.filter((term) => text.includes(term)).length;
  const relevanceScore =
    dishTerms.length === 0 ? 0 : (matchedDishTerms / dishTerms.length) * 45;
  const titleMatchScore = dishTerms.some((term) =>
    input.title.toLowerCase().includes(term),
  )
    ? 15
    : 0;
  const qualityKeywordScore =
    QUALITY_KEYWORDS.filter((keyword) => text.includes(keyword)).length * 3;
  const lowQualityPenalty =
    LOW_QUALITY_KEYWORDS.filter((keyword) => text.includes(keyword)).length * 10;
  const viewScore = Math.min(Math.log10(input.viewCount + 1) * 8, 55);
  const likeScore =
    input.likeCount === undefined || input.viewCount === 0
      ? 0
      : Math.min((input.likeCount / input.viewCount) * 1000, 18);
  const durationScore = getDurationScore(input.durationSeconds);
  const languageScore = isLikelyEnglish(
    input.language,
    `${input.title} ${input.description}`,
  )
    ? 12
    : -18;

  return roundScore(
    relevanceScore +
      titleMatchScore +
      qualityKeywordScore +
      viewScore +
      likeScore +
      durationScore +
      languageScore -
      lowQualityPenalty,
  );
}

function getDurationScore(durationSeconds?: number): number {
  if (durationSeconds === undefined) {
    return 0;
  }

  if (durationSeconds >= 360 && durationSeconds <= 1500) {
    return 16;
  }

  if (durationSeconds >= 240 && durationSeconds <= 2400) {
    return 8;
  }

  return -12;
}

function isLikelyEnglish(language: string | undefined, text: string): boolean {
  if (language?.toLowerCase().startsWith("en")) {
    return true;
  }

  const letters = text.replace(/[^A-Za-z]/g, "").length;
  const nonAscii = Array.from(text).filter(
    (character) => character.charCodeAt(0) > 127,
  ).length;

  return letters >= 20 && nonAscii / Math.max(text.length, 1) < 0.1;
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 3);
}

function chooseThumbnailUrl(
  thumbnails: VideoItem["snippet"]["thumbnails"],
): string | undefined {
  return (
    thumbnails?.maxres?.url ??
    thumbnails?.high?.url ??
    thumbnails?.medium?.url ??
    thumbnails?.default?.url
  );
}

function parseIsoDurationSeconds(duration: string | undefined): number | undefined {
  if (!duration) {
    return undefined;
  }

  const match = duration.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);

  if (!match) {
    return undefined;
  }

  const [, days = "0", hours = "0", minutes = "0", seconds = "0"] = match;
  return (
    Number(days) * 86_400 + Number(hours) * 3_600 + Number(minutes) * 60 + Number(seconds)
  );
}

function parseCount(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function parseOptionalCount(value: string | undefined): number | undefined {
  return value === undefined ? undefined : parseCount(value);
}

function parseJsonBody(body: string): unknown {
  if (!body) {
    return {};
  }

  try {
    return JSON.parse(body);
  } catch (error) {
    throw new YouTubeSearchError("YouTube API returned invalid JSON", undefined, error);
  }
}

function parseYouTubeResponse<T extends z.ZodType>(
  schema: T,
  value: unknown,
  endpointName: string,
): z.infer<T> {
  try {
    return schema.parse(value);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new YouTubeSearchError(
        `YouTube ${endpointName} response did not match the expected shape`,
        undefined,
        error.issues,
      );
    }

    throw error;
  }
}

function extractYouTubeErrorMessage(body: unknown): string | undefined {
  const parsed = z
    .object({
      error: z
        .object({
          message: z.string().optional(),
        })
        .optional(),
    })
    .safeParse(body);

  return parsed.success ? parsed.data.error?.message : undefined;
}

function isRetryableYouTubeError(error: unknown): boolean {
  if (!(error instanceof YouTubeSearchError)) {
    return false;
  }

  return (
    error.statusCode === undefined ||
    error.statusCode === 408 ||
    error.statusCode === 429 ||
    error.statusCode >= 500
  );
}

function clampMaxResults(maxResults: number): number {
  return Math.min(Math.max(Math.trunc(maxResults), 1), 25);
}

function roundScore(score: number): number {
  return Math.round(score * 100) / 100;
}
