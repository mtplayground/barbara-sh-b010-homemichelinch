import type { GuideRequest, GuideResponse } from "@app/shared";

interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
}

export class GuideApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code = "GUIDE_API_ERROR",
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "GuideApiError";
  }
}

export async function createGuide(input: GuideRequest): Promise<GuideResponse> {
  const response = await fetch("/api/guide", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(input),
  });
  const payload = await parseJson(response);

  if (!response.ok) {
    const errorBody = payload as ApiErrorBody;
    throw new GuideApiError(
      errorBody.error?.message ?? "Unable to prepare the guide.",
      response.status,
      errorBody.error?.code,
      errorBody.error?.details,
    );
  }

  return payload as GuideResponse;
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    if (response.ok) {
      throw new GuideApiError(
        "The guide service returned invalid JSON.",
        response.status,
      );
    }

    return {};
  }
}
