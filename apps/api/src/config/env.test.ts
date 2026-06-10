import assert from "node:assert/strict";
import test from "node:test";

import {
  loadConfig,
  loadObjectStorageConfig,
  loadOptionalObjectStorageConfig,
} from "./env.js";

const requiredEnv = {
  DATABASE_URL: "postgresql://user:pass@example.com:5432/app",
  CLAUDE_API_KEY: "claude-key",
};

test("loadConfig only requires database and Claude settings at boot", () => {
  const config = loadConfig(requiredEnv);

  assert.equal(config.database.url, requiredEnv.DATABASE_URL);
  assert.equal(config.ai.claudeApiKey, requiredEnv.CLAUDE_API_KEY);
  assert.equal(config.ai.claudeModel, "claude-sonnet-4-6");
  assert.equal(config.media.youtubeApiKey, undefined);
  assert.equal(config.media.imageApiKey, undefined);
});

test("optional object storage config is absent when no storage env is set", () => {
  assert.equal(loadOptionalObjectStorageConfig(requiredEnv), undefined);
});

test("object storage config validates lazily when requested", () => {
  assert.throws(
    () => loadObjectStorageConfig(requiredEnv),
    /Invalid object storage configuration/,
  );
});

test("optional object storage config parses a complete storage env", () => {
  const config = loadOptionalObjectStorageConfig({
    ...requiredEnv,
    OBJECT_STORAGE_ACCESS_KEY_ID: "key",
    OBJECT_STORAGE_SECRET_ACCESS_KEY: "secret",
    OBJECT_STORAGE_BUCKET: "bucket",
    OBJECT_STORAGE_PREFIX: "app_barbara_sh_b010_homemichelinch_a42e73/",
    OBJECT_STORAGE_ENDPOINT: "https://storage.example",
  });

  assert.equal(config?.bucket, "bucket");
  assert.equal(config?.region, "auto");
  assert.equal(config?.forcePathStyle, true);
});
