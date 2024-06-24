import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import db from "../src/db";
import { newsSources } from "../src/util/newsSources";
import { fetchArticlesFromSource } from "../src/util/crawler";

beforeAll(() => {
  db.run("DELETE FROM articles");
});

afterAll(() => {
  db.run("DROP TABLE IF EXISTS articles");
});

describe("Article Fetching Functions", () => {
  it("Should fetch and parse NPR articles", async () => {
    const articles = await fetchArticlesFromSource(newsSources[0]);
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
    const articles = await fetchArticlesFromSource(newsSources[1]);
    expect(articles.length).toBeGreaterThanOrEqual(10);
    articles.forEach((article) => {
      expect(article).toMatchObject({
        title: expect.any(String),
        link: expect.any(String),
        source: "Al Jazeera",
      });
    });
  });
});
