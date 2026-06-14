export type FetchText = (url: string) => Promise<string>;

const FETCH_TIMEOUT_MS = 15000;
const FETCH_RETRY_ATTEMPTS = 3;

export const defaultSleep = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

const retryDelayMs = (attempt: number): number =>
  Math.min(5000 * 2 ** Math.max(attempt - 1, 0), 30000);

export const isTransientFetchError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("TimeoutError") ||
    message.includes("Unable to connect") ||
    message.includes("typo in the url") ||
    message.includes("ECONNRESET") ||
    message.includes("connection")
  );
};

export const fetchTextWithRetry = async (
  fetchText: FetchText,
  url: string,
  sleep: (milliseconds: number) => Promise<void> = defaultSleep,
): Promise<string> => {
  let lastError: unknown;

  for (let attempt = 1; attempt <= FETCH_RETRY_ATTEMPTS; attempt++) {
    try {
      return await fetchText(url);
    } catch (error) {
      lastError = error;
      if (attempt < FETCH_RETRY_ATTEMPTS && isTransientFetchError(error)) {
        await sleep(retryDelayMs(attempt));
        continue;
      }

      throw error;
    }
  }

  throw lastError;
};

export const createFetchText = (
  userAgent: string,
  timeoutMs = FETCH_TIMEOUT_MS,
): FetchText => {
  return async (url) => {
    const response = await fetch(url, {
      headers: { "User-Agent": userAgent },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status}`);
    }

    return response.text();
  };
};

export const backfillFetchText = createFetchText("hyperwave-backfill/0.1");
export const repairFetchText = createFetchText("hyperwave-repair/0.1");
