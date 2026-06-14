import db from "@/db";
import { sparseDaysInMonth } from "./validateDay";
import {
  backfillProviderNames,
  emptySourceCounts,
  type SourceCounts,
} from "@/providers";

export type MonthCounts = SourceCounts;

export interface MonthValidation {
  ok: boolean;
  issues: string[];
  counts: MonthCounts;
}

export const monthArticleCounts = (month: string): MonthCounts => {
  const counts = emptySourceCounts();
  const sources = backfillProviderNames();
  const placeholders = sources.map(() => "?").join(", ");

  const rows = db
    .prepare(
      `SELECT source, COUNT(*) AS count
       FROM articles
       WHERE source IN (${placeholders})
         AND strftime('%Y-%m', published_at) = ?
       GROUP BY source`,
    )
    .all(...sources, month) as { source: string; count: number }[];

  for (const row of rows) {
    if (row.source in counts) {
      counts[row.source] = row.count;
    }
  }

  return counts;
};

const qualityIssue = (
  month: string,
  sql: string,
  message: (count: number) => string,
): string | null => {
  const sources = backfillProviderNames();
  const placeholders = sources.map(() => "?").join(", ");
  const result = db
    .prepare(sql.replace("{{sources}}", placeholders))
    .get(...sources, month) as { count?: number; groups?: number };

  const count = result.count ?? result.groups ?? 0;
  return count > 0 ? message(count) : null;
};

export const validateMonth = (
  month: string,
  options: {
    requireCoverage?: Record<string, boolean>;
    minArticles?: number;
  } = {},
): MonthValidation => {
  const issues: string[] = [];
  const counts = monthArticleCounts(month);

  const duplicateLinks = qualityIssue(
    month,
    `SELECT COUNT(*) AS groups
     FROM (
       SELECT link
       FROM articles
       WHERE source IN ({{sources}})
         AND strftime('%Y-%m', published_at) = ?
       GROUP BY link
       HAVING COUNT(*) > 1
     )`,
    (count) => `${count} duplicate link groups`,
  );
  if (duplicateLinks) {
    issues.push(duplicateLinks);
  }

  const nullPublishedAt = qualityIssue(
    month,
    `SELECT COUNT(*) AS count
     FROM articles
     WHERE source IN ({{sources}})
       AND strftime('%Y-%m', published_at) = ?
       AND published_at IS NULL`,
    (count) => `${count} articles with null published_at`,
  );
  if (nullPublishedAt) {
    issues.push(nullPublishedAt);
  }

  const sparseDays = sparseDaysInMonth(month, options);
  const sparseBySource = sparseDays.reduce<Record<string, typeof sparseDays>>(
    (groups, day) => {
      groups[day.source] ??= [];
      groups[day.source].push(day);
      return groups;
    },
    {},
  );

  for (const [source, sparseDays] of Object.entries(sparseBySource)) {
    const examples = sparseDays
      .slice(0, 3)
      .map((day) => `${day.date}(${day.count})`)
      .join(", ");
    issues.push(
      `${source} sparse on ${sparseDays.length} days (e.g. ${examples})`,
    );
  }

  return {
    ok: issues.length === 0,
    issues,
    counts,
  };
};
