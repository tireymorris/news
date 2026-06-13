import { describe, expect, it } from "bun:test";
import {
  backfillDates,
  datesBackward,
  fetchBackfillArticles,
  selectBackfillAdapters,
  storeBackfillDay,
  storeBackfillRange,
} from "../src/backfill/backfill";

const olderArticle = {
  id: "older-article",
  title: "An Older Story With Enough Words",
  link: "https://example.com/older",
  source: "Example",
  created_at: "2024-05-01T00:00:00.000Z",
};

describe("backfill service", () => {
  it("lists dates backward through a range", () => {
    expect(datesBackward("2024-05-03", "2024-05-01")).toEqual([
      "2024-05-03",
      "2024-05-02",
      "2024-05-01",
    ]);
  });

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

  it("sleeps between dates when a delay is configured", async () => {
    const slept: number[] = [];
    const fetchedDates: string[] = [];

    await storeBackfillRange(
      "2024-05-01",
      "2024-05-03",
      [
        {
          name: "Example",
          fetchArticles: async ({ date }) => {
            fetchedDates.push(date);
            return [];
          },
        },
      ],
      {
        sleepMs: 25,
        sleep: async (milliseconds) => {
          slept.push(milliseconds);
        },
      },
    );

    expect(fetchedDates).toEqual(["2024-05-01", "2024-05-02", "2024-05-03"]);
    expect(slept).toEqual([25, 25]);
  });

  it("reports backfill progress after each date", async () => {
    const progress: {
      date: string;
      processedDates: number;
      inserted: number;
      discovered: number;
      totalDates: number;
      monthInserted: number;
      skipped: boolean;
      error?: string;
    }[] = [];

    await storeBackfillRange(
      "2024-05-01",
      "2024-05-02",
      [
        {
          name: "Example",
          fetchArticles: async () => [],
        },
      ],
      {
        onProgress: (event) => progress.push(event),
      },
    );

    expect(progress).toEqual([
      {
        date: "2024-05-01",
        processedDates: 1,
        inserted: 0,
        discovered: 0,
        totalDates: 2,
        monthInserted: 0,
        skipped: false,
      },
      {
        date: "2024-05-02",
        processedDates: 2,
        inserted: 0,
        discovered: 0,
        totalDates: 2,
        monthInserted: 0,
        skipped: false,
      },
    ]);
  });

  it("continues a range when an adapter fails for one date", async () => {
    const progress: {
      date: string;
      processedDates: number;
      inserted: number;
      discovered: number;
      totalDates: number;
      monthInserted: number;
      skipped: boolean;
      error?: string;
    }[] = [];

    await storeBackfillRange(
      "2024-05-01",
      "2024-05-02",
      [
        {
          name: "Example",
          fetchArticles: async ({ date }) => {
            if (date === "2024-05-01") {
              throw new Error("timeout");
            }
            return [];
          },
        },
      ],
      {
        onProgress: (event) => progress.push(event),
      },
    );

    expect(progress).toEqual([
      {
        date: "2024-05-01",
        processedDates: 1,
        inserted: 0,
        discovered: 0,
        totalDates: 2,
        monthInserted: 0,
        skipped: true,
        error: "Example: timeout",
      },
      {
        date: "2024-05-02",
        processedDates: 2,
        inserted: 0,
        discovered: 0,
        totalDates: 2,
        monthInserted: 0,
        skipped: false,
      },
    ]);
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

  it("ingests each requested source for a single day", async () => {
    const fetchedSources: string[] = [];

    const result = await storeBackfillDay("2024-05-01", ["NPR", "AP News"], {
      adapters: [
        {
          name: "NPR",
          fetchArticles: async () => {
            fetchedSources.push("NPR");
            return [];
          },
        },
        {
          name: "AP News",
          fetchArticles: async () => {
            fetchedSources.push("AP News");
            return [];
          },
        },
      ],
    });

    expect(result).toEqual({ nprInserted: 0, apInserted: 0 });
    expect(fetchedSources).toEqual(["NPR", "AP News"]);
  });
});
