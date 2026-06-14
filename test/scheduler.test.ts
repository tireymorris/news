import { describe, expect, it } from "bun:test";
import {
  enqueueRetry,
  isReadyForRetry,
  normalizeMonthlyState,
  retryDelayMs,
  retryWaitMs,
  selectNextMonth,
} from "../src/backfill/scheduler";

const months = ["2026-06", "2025-05", "2025-04", "2010-01"];

describe("scheduler", () => {
  it("prefers fresh incomplete months over retry queue entries", () => {
    const completed = new Set(["2026-06", "2025-05"]);
    const retry = {
      "2025-04": {
        issues: ["timeout"],
        attempts: 2,
        lastAttemptMs: 0,
      },
    };

    expect(selectNextMonth(months, completed, retry)).toBe("2010-01");
  });

  it("selects retry-ready months when no fresh months remain", () => {
    const completed = new Set(["2026-06", "2025-05", "2010-01"]);
    const now = 1_000_000;
    const retry = {
      "2025-04": {
        issues: ["timeout"],
        attempts: 1,
        lastAttemptMs: now - 10_000,
      },
    };

    expect(selectNextMonth(months, completed, retry, now)).toBe("2025-04");
  });

  it("waits until backoff expires before retrying a queued month", () => {
    const entry = {
      issues: ["timeout"],
      attempts: 2,
      lastAttemptMs: 1_000,
    };
    const now = 2_000;

    expect(isReadyForRetry(entry, now)).toBe(false);
    expect(retryWaitMs(months, new Set(["2026-06"]), { "2025-05": entry }, now)).toBeGreaterThan(
      0,
    );
  });

  it("backs off exponentially with a cap", () => {
    expect(retryDelayMs(1, 5000, 300000)).toBe(5000);
    expect(retryDelayMs(3, 5000, 300000)).toBe(20000);
    expect(retryDelayMs(10, 5000, 300000)).toBe(300000);
  });

  it("migrates legacy failed state into retry entries", () => {
    expect(
      normalizeMonthlyState({
        completed: ["2026-06"],
        failed: {
          "2025-04": ["timeout"],
        },
      }),
    ).toEqual({
      completed: ["2026-06"],
      retry: {
        "2025-04": {
          issues: ["timeout"],
          attempts: 1,
          lastAttemptMs: 0,
        },
      },
    });
  });

  it("increments retry attempts without dropping the month", () => {
    const retry: Record<string, ReturnType<typeof enqueueRetry>> = {};
    enqueueRetry(retry, "2025-04", ["first"], 100);
    const second = enqueueRetry(retry, "2025-04", ["second"], 200);

    expect(second.attempts).toBe(2);
    expect(second.issues).toEqual(["second"]);
    expect(second.lastAttemptMs).toBe(200);
  });
});
