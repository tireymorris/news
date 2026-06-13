import { afterEach, describe, expect, it } from "bun:test";
import db from "@/db";
import {
  dayArticleCounts,
  minDailyArticles,
  sparseDaysInMonth,
  validateDay,
} from "../src/backfill/validateDay";

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

    expect(dayArticleCounts("2024-05-01")).toEqual({ npr: 1, ap: 1 });
  });

  it("treats 0-5 articles as sparse", () => {
    const values = Array.from({ length: 5 }, (_, index) => {
      return `('npr-${index}', 'NPR Story Number ${index} Title Here', 'https://example.com/npr-${index}', 'NPR', '2024-05-01', '2024-05-01')`;
    }).join(", ");

    db.run(
      `INSERT INTO articles (id, title, link, source, created_at, published_at)
       VALUES ${values}`,
    );

    const result = validateDay("2024-05-01", { requireAp: false });
    expect(result.ok).toBe(false);
    expect(result.sparseSources).toEqual(["NPR"]);
    expect(result.issues[0]).toContain("NPR has 5 articles (minimum 6)");
  });

  it("passes when each required source has more than five articles", () => {
    const values = Array.from({ length: 6 }, (_, index) => {
      return `('npr-${index}', 'NPR Story Number ${index} Title Here', 'https://example.com/npr-${index}', 'NPR', '2024-05-01', '2024-05-01')`;
    }).join(", ");

    db.run(
      `INSERT INTO articles (id, title, link, source, created_at, published_at)
       VALUES ${values}`,
    );

    expect(validateDay("2024-05-01", { requireAp: false })).toEqual({
      ok: true,
      issues: [],
      counts: { npr: 6, ap: 0 },
      sparseSources: [],
    });
  });

  it("defaults the daily minimum to six articles", () => {
    expect(minDailyArticles()).toBe(6);
  });

  it("finds sparse days across a month", () => {
    db.run(
      `INSERT INTO articles (id, title, link, source, created_at, published_at)
       VALUES ('1', 'One Two Three Four Five', 'https://example.com/1', 'NPR', '2024-05-01', '2024-05-01')`,
    );

    const sparseDays = sparseDaysInMonth("2024-05", {
      requireAp: false,
      minArticles: 6,
    });

    expect(sparseDays.some((day) => day.date === "2024-05-01")).toBe(true);
    expect(sparseDays.length).toBeGreaterThan(28);
  });
});
