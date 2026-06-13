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

    expect(validateMonth("2024-05", { requireAp: true })).toEqual({
      ok: true,
      issues: [],
      counts: { npr: 1, ap: 1 },
    });
  });

  it("fails when NPR is missing for the month", () => {
    db.run(
      `INSERT INTO articles (id, title, link, source, created_at, published_at)
       VALUES ('2', 'Six Seven Eight Nine Ten', 'https://example.com/2', 'AP News', '2024-05-02', '2024-05-02')`,
    );

    const result = validateMonth("2024-05", { requireAp: true });
    expect(result.ok).toBe(false);
    expect(result.issues).toContain("NPR has zero articles");
  });
});
