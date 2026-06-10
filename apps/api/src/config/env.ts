import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ quiet: true });

const portSchema = z.coerce.number().int().min(1).max(65535);

const postgresUrlSchema = z
  .string()
  .min(1)
  .refine(
    (value) => {
      try {
        const parsed = new URL(value);
        return parsed.protocol === "postgres:" || parsed.protocol === "postgresql:";
      } catch {
        return false;
      }
    },
    { message: "must be a valid PostgreSQL connection URL" },
  );

const booleanEnvSchema = z
  .string()
  .trim()
  .transform((value, context) => {
    const normalized = value.toLowerCase();

    if (normalized === "true") {
      return true;
    }

    if (normalized === "false") {
      return false;
    }

    context.addIssue({
      code: "custom",
      message: "must be either true or false",
    });
    return z.NEVER;
  });

const bootEnvSchema = z.object({
  HOST: z.string().min(1).default("0.0.0.0"),
  PORT: portSchema.default(8080),
  DATABASE_URL: postgresUrlSchema,
  CLAUDE_API_KEY: z.string().min(1),
  CLAUDE_MODEL: z.string().min(1).default("claude-sonnet-4-6"),
  YOUTUBE_API_KEY: z.string().min(1).optional(),
  IMAGE_API_KEY: z.string().min(1).optional(),
});

const optionalIntegrationEnvSchema = z.object({
  YOUTUBE_API_KEY: z.string().min(1).optional(),
  IMAGE_API_KEY: z.string().min(1).optional(),
});

const objectStorageEnvSchema = z.object({
  OBJECT_STORAGE_ACCESS_KEY_ID: z.string().min(1),
  OBJECT_STORAGE_SECRET_ACCESS_KEY: z.string().min(1),
  OBJECT_STORAGE_BUCKET: z.string().min(1),
  OBJECT_STORAGE_PREFIX: z
    .string()
    .min(1)
    .refine((value) => value.endsWith("/"), {
      message: "must end with /",
    }),
  OBJECT_STORAGE_ENDPOINT: z.string().url(),
  OBJECT_STORAGE_REGION: z.string().min(1).default("auto"),
  OBJECT_STORAGE_FORCE_PATH_STYLE: booleanEnvSchema.default(true),
});

const objectStorageEnvKeys = [
  "OBJECT_STORAGE_ACCESS_KEY_ID",
  "OBJECT_STORAGE_SECRET_ACCESS_KEY",
  "OBJECT_STORAGE_BUCKET",
  "OBJECT_STORAGE_PREFIX",
  "OBJECT_STORAGE_ENDPOINT",
  "OBJECT_STORAGE_REGION",
  "OBJECT_STORAGE_FORCE_PATH_STYLE",
] as const;

export interface AppConfig {
  server: {
    host: string;
    port: number;
  };
  database: {
    url: string;
  };
  ai: {
    claudeApiKey: string;
    claudeModel: string;
  };
  media: {
    youtubeApiKey?: string;
    imageApiKey?: string;
  };
}

export interface ObjectStorageConfig {
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  prefix: string;
  endpoint: string;
  region: string;
  forcePathStyle: boolean;
}

export interface OptionalIntegrationConfig {
  youtubeApiKey?: string;
  imageApiKey?: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = bootEnvSchema.safeParse(env);

  if (!parsed.success) {
    throw new Error(
      `Invalid environment configuration: ${formatZodIssues(parsed.error.issues)}`,
    );
  }

  return {
    server: {
      host: parsed.data.HOST,
      port: parsed.data.PORT,
    },
    database: {
      url: parsed.data.DATABASE_URL,
    },
    ai: {
      claudeApiKey: parsed.data.CLAUDE_API_KEY,
      claudeModel: parsed.data.CLAUDE_MODEL,
    },
    media: {
      youtubeApiKey: parsed.data.YOUTUBE_API_KEY,
      imageApiKey: parsed.data.IMAGE_API_KEY,
    },
  };
}

export function loadObjectStorageConfig(
  env: NodeJS.ProcessEnv = process.env,
): ObjectStorageConfig {
  const parsed = objectStorageEnvSchema.safeParse(env);

  if (!parsed.success) {
    throw new Error(
      `Invalid object storage configuration: ${formatZodIssues(parsed.error.issues)}`,
    );
  }

  return {
    accessKeyId: parsed.data.OBJECT_STORAGE_ACCESS_KEY_ID,
    secretAccessKey: parsed.data.OBJECT_STORAGE_SECRET_ACCESS_KEY,
    bucket: parsed.data.OBJECT_STORAGE_BUCKET,
    prefix: parsed.data.OBJECT_STORAGE_PREFIX,
    endpoint: parsed.data.OBJECT_STORAGE_ENDPOINT,
    region: parsed.data.OBJECT_STORAGE_REGION,
    forcePathStyle: parsed.data.OBJECT_STORAGE_FORCE_PATH_STYLE,
  };
}

export function loadOptionalIntegrationConfig(
  env: NodeJS.ProcessEnv = process.env,
): OptionalIntegrationConfig {
  const parsed = optionalIntegrationEnvSchema.parse(env);

  return {
    youtubeApiKey: parsed.YOUTUBE_API_KEY,
    imageApiKey: parsed.IMAGE_API_KEY,
  };
}

export function loadOptionalObjectStorageConfig(
  env: NodeJS.ProcessEnv = process.env,
): ObjectStorageConfig | undefined {
  const hasAnyStorageEnv = objectStorageEnvKeys.some((key) => env[key]);

  if (!hasAnyStorageEnv) {
    return undefined;
  }

  return loadObjectStorageConfig(env);
}

function formatZodIssues(issues: z.core.$ZodIssue[]): string {
  return issues
    .map((issue) => `${issue.path.join(".") || "ENV"}: ${issue.message}`)
    .join("; ");
}
