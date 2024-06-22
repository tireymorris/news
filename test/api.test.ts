import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import { fetchArticlesFromSource, newsSources } from "../src/util/api";
import db from "../src/util/db";

beforeAll(() => {
  db.run("DELETE FROM articles");
});

afterAll(() => {
  db.run("DROP TABLE IF EXISTS articles");
});

describe("Article Fetching Functions", () => {
  it("Should fetch and parse NPR articles", async () => {
    const articles = await fetchArticlesFromSource(newsSources[0], 1);
    expect(articles.length).toBeGreaterThanOrEqual(10);
    articles.forEach((article) => {
      expect(article).toMatchObject({
        title: expect.any(String),
        link: expect.any(String),
        source: "NPR",
      });
    });
  });

  it("Should fetch and parse Al Jazeera articles", async () => {
    const articles = await fetchArticlesFromSource(newsSources[1], 1);
    expect(articles.length).toBeGreaterThanOrEqual(10);
    articles.forEach((article) => {
      expect(article).toMatchObject({
        title: expect.any(String),
        link: expect.any(String),
        source: "Al Jazeera",
      });
    });
  });

  it("Should cache fetched articles", async () => {
    const source = newsSources[0];

    const initialFetch = await fetchArticlesFromSource(source, 1);
    expect(initialFetch.length).toBeGreaterThanOrEqual(10);

    const cachedArticles = db
      .prepare("SELECT * FROM articles WHERE source = ? AND page = ?")
      .all(source.name, 1);
    expect(cachedArticles.length).toBeGreaterThanOrEqual(10);

    const secondFetch = await fetchArticlesFromSource(source, 1);
    expect(secondFetch.length).toBeGreaterThanOrEqual(10);
    expect(secondFetch).toEqual(initialFetch);
  });

  it("Should call clearCacheIfNeeded when fetching articles", async () => {
    const source = newsSources[0];

    let clearCacheCalled = false;
    const clearCacheSpy = () => {
      clearCacheCalled = true;
    };

    await fetchArticlesFromSource(source, 1, clearCacheSpy);
    expect(clearCacheCalled).toBe(true);
  });

  it("Should miss cache and fetch new articles", async () => {
    const source = newsSources[0];

    db.run("DELETE FROM articles");

    const initialFetch = await fetchArticlesFromSource(source, 1);
    expect(initialFetch.length).toBeGreaterThanOrEqual(10);

    const cachedArticles = db
      .prepare("SELECT * FROM articles WHERE source = ? AND page = ?")
      .all(source.name, 1);
    expect(cachedArticles.length).toBeGreaterThanOrEqual(10);
    expect(cachedArticles).toEqual(initialFetch);
  });
});
