export interface RetryOptions {
  attempts: number;
  delayMs: number;
  shouldRetry?: (error: unknown) => boolean;
}

export async function retry<T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= options.attempts; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;

      if (attempt >= options.attempts || options.shouldRetry?.(error) === false) {
        break;
      }

      await sleep(options.delayMs * attempt);
    }
  }

  throw lastError;
}

function sleep(delayMs: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}
