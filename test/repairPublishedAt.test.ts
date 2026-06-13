import { describe, expect, it } from "bun:test";
import { repairPublishedAtForArticles } from "../src/backfill/repairPublishedAt";
import type { Article } from "../src/models/article";

const article: Article = {
  id: "repair-1",
  title: "Repair Published At Article Title",
  link: "https://example.com/article",
  source: "Example",
  created_at: "2026-06-13T00:00:00.000Z",
  published_at: "2026-06-13T00:00:00.000Z",
};

describe("repairPublishedAtForArticles", () => {
  it("updates articles from their detail page published date", async () => {
    const updates: { id: string; publishedAt: string }[] = [];

    const repaired = await repairPublishedAtForArticles([article], {
      fetchText: async () =>
        `<script type="application/ld+json">{"datePublished":"2010-01-01T14:08:00-05:00"}</script>`,
      updatePublishedAt: async (id, publishedAt) => {
        updates.push({ id, publishedAt });
      },
    });

    expect(repaired).toBe(1);
    expect(updates).toEqual([
      { id: "repair-1", publishedAt: "2010-01-01T19:08:00.000Z" },
    ]);
  });

  it("skips articles whose detail pages fail", async () => {
    const updates: string[] = [];

    const repaired = await repairPublishedAtForArticles([article], {
      fetchText: async () => {
        throw new Error("timeout");
      },
      updatePublishedAt: async (id) => {
        updates.push(id);
      },
    });

    expect(repaired).toBe(0);
    expect(updates).toEqual([]);
  });

  it("sleeps between detail page requests", async () => {
    const sleeps: number[] = [];

    await repairPublishedAtForArticles(
      [article, { ...article, id: "repair-2" }],
      {
        fetchText: async () =>
          `<meta property="article:published_time" content="2024-05-01T09:00:00-04:00">`,
        updatePublishedAt: async () => {},
        sleepMs: 50,
        sleep: async (milliseconds) => {
          sleeps.push(milliseconds);
        },
      },
    );

    expect(sleeps).toEqual([50]);
  });
});
