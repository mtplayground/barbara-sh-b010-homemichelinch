import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

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

const envSchema = z.object({
  HOST: z.string().min(1).default("0.0.0.0"),
  PORT: portSchema.default(8080),
  DATABASE_URL: postgresUrlSchema,
  CLAUDE_API_KEY: z.string().min(1),
  YOUTUBE_API_KEY: z.string().min(1),
  IMAGE_API_KEY: z.string().min(1),
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
  };
  media: {
    youtubeApiKey: string;
    imageApiKey: string;
  };
  objectStorage: {
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
    prefix: string;
    endpoint: string;
    region: string;
    forcePathStyle: boolean;
  };
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(env);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "ENV"}: ${issue.message}`)
      .join("; ");

    throw new Error(`Invalid environment configuration: ${details}`);
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
    },
    media: {
      youtubeApiKey: parsed.data.YOUTUBE_API_KEY,
      imageApiKey: parsed.data.IMAGE_API_KEY,
    },
    objectStorage: {
      accessKeyId: parsed.data.OBJECT_STORAGE_ACCESS_KEY_ID,
      secretAccessKey: parsed.data.OBJECT_STORAGE_SECRET_ACCESS_KEY,
      bucket: parsed.data.OBJECT_STORAGE_BUCKET,
      prefix: parsed.data.OBJECT_STORAGE_PREFIX,
      endpoint: parsed.data.OBJECT_STORAGE_ENDPOINT,
      region: parsed.data.OBJECT_STORAGE_REGION,
      forcePathStyle: parsed.data.OBJECT_STORAGE_FORCE_PATH_STYLE,
    },
  };
}

export const config = loadConfig();
