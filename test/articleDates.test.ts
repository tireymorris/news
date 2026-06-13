import { describe, expect, it, beforeEach } from "bun:test";
import db from "../src/db";
import {
  getCachedArticles,
  insertArticle,
  toArticleListItem,
} from "../src/models/article";
import { getLastUpdatedTimestamp } from "../src/util/time";

beforeEach(() => {
  db.prepare("DELETE FROM articles").run();
});

describe("article dates", () => {
  it("stores published_at separately from local discovery time", () => {
    insertArticle({
      id: "published-at-test",
      title: "Published At Test Article Title",
      link: "https://example.com/published-at-test",
      source: "Example",
      created_at: "2026-06-13T15:00:00.000Z",
      published_at: "1999-01-01T00:00:00.000Z",
    });

    const article = getCachedArticles(0, 1)[0];
    expect(article.created_at).toBe("2026-06-13T15:00:00.000Z");
    expect(article.published_at).toBe("1999-01-01T00:00:00.000Z");
  });

  it("orders articles by published_at when available", () => {
    insertArticle({
      id: "older-published",
      title: "Older Published Article Title Here",
      link: "https://example.com/older-published",
      source: "Example",
      created_at: "2026-06-13T15:00:00.000Z",
      published_at: "1999-01-01T00:00:00.000Z",
    });
    insertArticle({
      id: "newer-published",
      title: "Newer Published Article Title Here",
      link: "https://example.com/newer-published",
      source: "Example",
      created_at: "2020-01-01T00:00:00.000Z",
      published_at: "2024-01-01T00:00:00.000Z",
    });

    expect(getCachedArticles(0, 2).map((article) => article.id)).toEqual([
      "newer-published",
      "older-published",
    ]);
  });

  it("formats list items from published_at instead of created_at", () => {
    const item = toArticleListItem({
      id: "archive-item",
      title: "Archive Article Title Example",
      link: "https://example.com/archive",
      source: "NPR",
      created_at: "2026-06-13T18:00:00.000Z",
      published_at: "2010-01-01T05:00:00.000Z",
    });

    expect(item.relativeDate).toBe("Jan 1, 2010");
  });

  it("uses published_at for the last updated timestamp", () => {
    insertArticle({
      id: "newer-ingest",
      title: "Newer Ingest Article Title Here",
      link: "https://example.com/newer-ingest",
      source: "Example",
      created_at: "2026-06-13T18:00:00.000Z",
      published_at: "2026-06-13T12:00:00.000Z",
    });
    insertArticle({
      id: "older-ingest-newer-published",
      title: "Older Ingest Newer Published Title",
      link: "https://example.com/older-ingest-newer-published",
      source: "Example",
      created_at: "2026-06-13T10:00:00.000Z",
      published_at: "2026-06-13T17:00:00.000Z",
    });

    expect(getLastUpdatedTimestamp()?.toISOString()).toBe(
      "2026-06-13T17:00:00.000Z",
    );
  });
});
