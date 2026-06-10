import type { NextFunction, Request, Response } from "express";

import { ClaudeGenerationError } from "../services/generation/claudeGenerationService.js";

export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
    readonly code = "HTTP_ERROR",
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function errorMiddleware(
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (res.headersSent) {
    next(error);
    return;
  }

  const httpError = toHttpError(error);

  console.error("Request failed", {
    method: req.method,
    path: req.originalUrl,
    statusCode: httpError.statusCode,
    code: httpError.code,
    message: httpError.message,
    error: serializeError(error),
  });

  res.status(httpError.statusCode).json({
    error: {
      code: httpError.code,
      message: httpError.message,
      details: httpError.details,
    },
  });
}

function toHttpError(error: unknown): HttpError {
  if (error instanceof HttpError) {
    return error;
  }

  if (isDishGuidesMissingRelation(error)) {
    return new HttpError(
      503,
      "Guide cache schema is not ready. Run database migrations and retry.",
      "GUIDE_SCHEMA_UNAVAILABLE",
      {
        dependency: "database",
        table: "dish_guides",
        action: "run database migrations",
      },
    );
  }

  if (isDatabaseConnectivityError(error)) {
    return new HttpError(
      503,
      "Database is unavailable. Check DATABASE_URL and network connectivity.",
      "DATABASE_UNAVAILABLE",
      {
        dependency: "database",
        action: "verify DATABASE_URL and database reachability",
      },
    );
  }

  if (error instanceof ClaudeGenerationError) {
    return classifyClaudeError(error);
  }

  return new HttpError(500, "Internal Server Error", "INTERNAL_SERVER_ERROR");
}

function classifyClaudeError(error: ClaudeGenerationError): HttpError {
  if (isClaudeAuthError(error)) {
    return new HttpError(
      502,
      "Claude authentication failed. Check CLAUDE_API_KEY and model access.",
      "CLAUDE_AUTH_FAILED",
      {
        dependency: "claude",
        action: "verify CLAUDE_API_KEY and Anthropic account access",
      },
    );
  }

  if (error.message.includes("guide schema") || error.message.includes("text content")) {
    return new HttpError(
      502,
      "Claude returned an invalid guide response. Try again or adjust the dish input.",
      "CLAUDE_RESPONSE_INVALID",
      {
        dependency: "claude",
        action: "retry with a clearer dish name",
      },
    );
  }

  return new HttpError(
    502,
    "Claude generation failed. Check Claude service availability and retry.",
    "CLAUDE_GENERATION_FAILED",
    {
      dependency: "claude",
      action: "check Claude service status and retry",
    },
  );
}

function serializeError(error: unknown): unknown {
  if (error instanceof Error) {
    return {
      name: error.name,
      code: readErrorCode(error),
      message: error.message,
      httpStatus: readHttpStatus(error),
      stack: error.stack,
      cause: "cause" in error ? serializeError(error.cause) : undefined,
    };
  }

  return error;
}

function isDishGuidesMissingRelation(error: unknown): boolean {
  return (
    readErrorCode(error) === "42P01" ||
    readErrorMessage(error).includes('relation "dish_guides" does not exist')
  );
}

function isDatabaseConnectivityError(error: unknown): boolean {
  const code = readErrorCode(error);
  const message = readErrorMessage(error).toLowerCase();

  return (
    code.startsWith("08") ||
    ["ECONNREFUSED", "ECONNRESET", "ENOTFOUND", "ETIMEDOUT", "57P01", "53300"].includes(
      code,
    ) ||
    message.includes("connection terminated unexpectedly") ||
    message.includes("database connection") ||
    message.includes("connect econnrefused")
  );
}

function isClaudeAuthError(error: ClaudeGenerationError): boolean {
  const cause = error.cause;
  const status = readHttpStatus(cause);
  const code = readErrorCode(cause).toLowerCase();
  const message = `${error.message} ${readErrorMessage(cause)}`.toLowerCase();

  return (
    status === 401 ||
    status === 403 ||
    code.includes("authentication") ||
    code.includes("permission") ||
    message.includes("unauthorized") ||
    message.includes("authentication") ||
    message.includes("api key") ||
    message.includes("permission")
  );
}

function readErrorCode(error: unknown): string {
  const value = readObjectValue(error, "code");
  return typeof value === "string" ? value : "";
}

function readHttpStatus(error: unknown): number | undefined {
  const status = readObjectValue(error, "status");
  if (typeof status === "number") {
    return status;
  }

  const statusCode = readObjectValue(error, "statusCode");
  if (typeof statusCode === "number") {
    return statusCode;
  }

  const metadata = readObjectValue(error, "$metadata");
  if (metadata && typeof metadata === "object") {
    const httpStatusCode = (metadata as { httpStatusCode?: unknown }).httpStatusCode;
    if (typeof httpStatusCode === "number") {
      return httpStatusCode;
    }
  }

  if (error && typeof error === "object" && "cause" in error) {
    return readHttpStatus(error.cause);
  }

  return undefined;
}

function readErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "";
}

function readObjectValue(error: unknown, key: string): unknown {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  return (error as Record<string, unknown>)[key];
}
