import { describe, expect, it, beforeEach } from "bun:test";
import db from "../src/db";
import {
  shouldFetchArticles,
  ARTICLE_FETCH_INTERVAL_MS,
} from "../src/util/time";

beforeEach(() => {
  db.prepare("DELETE FROM fetch_metadata").run();
});

describe("shouldFetchArticles", () => {
  it("is true when there is no last fetch time", () => {
    expect(shouldFetchArticles()).toBe(true);
  });

  it("is false within the fetch interval", () => {
    db.prepare(
      `INSERT OR REPLACE INTO fetch_metadata (key, value, updated_at) 
       VALUES ('last_fetch_time', ?, CURRENT_TIMESTAMP)`,
    ).run(new Date().toISOString());
    expect(shouldFetchArticles()).toBe(false);
  });

  it("is true after the fetch interval", () => {
    const old = new Date(
      Date.now() - ARTICLE_FETCH_INTERVAL_MS - 1000,
    ).toISOString();
    db.prepare(
      `INSERT OR REPLACE INTO fetch_metadata (key, value, updated_at) 
       VALUES ('last_fetch_time', ?, CURRENT_TIMESTAMP)`,
    ).run(old);
    expect(shouldFetchArticles()).toBe(true);
  });
});
