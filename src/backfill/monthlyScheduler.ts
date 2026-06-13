import { retryDelayMs } from "./retry";

export interface RetryEntry {
  issues: string[];
  attempts: number;
  lastAttemptMs: number;
}

export interface MonthlyState {
  completed: string[];
  retry: Record<string, RetryEntry>;
}

export const isReadyForRetry = (entry: RetryEntry, now = Date.now()): boolean =>
  now >= entry.lastAttemptMs + retryDelayMs(entry.attempts);

export const selectNextMonth = (
  months: string[],
  completed: Set<string>,
  retry: Record<string, RetryEntry>,
  now = Date.now(),
): string | null => {
  const incomplete = months.filter((month) => !completed.has(month));
  const fresh = incomplete.filter((month) => !retry[month]);
  if (fresh.length > 0) {
    return fresh[0];
  }

  const dueRetries = incomplete
    .filter((month) => retry[month] && isReadyForRetry(retry[month], now))
    .sort((left, right) => retry[left].attempts - retry[right].attempts);

  return dueRetries[0] ?? null;
};

export const retryWaitMs = (
  months: string[],
  completed: Set<string>,
  retry: Record<string, RetryEntry>,
  now = Date.now(),
): number => {
  const incomplete = months.filter((month) => !completed.has(month));
  const waiting = incomplete
    .filter((month) => retry[month] && !isReadyForRetry(retry[month], now))
    .map((month) => {
      const entry = retry[month];
      return entry.lastAttemptMs + retryDelayMs(entry.attempts) - now;
    });

  if (waiting.length === 0) {
    return 0;
  }

  return Math.max(0, Math.min(...waiting));
};

export const normalizeMonthlyState = (raw: {
  completed?: string[];
  retry?: Record<string, RetryEntry>;
  failed?: Record<string, string[]>;
}): MonthlyState => {
  const retry = raw.retry ?? {};

  for (const [month, issues] of Object.entries(raw.failed ?? {})) {
    if (!retry[month]) {
      retry[month] = {
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

export const enqueueRetry = (
  retry: Record<string, RetryEntry>,
  month: string,
  issues: string[],
  now = Date.now(),
): RetryEntry => {
  const previous = retry[month];
  const entry: RetryEntry = {
    issues,
    attempts: (previous?.attempts ?? 0) + 1,
    lastAttemptMs: now,
  };
  retry[month] = entry;
  return entry;
};
