const TRANSIENT_ERROR_PATTERNS = [
  /FailedToOpenSocket/i,
  /Unable to connect/i,
  /TimeoutError/i,
  /timed out/i,
  /timeout/i,
  /ECONNRESET/i,
  /ECONNREFUSED/i,
  /ENOTFOUND/i,
  /EAI_AGAIN/i,
  /socket hang up/i,
  /network/i,
];

export const isTransientError = (error: unknown): boolean => {
  const parts: string[] = [];

  if (typeof error === "object" && error !== null) {
    if ("code" in error) {
      parts.push(String((error as { code: unknown }).code));
    }
    if ("message" in error) {
      parts.push(String((error as { message: unknown }).message));
    }
    if ("name" in error) {
      parts.push(String((error as { name: unknown }).name));
    }
  }

  if (error instanceof Error) {
    parts.push(error.name, error.message);
  }

  parts.push(String(error));

  const message = parts.join(" ");
  return TRANSIENT_ERROR_PATTERNS.some((pattern) => pattern.test(message));
};

export const retryDelayMs = (
  attempt: number,
  baseMs = 5000,
  maxMs = 300000,
): number => Math.min(baseMs * 2 ** Math.max(attempt - 1, 0), maxMs);

export const sleep = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export const retryWithBackoff = async <T>(
  label: string,
  operation: () => Promise<T>,
  options: {
    maxAttempts?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    shouldRetry?: (error: unknown) => boolean;
  } = {},
): Promise<T> => {
  const maxAttempts = options.maxAttempts ?? Number.POSITIVE_INFINITY;
  const shouldRetry = options.shouldRetry ?? isTransientError;
  let attempt = 1;

  while (attempt <= maxAttempts) {
    try {
      return await operation();
    } catch (error) {
      if (!shouldRetry(error)) {
        throw error;
      }

      const delayMs = retryDelayMs(attempt, options.baseDelayMs, options.maxDelayMs);
      console.error(
        `[retry] ${label} attempt ${attempt} failed; retrying in ${delayMs}ms: ${error}`,
      );
      await sleep(delayMs);
      attempt += 1;
    }
  }

  throw new Error(`[retry] ${label} exhausted attempts`);
};
