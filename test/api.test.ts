import { describe, expect, it } from "bun:test";
import { fetchArticlesFromSource, newsSources } from "../src/util/api";

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
});
