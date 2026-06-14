import { afterEach, describe, expect, it } from "bun:test";
import db from "@/db";
import {
  dayArticleCounts,
  minDailyArticles,
  sparseDaysInMonth,
  validateDay,
} from "../src/backfill/validateDay";
import "../src/backfill/providers";

const clearArticles = () => {
  db.run("DELETE FROM articles");
};

afterEach(() => {
  clearArticles();
});

describe("validateDay", () => {
  it("counts articles by source for a day", () => {
    db.run(
      `INSERT INTO articles (id, title, link, source, created_at, published_at)
       VALUES ('1', 'One Two Three Four Five', 'https://example.com/1', 'NPR', '2024-05-01', '2024-05-01'),
              ('2', 'Six Seven Eight Nine Ten', 'https://example.com/2', 'AP News', '2024-05-01', '2024-05-01')`,
    );

    expect(dayArticleCounts("2024-05-01")).toEqual({ NPR: 1, "AP News": 1 });
  });

  it("treats zero articles as unfetched", () => {
    const result = validateDay("2024-05-01", {
      requireCoverage: { NPR: true },
    });
    expect(result.ok).toBe(false);
    expect(result.sparseSources).toEqual(["NPR"]);
    expect(result.issues[0]).toContain("NPR has 0 articles (need 1)");
  });

  it("passes quiet days with fewer than six articles", () => {
    const values = Array.from({ length: 3 }, (_, index) => {
      return `('npr-${index}', 'NPR Story Number ${index} Title Here', 'https://example.com/npr-${index}', 'NPR', '2024-05-01', '2024-05-01')`;
    }).join(", ");

    db.run(
      `INSERT INTO articles (id, title, link, source, created_at, published_at)
       VALUES ${values}`,
    );

    expect(validateDay("2024-05-01", { requireCoverage: { NPR: true } })).toEqual({
      ok: true,
      issues: [],
      counts: { NPR: 3, "AP News": 0 },
      sparseSources: [],
    });
  });

  it("defaults the daily minimum to one article", () => {
    expect(minDailyArticles()).toBe(1);
  });

  it("finds unfetched days across a month", () => {
    db.run(
      `INSERT INTO articles (id, title, link, source, created_at, published_at)
       VALUES ('1', 'One Two Three Four Five', 'https://example.com/1', 'NPR', '2024-05-01', '2024-05-01')`,
    );

    const sparseDays = sparseDaysInMonth("2024-05", {
      requireCoverage: { NPR: true },
      minArticles: 1,
    });

    expect(sparseDays.some((day) => day.date === "2024-05-01")).toBe(false);
    expect(sparseDays.length).toBeGreaterThan(28);
  });
});
