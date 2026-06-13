import { afterEach, describe, expect, it } from "bun:test";
import db from "@/db";
import {
  monthArticleCounts,
  validateMonth,
} from "../src/backfill/validateMonth";

const clearArticles = () => {
  db.run("DELETE FROM articles");
};

afterEach(() => {
  clearArticles();
});

describe("validateMonth", () => {
  it("counts articles by source for a month", () => {
    db.run(
      `INSERT INTO articles (id, title, link, source, created_at, published_at)
       VALUES ('1', 'One Two Three Four Five', 'https://example.com/1', 'NPR', '2024-05-01', '2024-05-01'),
              ('2', 'Six Seven Eight Nine Ten', 'https://example.com/2', 'AP News', '2024-05-02', '2024-05-02')`,
    );

    expect(monthArticleCounts("2024-05")).toEqual({ npr: 1, ap: 1 });
  });

  it("passes when both sources have coverage", () => {
    db.run(
      `INSERT INTO articles (id, title, link, source, created_at, published_at)
       VALUES ('1', 'One Two Three Four Five', 'https://example.com/1', 'NPR', '2024-05-01', '2024-05-01'),
              ('2', 'Six Seven Eight Nine Ten', 'https://example.com/2', 'AP News', '2024-05-02', '2024-05-02')`,
    );

    expect(validateMonth("2024-05", { requireAp: true, minArticles: 1 })).toEqual({
      ok: true,
      issues: [],
      counts: { npr: 1, ap: 1 },
    });
  });

  it("fails when NPR is below the monthly minimum", () => {
    db.run(
      `INSERT INTO articles (id, title, link, source, created_at, published_at)
       VALUES ('2', 'Six Seven Eight Nine Ten', 'https://example.com/2', 'AP News', '2024-05-02', '2024-05-02')`,
    );

    const result = validateMonth("2024-05", { requireAp: true, minArticles: 30 });
    expect(result.ok).toBe(false);
    expect(result.issues).toContain("NPR has 0 articles (minimum 30)");
  });

  it("fails when a source has partial coverage below the monthly minimum", () => {
    const values = Array.from({ length: 12 }, (_, index) => {
      const day = String(index + 1).padStart(2, "0");
      return `('npr-${index}', 'NPR Story Number ${index} Title Here', 'https://example.com/npr-${index}', 'NPR', '2024-05-${day}', '2024-05-${day}')`;
    }).join(",\n              ");

    db.run(
      `INSERT INTO articles (id, title, link, source, created_at, published_at)
       VALUES ${values}`,
    );

    const result = validateMonth("2024-05", { minArticles: 30 });
    expect(result.ok).toBe(false);
    expect(result.issues).toContain("NPR has 12 articles (minimum 30)");
  });
});
