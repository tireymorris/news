export interface RetryEntry {
  issues: string[];
  attempts: number;
  lastAttemptMs: number;
}

export interface BackfillState {
  completed: string[];
  retry: Record<string, RetryEntry>;
}

export const retryDelayMs = (
  attempt: number,
  baseMs = 5000,
  maxMs = 300000,
): number => Math.min(baseMs * 2 ** Math.max(attempt - 1, 0), maxMs);

export const sleep = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export const isReadyForRetry = (entry: RetryEntry, now = Date.now()): boolean =>
  now >= entry.lastAttemptMs + retryDelayMs(entry.attempts);

export const selectNextPending = (
  items: string[],
  completed: Set<string>,
  retry: Record<string, RetryEntry>,
  now = Date.now(),
): string | null => {
  const incomplete = items.filter((item) => !completed.has(item));
  const fresh = incomplete.filter((item) => !retry[item]);
  if (fresh.length > 0) {
    return fresh[0];
  }

  const dueRetries = incomplete
    .filter((item) => retry[item] && isReadyForRetry(retry[item], now))
    .sort((left, right) => retry[left].attempts - retry[right].attempts);

  return dueRetries[0] ?? null;
};

export const selectNextMonth = selectNextPending;

export const retryWaitMs = (
  items: string[],
  completed: Set<string>,
  retry: Record<string, RetryEntry>,
  now = Date.now(),
): number => {
  const incomplete = items.filter((item) => !completed.has(item));
  const waiting = incomplete
    .filter((item) => retry[item] && !isReadyForRetry(retry[item], now))
    .map((item) => {
      const entry = retry[item];
      return entry.lastAttemptMs + retryDelayMs(entry.attempts) - now;
    });

  if (waiting.length === 0) {
    return 0;
  }

  return Math.max(0, Math.min(...waiting));
};

export const normalizeState = (raw: {
  completed?: string[];
  retry?: Record<string, RetryEntry>;
  failed?: Record<string, string[]>;
}): BackfillState => {
  const retry = raw.retry ?? {};

  for (const [item, issues] of Object.entries(raw.failed ?? {})) {
    if (!retry[item]) {
      retry[item] = {
        issues,
        attempts: 1,
        lastAttemptMs: 0,
      };
    }
  }

  return {
    completed: raw.completed ?? [],
    retry,
  };
};

export const normalizeMonthlyState = normalizeState;

export const enqueueRetry = (
  retry: Record<string, RetryEntry>,
  item: string,
  issues: string[],
  now = Date.now(),
): RetryEntry => {
  const previous = retry[item];
  const entry: RetryEntry = {
    issues,
    attempts: (previous?.attempts ?? 0) + 1,
    lastAttemptMs: now,
  };
  retry[item] = entry;
  return entry;
};
