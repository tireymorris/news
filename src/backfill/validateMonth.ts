import db from "@/db";
import { sparseDaysInMonth } from "./validateDay";

export interface MonthCounts {
  npr: number;
  ap: number;
}

export interface MonthValidation {
  ok: boolean;
  issues: string[];
  counts: MonthCounts;
}

export const monthArticleCounts = (month: string): MonthCounts => {
  const rows = db
    .prepare(
      `SELECT source, COUNT(*) AS count
       FROM articles
       WHERE source IN ('NPR', 'AP News')
         AND strftime('%Y-%m', published_at) = ?
       GROUP BY source`,
    )
    .all(month) as { source: string; count: number }[];

  const counts: MonthCounts = { npr: 0, ap: 0 };
  for (const row of rows) {
    if (row.source === "NPR") {
      counts.npr = row.count;
    }
    if (row.source === "AP News") {
      counts.ap = row.count;
    }
  }

  return counts;
};

export const validateMonth = (
  month: string,
  options: { requireAp?: boolean; minArticles?: number } = {},
): MonthValidation => {
  const issues: string[] = [];
  const counts = monthArticleCounts(month);

  const duplicateLinks = db
    .prepare(
      `SELECT COUNT(*) AS groups
       FROM (
         SELECT link
         FROM articles
         WHERE source IN ('NPR', 'AP News')
           AND strftime('%Y-%m', published_at) = ?
         GROUP BY link
         HAVING COUNT(*) > 1
       )`,
    )
    .get(month) as { groups: number };

  if (duplicateLinks.groups > 0) {
    issues.push(`${duplicateLinks.groups} duplicate link groups`);
  }

  const nullPublishedAt = db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM articles
       WHERE source IN ('NPR', 'AP News')
         AND strftime('%Y-%m', published_at) = ?
         AND published_at IS NULL`,
    )
    .get(month) as { count: number };

  if (nullPublishedAt.count > 0) {
    issues.push(`${nullPublishedAt.count} articles with null published_at`);
  }

  const sparseDays = sparseDaysInMonth(month, options);
  const sparseNprDays = sparseDays.filter((day) => day.source === "NPR");
  const sparseApDays = sparseDays.filter((day) => day.source === "AP News");

  if (sparseNprDays.length > 0) {
    const examples = sparseNprDays
      .slice(0, 3)
      .map((day) => `${day.date}(${day.count})`)
      .join(", ");
    issues.push(
      `NPR sparse on ${sparseNprDays.length} days (e.g. ${examples})`,
    );
  }

  if (sparseApDays.length > 0) {
    const examples = sparseApDays
      .slice(0, 3)
      .map((day) => `${day.date}(${day.count})`)
      .join(", ");
    issues.push(
      `AP News sparse on ${sparseApDays.length} days (e.g. ${examples})`,
    );
  }

  return {
    ok: issues.length === 0,
    issues,
    counts,
  };
};
