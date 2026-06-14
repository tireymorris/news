import { afterEach, describe, expect, it } from "bun:test";
import db from "@/db";
import {
  monthArticleCounts,
  validateMonth,
} from "../src/backfill/validateMonth";
import "../src/backfill/providers";

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

    expect(monthArticleCounts("2024-05")).toEqual({ NPR: 1, "AP News": 1 });
  });

  it("passes when sparse-day checks are disabled", () => {
    db.run(
      `INSERT INTO articles (id, title, link, source, created_at, published_at)
       VALUES ('1', 'One Two Three Four Five', 'https://example.com/1', 'NPR', '2024-05-01', '2024-05-01'),
              ('2', 'Six Seven Eight Nine Ten', 'https://example.com/2', 'AP News', '2024-05-02', '2024-05-02')`,
    );

    expect(
      validateMonth("2024-05", {
        requireCoverage: { NPR: true, "AP News": true },
        minArticles: 0,
      }),
    ).toEqual({
      ok: true,
      issues: [],
      counts: { NPR: 1, "AP News": 1 },
    });
  });

  it("fails when days in the month are sparse for NPR", () => {
    db.run(
      `INSERT INTO articles (id, title, link, source, created_at, published_at)
       VALUES ('1', 'One Two Three Four Five', 'https://example.com/1', 'NPR', '2024-05-01', '2024-05-01')`,
    );

    const result = validateMonth("2024-05", {
      requireCoverage: { NPR: true },
      minArticles: 6,
    });
    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.includes("NPR sparse on"))).toBe(
      true,
    );
  });
});
