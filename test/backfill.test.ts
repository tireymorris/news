import { beforeEach, describe, expect, it } from "bun:test";
import {
  apNewsBackfillAdapter,
  clearApMonthArticlesCache,
  clearApRequirementCache,
  fetchApArticlesForMonth,
  isApStorySitemapUrl,
  isApSyndicationArticle,
  nprBackfillAdapter,
  parseApSitemapIndex,
  resolveApRequirement,
  shouldAttemptAp,
} from "../src/backfill/adapters";

const nprArchiveHtml = `
  <article class="item">
    <h2 class="title"><a href="/2024/05/01/123456789/older-story-title">An Older NPR Story With Enough Words</a></h2>
    <time datetime="2024-05-01T14:30:00-04:00">May 1, 2024</time>
  </article>
  <article class="item">
    <h2 class="title"><a href="/2024/04/30/123456788/previous-day-title">Previous Day NPR Story With Enough Words</a></h2>
    <time datetime="2024-04-30">April 30, 2024</time>
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
      <lastmod>2021-08-13T10:15:00-04:00</lastmod>
    </url>
  </urlset>`;

describe("backfill adapters", () => {
  beforeEach(() => {
    clearApMonthArticlesCache();
    clearApRequirementCache();
  });

  it("discovers NPR archive articles from listing timestamps without detail fetches", async () => {
    const fetchedUrls: string[] = [];

    const articles = await nprBackfillAdapter.fetchArticles({
      date: "2024-05-01",
      fetchText: async (url) => {
        fetchedUrls.push(url);
        if (url === "https://www.npr.org/sections/news/archive?date=5-1-2024") {
          return nprArchiveHtml;
        }

        throw new Error(`unexpected fetch ${url}`);
      },
    });

    expect(fetchedUrls).toEqual([
      "https://www.npr.org/sections/news/archive?date=5-1-2024",
    ]);
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

  it("falls back to archive datetime when date-only listings cannot load detail pages", async () => {
    const dateOnlyArchiveHtml = `
      <article class="item">
        <h2 class="title"><a href="/2024/05/01/123456789/date-only-story-title">Date Only NPR Story With Enough Words</a></h2>
        <time datetime="2024-05-01">May 1, 2024</time>
      </article>
    `;

    const articles = await nprBackfillAdapter.fetchArticles({
      date: "2024-05-01",
      fetchText: async (url) => {
        if (url === "https://www.npr.org/sections/news/archive?date=5-1-2024") {
          return dateOnlyArchiveHtml;
        }

        throw new Error("timeout");
      },
    });

    expect(articles).toEqual([
      {
        id: expect.any(String),
        title: "Date Only NPR Story With Enough Words",
        link: "https://www.npr.org/2024/05/01/123456789/date-only-story-title",
        source: "NPR",
        created_at: expect.any(String),
        published_at: "2024-05-01T00:00:00.000Z",
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

        if (url === "https://apnews.com/ap-sitemap-202405.xml") {
          return apSitemap;
        }

        if (
          url ===
          "https://apnews.com/article/an-older-ap-story-with-enough-words-abc123"
        ) {
          return `<meta property="article:published_time" content="2024-05-01T09:00:00-04:00">`;
        }

        return `<meta property="article:published_time" content="2024-05-02T09:00:00-04:00">`;
      },
    });

    expect(articles).toEqual([
      {
        id: expect.any(String),
        title: "An Older AP Story With Enough Words",
        link: "https://apnews.com/article/an-older-ap-story-with-enough-words-abc123",
        source: "AP News",
        created_at: expect.any(String),
        published_at: "2024-05-01T13:00:00.000Z",
      },
    ]);
  });

  it("uses AP detail-page published dates when sitemap lastmod is a later migration date", async () => {
    const articles = await fetchApArticlesForMonth({
      month: "2024-05",
      fetchText: async (url) => {
        if (url === "https://apnews.com/sitemap.xml") {
          return apSitemapIndex;
        }

        if (url === "https://apnews.com/ap-sitemap-202405.xml") {
          return apSitemap;
        }

        if (
          url ===
          "https://apnews.com/article/a-different-day-story-with-enough-words-def456"
        ) {
          return `<meta property="article:published_time" content="2024-05-02T09:00:00-04:00">`;
        }

        return `<meta property="article:published_time" content="2024-05-01T09:00:00-04:00">`;
      },
    });

    expect(
      articles.some(
        (article) =>
          article.link ===
          "https://apnews.com/article/a-different-day-story-with-enough-words-def456",
      ),
    ).toBe(true);
  });

  it("skips AP article detail pages that fail during backfill", async () => {
    const articles = await apNewsBackfillAdapter.fetchArticles({
      date: "2024-05-01",
      fetchText: async (url) => {
        if (url === "https://apnews.com/sitemap.xml") {
          return apSitemapIndex;
        }

        if (url === "https://apnews.com/ap-sitemap-202405.xml") {
          return apSitemap;
        }

        throw new Error("timeout");
      },
    });

    expect(articles).toEqual([]);
  });

  it("retries transient NPR archive fetch failures", async () => {
    let archiveAttempts = 0;

    const articles = await nprBackfillAdapter.fetchArticles({
      date: "2024-05-01",
      sleep: async () => {},
      fetchText: async (url) => {
        if (url === "https://www.npr.org/sections/news/archive?date=5-1-2024") {
          archiveAttempts += 1;
          if (archiveAttempts < 2) {
            throw new Error("Unable to connect. Is the computer able to access the url?");
          }

          return nprArchiveHtml;
        }

        throw new Error(`unexpected fetch ${url}`);
      },
    });

    expect(archiveAttempts).toBe(2);
    expect(articles).toHaveLength(1);
  });

  it("sleeps between AP article detail requests", async () => {
    const sleeps: number[] = [];

    await apNewsBackfillAdapter.fetchArticles({
      date: "2024-05-01",
      sleepMs: 25,
      sleep: async (milliseconds) => {
        sleeps.push(milliseconds);
      },
      fetchText: async (url) => {
        if (url === "https://apnews.com/sitemap.xml") {
          return apSitemapIndex;
        }

        if (url === "https://apnews.com/ap-sitemap-202405.xml") {
          return apSitemap;
        }

        return `<meta property="article:published_time" content="2024-05-01T09:00:00-04:00">`;
      },
    });

    expect(sleeps).toEqual([25]);
  });

  it("filters AP sitemap articles to the requested date", async () => {
    const articles = await apNewsBackfillAdapter.fetchArticles({
      date: "2024-05-01",
      fetchText: async (url) => {
        if (url === "https://apnews.com/sitemap.xml") {
          return apSitemapIndex;
        }

        if (url === "https://apnews.com/ap-sitemap-202405.xml") {
          return apSitemap;
        }

        if (
          url ===
          "https://apnews.com/article/an-older-ap-story-with-enough-words-abc123"
        ) {
          return `<meta property="article:published_time" content="2024-05-01T09:00:00-04:00">`;
        }

        return `<meta property="article:published_time" content="2024-05-02T09:00:00-04:00">`;
      },
    });

    expect(articles.map((article) => article.link)).toEqual([
      "https://apnews.com/article/an-older-ap-story-with-enough-words-abc123",
    ]);
  });

  it("filters AP sitemap URLs to the requested month", () => {
    expect(parseApSitemapIndex(apSitemapIndex, "2024-05-01")).toEqual([
      "https://apnews.com/ap-sitemap-202405.xml",
    ]);
  });

  it("falls back to year sitemaps when the requested month is missing", () => {
    const indexWithYearGap = `<?xml version="1.0" encoding="UTF-8"?>
  <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <sitemap><loc>https://apnews.com/ap-sitemap-201002.xml</loc></sitemap>
    <sitemap><loc>https://apnews.com/ap-sitemap-201006.xml</loc></sitemap>
    <sitemap><loc>https://apnews.com/ap-sitemap-201112.xml</loc></sitemap>
  </sitemapindex>`;

    expect(parseApSitemapIndex(indexWithYearGap, "2010-01-01")).toEqual([
      "https://apnews.com/ap-sitemap-201002.xml",
      "https://apnews.com/ap-sitemap-201006.xml",
    ]);
  });

  it("accepts legacy AP story URLs without the article path prefix", () => {
    expect(
      isApStorySitemapUrl(
        "https://apnews.com/ap-impact-credibility-key-in-9-11-health-trials-abc123",
      ),
    ).toBe(true);
    expect(isApStorySitemapUrl("https://apnews.com/author/jack-brook")).toBe(
      false,
    );
  });

  it("discovers legacy AP articles from dated sitemap files", async () => {
    const legacySitemap = `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
      <loc>https://apnews.com/legacy-ap-story-with-enough-words-abc123</loc>
    </url>
    <url>
      <loc>https://apnews.com/author/jack-brook</loc>
    </url>
  </urlset>`;

    const articles = await apNewsBackfillAdapter.fetchArticles({
      date: "2010-02-08",
      fetchText: async (url) => {
        if (url === "https://apnews.com/sitemap.xml") {
          return `<?xml version="1.0" encoding="UTF-8"?>
  <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <sitemap><loc>https://apnews.com/ap-sitemap-201002.xml</loc></sitemap>
  </sitemapindex>`;
        }

        if (url === "https://apnews.com/ap-sitemap-201002.xml") {
          return legacySitemap;
        }

        if (url === "https://apnews.com/legacy-ap-story-with-enough-words-abc123") {
          return `<meta property="og:title" content="Legacy AP Story With Enough Words">
            <meta property="article:published_time" content="2010-02-08T09:00:00-05:00">`;
        }

        throw new Error(`unexpected fetch ${url}`);
      },
    });

    expect(articles).toEqual([
      {
        id: expect.any(String),
        title: "Legacy AP Story With Enough Words",
        link: "https://apnews.com/legacy-ap-story-with-enough-words-abc123",
        source: "AP News",
        created_at: expect.any(String),
        published_at: "2010-02-08T14:00:00.000Z",
      },
    ]);
  });

  it("requires AP for months without a dedicated sitemap but with year coverage", async () => {
    clearApRequirementCache();

    const fetchIndex = async (url: string) => {
      if (url === "https://apnews.com/sitemap.xml") {
        return `<?xml version="1.0" encoding="UTF-8"?>
  <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <sitemap><loc>https://apnews.com/ap-sitemap-201002.xml</loc></sitemap>
  </sitemapindex>`;
      }

      throw new Error(`unexpected fetch ${url}`);
    };

    expect(await shouldAttemptAp("2010-01", fetchIndex)).toBe(true);
    expect(await resolveApRequirement("2010-01", fetchIndex)).toBe(false);
  });

  it("fetches AP articles once per month instead of once per day", async () => {
    const fetchedUrls: string[] = [];

    const articles = await fetchApArticlesForMonth({
      month: "2024-05",
      fetchText: async (url) => {
        fetchedUrls.push(url);
        if (url === "https://apnews.com/sitemap.xml") {
          return apSitemapIndex;
        }

        if (url === "https://apnews.com/ap-sitemap-202405.xml") {
          return apSitemap;
        }

        if (
          url ===
          "https://apnews.com/article/an-older-ap-story-with-enough-words-abc123"
        ) {
          return `<meta property="article:published_time" content="2024-05-01T09:00:00-04:00">`;
        }

        return `<meta property="article:published_time" content="2024-05-02T09:00:00-04:00">`;
      },
    });

    expect(fetchedUrls).toEqual([
      "https://apnews.com/sitemap.xml",
      "https://apnews.com/ap-sitemap-202405.xml",
      "https://apnews.com/article/an-older-ap-story-with-enough-words-abc123",
      "https://apnews.com/article/a-different-day-story-with-enough-words-def456",
    ]);
    expect(articles).toHaveLength(2);
  });

  it("reports AP scan progress while fetching a month", async () => {
    const progressEvents: {
      processedUrls: number;
      totalUrls: number;
      matchedArticles: number;
    }[] = [];

    await fetchApArticlesForMonth({
      month: "2024-05",
      onProgress: (progress) => progressEvents.push({ ...progress }),
      fetchText: async (url) => {
        if (url === "https://apnews.com/sitemap.xml") {
          return apSitemapIndex;
        }

        if (url === "https://apnews.com/ap-sitemap-202405.xml") {
          return apSitemap;
        }

        if (
          url ===
          "https://apnews.com/article/an-older-ap-story-with-enough-words-abc123"
        ) {
          return `<meta property="article:published_time" content="2024-05-01T09:00:00-04:00">`;
        }

        return `<meta property="article:published_time" content="2024-05-02T09:00:00-04:00">`;
      },
    });

    expect(progressEvents[0]).toEqual({
      processedUrls: 0,
      totalUrls: 2,
      matchedArticles: 0,
    });
    expect(progressEvents.at(-1)).toEqual({
      processedUrls: 2,
      totalUrls: 2,
      matchedArticles: 2,
    });
  });

  it("caches AP sitemap lookups per month", async () => {
    clearApRequirementCache();
    let fetches = 0;

    const fetchText = async (url: string) => {
      if (url === "https://apnews.com/sitemap.xml") {
        fetches += 1;
        return apSitemapIndex;
      }

      throw new Error(`unexpected fetch ${url}`);
    };

    await resolveApRequirement("2024-05", fetchText);
    await resolveApRequirement("2024-05", fetchText);

    expect(fetches).toBe(1);
  });

  it("falls back to NPR-only when AP sitemap lookup fails", async () => {
    clearApRequirementCache();

    const requireAp = await resolveApRequirement("2024-05", async () => {
      throw new Error("Unable to connect. Is the computer able to access the url?");
    });

    expect(requireAp).toBe(false);
  });

  it("uses AP detail page titles when the sitemap has no title", async () => {
    clearApMonthArticlesCache();

    const articles = await apNewsBackfillAdapter.fetchArticles({
      date: "2024-05-01",
      fetchText: async (url) => {
        if (url === "https://apnews.com/sitemap.xml") {
          return apSitemapIndex;
        }

        if (url === "https://apnews.com/ap-sitemap-202405.xml") {
          return apSitemap;
        }

        return `<meta property="og:title" content="An Older AP Story With Enough Words From Detail Page">
          <meta property="article:published_time" content="2024-05-01T09:00:00-04:00">`;
      },
    });

    expect(articles[0]?.title).toBe(
      "An Older AP Story With Enough Words From Detail Page",
    );
  });

  it("filters daily AP articles by detail-page published date", async () => {
    const daySitemap = `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
      <loc>https://apnews.com/article/same-day-story-with-enough-words-abc123</loc>
      <lastmod>2024-05-01T10:15:00-04:00</lastmod>
    </url>
    <url>
      <loc>https://apnews.com/article/different-day-story-with-enough-words-def456</loc>
      <lastmod>2024-05-02T10:15:00-04:00</lastmod>
    </url>
  </urlset>`;
    const fetchedUrls: string[] = [];
    clearApMonthArticlesCache();

    const articles = await apNewsBackfillAdapter.fetchArticles({
      date: "2024-05-01",
      fetchText: async (url) => {
        fetchedUrls.push(url);
        if (url === "https://apnews.com/sitemap.xml") {
          return apSitemapIndex;
        }

        if (url === "https://apnews.com/ap-sitemap-202405.xml") {
          return daySitemap;
        }

        if (
          url ===
          "https://apnews.com/article/different-day-story-with-enough-words-def456"
        ) {
          return `<meta property="article:published_time" content="2024-05-02T09:00:00-04:00">`;
        }

        return `<meta property="article:published_time" content="2024-05-01T09:00:00-04:00">`;
      },
    });

    expect(articles).toHaveLength(1);
    expect(fetchedUrls).toEqual([
      "https://apnews.com/sitemap.xml",
      "https://apnews.com/ap-sitemap-202405.xml",
      "https://apnews.com/article/same-day-story-with-enough-words-abc123",
      "https://apnews.com/article/different-day-story-with-enough-words-def456",
    ]);
  });

  it("skips AP syndication wire stubs during backfill", async () => {
    const syndicationSitemap = `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
      <loc>https://apnews.com/article/editorial-story-with-enough-words-abc123</loc>
    </url>
    <url>
      <loc>https://apnews.com/article/hawaii-seton-hall-pirates-mens-college-basketball-abc123</loc>
    </url>
  </urlset>`;
    clearApMonthArticlesCache();

    const articles = await apNewsBackfillAdapter.fetchArticles({
      date: "2024-05-01",
      fetchText: async (url) => {
        if (url === "https://apnews.com/sitemap.xml") {
          return apSitemapIndex;
        }

        if (url === "https://apnews.com/ap-sitemap-202405.xml") {
          return syndicationSitemap;
        }

        return `<meta property="article:published_time" content="2024-05-01T09:00:00-04:00">`;
      },
    });

    expect(isApSyndicationArticle(
      "https://apnews.com/article/hawaii-seton-hall-pirates-mens-college-basketball-abc123",
    )).toBe(true);
    expect(articles.map((article) => article.link)).toEqual([
      "https://apnews.com/article/editorial-story-with-enough-words-abc123",
    ]);
  });

  it("reuses cached month fetches across daily AP requests", async () => {
    clearApMonthArticlesCache();
    const fetchedUrls: string[] = [];

    const fetchText = async (url: string) => {
      fetchedUrls.push(url);
      if (url === "https://apnews.com/sitemap.xml") {
        return apSitemapIndex;
      }

      if (url === "https://apnews.com/ap-sitemap-202405.xml") {
        return apSitemap;
      }

      if (
        url ===
        "https://apnews.com/article/an-older-ap-story-with-enough-words-abc123"
      ) {
        return `<meta property="article:published_time" content="2024-05-01T09:00:00-04:00">`;
      }

      return `<meta property="article:published_time" content="2024-05-02T09:00:00-04:00">`;
    };

    await apNewsBackfillAdapter.fetchArticles({ date: "2024-05-01", fetchText });
    await apNewsBackfillAdapter.fetchArticles({ date: "2024-05-02", fetchText });

    expect(fetchedUrls).toEqual([
      "https://apnews.com/sitemap.xml",
      "https://apnews.com/ap-sitemap-202405.xml",
      "https://apnews.com/article/an-older-ap-story-with-enough-words-abc123",
      "https://apnews.com/article/a-different-day-story-with-enough-words-def456",
    ]);
  });
});
