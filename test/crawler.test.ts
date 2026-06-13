import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import { newsSources } from "models/newsSources";
import { fetchArticlesFromSource } from "util/crawler";
import db from "@/db";

beforeAll(() => {
  db.run("DELETE FROM articles");
});

afterAll(() => {
  db.run("DELETE FROM articles");
});

describe("Article Fetching Functions", () => {
  it("uses listing timestamps as published_at when available", async () => {
    const articles = await fetchArticlesFromSource(
      {
        name: "Example",
        url: "https://example.com/news",
        listSelector: ".promo",
        titleSelector: ".title",
        linkSelector: "a",
        publishedAtSelector: "time",
        publishedAtAttribute: "datetime",
        baseUrl: "https://example.com",
      },
      {
        fetchText: async () => `
          <div class="promo">
            <a href="/story"><span class="title">Example Article With Published Date</span></a>
            <time datetime="2024-05-01T12:30:00-04:00"></time>
          </div>
        `,
      },
    );

    expect(articles[0].published_at).toBe("2024-05-01T16:30:00.000Z");
  });

  it("uses article detail dates as published_at when listing dates are absent", async () => {
    const articles = await fetchArticlesFromSource(
      {
        name: "Example",
        url: "https://example.com/news",
        listSelector: "a",
        detailPublishedAtSelector: ".story-head p",
        baseUrl: "https://example.com",
      },
      {
        fetchText: async (url) => {
          if (url === "https://example.com/story") {
            return `<div class="story-head"><p>By Someone</p><p>Saturday, June 13, 2026 • 8:00 AM EDT</p></div>`;
          }

          return `<a href="/story">Example Article With Detail Published Date</a>`;
        },
      },
    );

    expect(articles[0].published_at).toBe("2026-06-13T12:00:00.000Z");
  });

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

  it("Should fetch and parse AP News articles", async () => {
    const articles = await fetchArticlesFromSource(newsSources[1]);
    expect(articles.length).toBeGreaterThanOrEqual(1);
    articles.forEach((article) => {
      expect(article).toMatchObject({
        title: expect.any(String),
        link: expect.any(String),
        source: "AP News",
      });
    });
  });
});
