import { describe, expect, it } from "bun:test";
import {
  isTransientError,
  retryDelayMs,
  retryWithBackoff,
} from "../src/backfill/retry";

describe("backfill retry helpers", () => {
  it("detects transient network failures", () => {
    expect(
      isTransientError(
        new Error("Unable to connect. Is the computer able to access the url?"),
      ),
    ).toBe(true);
    expect(isTransientError(new Error("The operation timed out"))).toBe(true);
    expect(isTransientError({ code: "FailedToOpenSocket" })).toBe(true);
  });

  it("does not treat validation failures as transient", () => {
    expect(isTransientError(new Error("NPR has zero articles"))).toBe(false);
  });

  it("backs off exponentially with a cap", () => {
    expect(retryDelayMs(1, 5000, 300000)).toBe(5000);
    expect(retryDelayMs(3, 5000, 300000)).toBe(20000);
    expect(retryDelayMs(10, 5000, 300000)).toBe(300000);
  });

  it("retries transient operations until they succeed", async () => {
    let attempts = 0;

    const value = await retryWithBackoff(
      "fetch",
      async () => {
        attempts += 1;
        if (attempts < 3) {
          throw new Error("The operation timed out");
        }
        return "ok";
      },
      { maxAttempts: 3, baseDelayMs: 0, maxDelayMs: 0 },
    );

    expect(value).toBe("ok");
    expect(attempts).toBe(3);
  });
});
