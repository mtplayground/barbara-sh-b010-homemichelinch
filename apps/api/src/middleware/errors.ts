import type { NextFunction, Request, Response } from "express";

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

  const httpError =
    error instanceof HttpError
      ? error
      : new HttpError(500, "Internal Server Error", "INTERNAL_SERVER_ERROR");

  console.error("Request failed", {
    method: req.method,
    path: req.originalUrl,
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

function serializeError(error: unknown): unknown {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: "cause" in error ? error.cause : undefined,
    };
  }

  return error;
}
