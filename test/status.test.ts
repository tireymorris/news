import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import server from "../src/server.tsx";
import db from "../src/db";
import { ARTICLE_FETCH_INTERVAL_MS } from "../src/util/time";

let app: ReturnType<typeof Bun.serve>;

beforeAll(() => {
  app = Bun.serve({
    port: 3001,
    fetch: server.fetch,
  });
});

afterAll(() => {
  app.stop();
});

describe("Status Endpoint Integration", () => {
  it("should return status with correct structure and data types", async () => {
    const response = await fetch("http://localhost:3001/status");
    expect(response.status).toBe(200);

    const data = await response.json();

    // Assert presence of required fields
    expect(data).toHaveProperty("currentTime");
    expect(data).toHaveProperty("lastFetchTime");
    expect(data).toHaveProperty("shouldFetchArticles");

    // Assert data types
    expect(typeof data.currentTime).toBe("string");
    expect(
      data.lastFetchTime === null || typeof data.lastFetchTime === "string",
    ).toBe(true);
    expect(typeof data.shouldFetchArticles).toBe("boolean");

    // Verify timeSinceLastFetch is a string
    expect(typeof data.timeSinceLastFetch).toBe("string");

    // Verify nextFetchAvailable is a valid ISO date or "now"
    if (data.nextFetchAvailable !== "now") {
      expect(() => new Date(data.nextFetchAvailable)).not.toThrow();
      expect(new Date(data.nextFetchAvailable).toISOString()).toBe(
        data.nextFetchAvailable,
      );
    }
  });

  it("nextFetchAvailable is last fetch time plus the configured interval", async () => {
    const last = new Date(Date.now() - 60_000).toISOString();
    db.prepare(
      `INSERT OR REPLACE INTO fetch_metadata (key, value, updated_at) 
       VALUES ('last_fetch_time', ?, CURRENT_TIMESTAMP)`,
    ).run(last);
    try {
      const response = await fetch("http://localhost:3001/status");
      const data = await response.json();
      const expected = new Date(
        new Date(last).getTime() + ARTICLE_FETCH_INTERVAL_MS,
      ).toISOString();
      expect(data.nextFetchAvailable).toBe(expected);
    } finally {
      db.prepare("DELETE FROM fetch_metadata WHERE key = 'last_fetch_time'").run();
    }
  });
});
