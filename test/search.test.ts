import { describe, expect, it, beforeAll } from "bun:test";
import db from "../src/db";
import {
  insertArticle,
  searchArticles,
  getSearchResultCount,
} from "../src/models/article";
import type { Article } from "../src/models/article";

beforeAll(() => {
  db.prepare("DELETE FROM articles").run();
  const articles: Article[] = [
    {
      id: "search-1",
      title: "Alpha Beta Gamma Delta Epsilon",
      link: "https://example.com/search-1",
      source: "Source North",
      created_at: new Date().toISOString(),
    },
    {
      id: "search-2",
      title: "Quote O'Brien Story Here Today",
      link: "https://example.com/search-2",
      source: "Source South",
      created_at: new Date().toISOString(),
    },
  ];
  articles.forEach(insertArticle);
});

describe("searchArticles / getSearchResultCount", () => {
  it("returns the same row count as a wide list search", () => {
    const q = "Alpha";
    expect(getSearchResultCount(q)).toBe(searchArticles(q, 0, 100).length);
  });

  it("treats malicious-looking input as a literal pattern", () => {
    const q = `x' OR 1=1--`;
    const rows = searchArticles(q, 0, 100);
    expect(getSearchResultCount(q)).toBe(rows.length);
    expect(rows.length).toBe(0);
  });

  it("matches apostrophes in titles case-insensitively", () => {
    const rows = searchArticles("o'brien", 0, 100);
    expect(rows.length).toBe(1);
    expect(rows[0].title).toContain("O'Brien");
  });

  it("matches source with consistent count predicate", () => {
    const q = "North";
    expect(getSearchResultCount(q)).toBe(searchArticles(q, 0, 100).length);
    expect(searchArticles(q, 0, 10).length).toBeGreaterThan(0);
  });
});
