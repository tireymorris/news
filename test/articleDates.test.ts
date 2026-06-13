import { describe, expect, it, beforeEach } from "bun:test";
import db from "../src/db";
import { getCachedArticles, insertArticle } from "../src/models/article";

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
});
