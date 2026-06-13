import { describe, expect, it } from "bun:test";
import {
  apNewsBackfillAdapter,
  nprBackfillAdapter,
  parseApSitemapIndex,
} from "../src/backfill/adapters";

const nprArchiveHtml = `
  <article class="item">
    <h2 class="title"><a href="/2024/05/01/123456789/older-story-title">An Older NPR Story With Enough Words</a></h2>
    <time datetime="2024-05-01T14:30:00-04:00">May 1, 2024</time>
  </article>
`;

const apSitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
  <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <sitemap><loc>https://apnews.com/ap-sitemap-202606.xml</loc></sitemap>
    <sitemap><loc>https://apnews.com/ap-sitemap-202405.xml</loc></sitemap>
  </sitemapindex>`;

const apSitemap = `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
      <loc>https://apnews.com/article/an-older-ap-story-with-enough-words-abc123</loc>
      <lastmod>2024-05-01T10:15:00-04:00</lastmod>
    </url>
    <url>
      <loc>https://apnews.com/article/a-different-day-story-with-enough-words-def456</loc>
      <lastmod>2024-05-02T10:15:00-04:00</lastmod>
    </url>
  </urlset>`;

describe("backfill adapters", () => {
  it("discovers NPR archive articles for a target day", async () => {
    const articles = await nprBackfillAdapter.fetchArticles({
      date: "2024-05-01",
      fetchText: async (url) => {
        expect(url).toBe(
          "https://www.npr.org/sections/news/archive?date=5-1-2024",
        );
        return nprArchiveHtml;
      },
    });

    expect(articles).toEqual([
      {
        id: expect.any(String),
        title: "An Older NPR Story With Enough Words",
        link: "https://www.npr.org/2024/05/01/123456789/older-story-title",
        source: "NPR",
        created_at: expect.any(String),
        published_at: "2024-05-01T18:30:00.000Z",
      },
    ]);
  });

  it("discovers AP articles from dated sitemap files", async () => {
    const articles = await apNewsBackfillAdapter.fetchArticles({
      date: "2024-05-01",
      fetchText: async (url) => {
        if (url === "https://apnews.com/sitemap.xml") {
          return apSitemapIndex;
        }

        expect(url).toBe("https://apnews.com/ap-sitemap-202405.xml");
        return apSitemap;
      },
    });

    expect(articles).toEqual([
      {
        id: expect.any(String),
        title: "An Older AP Story With Enough Words",
        link: "https://apnews.com/article/an-older-ap-story-with-enough-words-abc123",
        source: "AP News",
        created_at: expect.any(String),
        published_at: "2024-05-01T14:15:00.000Z",
      },
    ]);
  });

  it("filters AP sitemap articles to the requested date", async () => {
    const articles = await apNewsBackfillAdapter.fetchArticles({
      date: "2024-05-02",
      fetchText: async (url) => {
        if (url === "https://apnews.com/sitemap.xml") {
          return apSitemapIndex;
        }

        return apSitemap;
      },
    });

    expect(articles.map((article) => article.link)).toEqual([
      "https://apnews.com/article/a-different-day-story-with-enough-words-def456",
    ]);
  });

  it("filters AP sitemap URLs to the requested month", () => {
    expect(parseApSitemapIndex(apSitemapIndex, "2024-05-01")).toEqual([
      "https://apnews.com/ap-sitemap-202405.xml",
    ]);
  });
});
