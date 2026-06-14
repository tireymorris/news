import { beforeEach, describe, expect, it } from "bun:test";
import db from "../src/db";
import {
  getRepairableArticles,
  repairPublishedAtForArticles,
} from "../src/backfill/repair/publishedAt";
import { insertArticle } from "../src/models/article";
import type { Article } from "../src/models/article";

const article: Article = {
  id: "repair-1",
  title: "Repair Published At Article Title",
  link: "https://example.com/article",
  source: "Example",
  created_at: "2026-06-13T00:00:00.000Z",
  published_at: "2026-06-13T00:00:00.000Z",
};

beforeEach(() => {
  db.prepare("DELETE FROM articles").run();
});

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

  it("reports repair progress after each article", async () => {
    const progress: { processed: number; repaired: number; total: number }[] =
      [];

    await repairPublishedAtForArticles(
      [article, { ...article, id: "repair-2" }],
      {
        fetchText: async () =>
          `<script type="application/ld+json">{"datePublished":"2010-01-01T14:08:00-05:00"}</script>`,
        updatePublishedAt: async () => {},
        onProgress: ({ processed, repaired, total }) => {
          progress.push({ processed, repaired, total });
        },
      },
    );

    expect(progress).toEqual([
      { processed: 1, repaired: 1, total: 2 },
      { processed: 2, repaired: 2, total: 2 },
    ]);
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

describe("getRepairableArticles", () => {
  it("only returns rows whose published_at still mirrors created_at", () => {
    insertArticle(article);
    insertArticle({
      ...article,
      id: "already-repaired",
      title: "Already Repaired Article Title",
      link: "https://example.com/repaired",
      published_at: "2010-01-01T19:08:00.000Z",
    });

    expect(getRepairableArticles().map((row) => row.id)).toEqual(["repair-1"]);
  });
});
