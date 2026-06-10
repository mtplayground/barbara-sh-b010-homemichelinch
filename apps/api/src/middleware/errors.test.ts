import assert from "node:assert/strict";
import test from "node:test";

import type { NextFunction, Request, Response } from "express";

import { ClaudeGenerationError } from "../services/generation/claudeGenerationService.js";
import { errorMiddleware } from "./errors.js";

interface CapturedResponse {
  statusCode?: number;
  body?: unknown;
}

function createMockRequest(): Request {
  return {
    method: "POST",
    originalUrl: "/api/guide",
  } as Request;
}

function createMockResponse(captured: CapturedResponse): Response {
  return {
    headersSent: false,
    status(code: number) {
      captured.statusCode = code;
      return this;
    },
    json(body: unknown) {
      captured.body = body;
      return this;
    },
  } as Response;
}

function invokeErrorMiddleware(error: unknown) {
  const captured: CapturedResponse = {};
  const originalConsoleError = console.error;
  console.error = () => undefined;

  try {
    errorMiddleware(
      error,
      createMockRequest(),
      createMockResponse(captured),
      (() => undefined) as NextFunction,
    );
  } finally {
    console.error = originalConsoleError;
  }

  return captured;
}

test("errorMiddleware maps missing dish_guides relation to schema readiness error", () => {
  const error = Object.assign(new Error('relation "dish_guides" does not exist'), {
    code: "42P01",
  });

  const response = invokeErrorMiddleware(error);

  assert.equal(response.statusCode, 503);
  assert.deepEqual(response.body, {
    error: {
      code: "GUIDE_SCHEMA_UNAVAILABLE",
      message: "Guide cache schema is not ready. Run database migrations and retry.",
      details: {
        dependency: "database",
        table: "dish_guides",
        action: "run database migrations",
      },
    },
  });
});

test("errorMiddleware maps database connectivity failures to actionable dependency error", () => {
  const error = Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:5432"), {
    code: "ECONNREFUSED",
  });

  const response = invokeErrorMiddleware(error);

  assert.equal(response.statusCode, 503);
  assert.deepEqual(response.body, {
    error: {
      code: "DATABASE_UNAVAILABLE",
      message: "Database is unavailable. Check DATABASE_URL and network connectivity.",
      details: {
        dependency: "database",
        action: "verify DATABASE_URL and database reachability",
      },
    },
  });
});

test("errorMiddleware maps Claude authentication errors to actionable dependency error", () => {
  const cause = Object.assign(new Error("invalid x-api-key"), { status: 401 });
  const error = new ClaudeGenerationError("Claude API authentication failed", cause);

  const response = invokeErrorMiddleware(error);

  assert.equal(response.statusCode, 502);
  assert.deepEqual(response.body, {
    error: {
      code: "CLAUDE_AUTH_FAILED",
      message: "Claude authentication failed. Check CLAUDE_API_KEY and model access.",
      details: {
        dependency: "claude",
        action: "verify CLAUDE_API_KEY and Anthropic account access",
      },
    },
  });
});

test("errorMiddleware maps invalid Claude response to retryable guide error", () => {
  const error = new ClaudeGenerationError("Claude response did not match guide schema");

  const response = invokeErrorMiddleware(error);

  assert.equal(response.statusCode, 502);
  assert.deepEqual(response.body, {
    error: {
      code: "CLAUDE_RESPONSE_INVALID",
      message:
        "Claude returned an invalid guide response. Try again or adjust the dish input.",
      details: {
        dependency: "claude",
        action: "retry with a clearer dish name",
      },
    },
  });
});
