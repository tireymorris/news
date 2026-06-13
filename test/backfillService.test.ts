import { describe, expect, it } from "bun:test";
import {
  backfillDates,
  fetchBackfillArticles,
  selectBackfillAdapters,
} from "../src/backfill/backfill";

const olderArticle = {
  id: "older-article",
  title: "An Older Story With Enough Words",
  link: "https://example.com/older",
  source: "Example",
  created_at: "2024-05-01T00:00:00.000Z",
};

describe("backfill service", () => {
  it("lists each date in a backfill range", () => {
    expect(backfillDates("2024-05-01", "2024-05-03")).toEqual([
      "2024-05-01",
      "2024-05-02",
      "2024-05-03",
    ]);
  });

  it("selects adapters by source name", () => {
    const adapters = [
      { name: "NPR", fetchArticles: async () => [] },
      { name: "AP News", fetchArticles: async () => [] },
    ];

    expect(
      selectBackfillAdapters(adapters, "npr").map((adapter) => adapter.name),
    ).toEqual(["NPR"]);
    expect(
      selectBackfillAdapters(adapters, "AP News").map(
        (adapter) => adapter.name,
      ),
    ).toEqual(["AP News"]);
  });

  it("collects articles from each adapter for the requested date", async () => {
    const articles = await fetchBackfillArticles("2024-05-01", [
      {
        name: "Example",
        fetchArticles: async ({ date }) => {
          expect(date).toBe("2024-05-01");
          return [olderArticle];
        },
      },
    ]);

    expect(articles).toEqual([olderArticle]);
  });
});
