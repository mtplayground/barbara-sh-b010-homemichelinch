import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { loadObjectStorageConfig, type ObjectStorageConfig } from "../../config/env.js";

const DEFAULT_SIGNED_URL_TTL_SECONDS = 60 * 60;

export interface StoredObjectInput {
  relativeKey: string;
  body: Buffer;
  contentType: string;
  cacheControl?: string;
}

export interface StoredObject {
  objectKey: string;
  relativeKey: string;
  url: string;
  contentType?: string;
}

interface ObjectStorageServiceOptions {
  config?: ObjectStorageConfig;
  client?: S3Client;
  signedUrlTtlSeconds?: number;
}

export class ObjectStorageService {
  private readonly config: ObjectStorageConfig;
  private readonly client: S3Client;
  private readonly signedUrlTtlSeconds: number;

  constructor(options: ObjectStorageServiceOptions = {}) {
    this.config = options.config ?? loadObjectStorageConfig();
    this.client = options.client ?? new S3Client(toS3ClientConfig(this.config));
    this.signedUrlTtlSeconds =
      options.signedUrlTtlSeconds ?? DEFAULT_SIGNED_URL_TTL_SECONDS;
  }

  async putObject(input: StoredObjectInput): Promise<StoredObject> {
    const objectKey = this.toObjectKey(input.relativeKey);

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: objectKey,
        Body: input.body,
        ContentLength: input.body.byteLength,
        ContentType: input.contentType,
        CacheControl: input.cacheControl,
      }),
    );

    return {
      objectKey,
      relativeKey: input.relativeKey,
      url: await this.getSignedReadUrl(input.relativeKey),
    };
  }

  async getIfExists(relativeKey: string): Promise<StoredObject | null> {
    const objectKey = this.toObjectKey(relativeKey);
    let contentType: string | undefined;

    try {
      const response = await this.client.send(
        new HeadObjectCommand({
          Bucket: this.config.bucket,
          Key: objectKey,
        }),
      );
      contentType = response.ContentType;
    } catch (error) {
      if (isNotFoundError(error)) {
        return null;
      }

      throw error;
    }

    return {
      objectKey,
      relativeKey,
      url: await this.getSignedReadUrl(relativeKey),
      contentType,
    };
  }

  async getSignedReadUrl(relativeKey: string): Promise<string> {
    const objectKey = this.toObjectKey(relativeKey);

    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: objectKey,
      }),
      { expiresIn: this.signedUrlTtlSeconds },
    );
  }

  toObjectKey(relativeKey: string): string {
    const cleanRelativeKey = relativeKey.replace(/^\/+/, "");

    if (!cleanRelativeKey) {
      throw new Error("Object storage relative key must not be blank");
    }

    return `${this.config.prefix}${cleanRelativeKey}`;
  }
}

function toS3ClientConfig(config: ObjectStorageConfig): S3ClientConfig {
  return {
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
  };
}

function isNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { name?: string; $metadata?: { httpStatusCode?: number } };
  return candidate.name === "NotFound" || candidate.$metadata?.httpStatusCode === 404;
}
