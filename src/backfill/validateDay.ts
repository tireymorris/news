import "./providers";

import db from "@/db";
import { backfillDates } from "./backfill";
import { monthBounds } from "./month";
import {
  backfillProviderNames,
  emptySourceCounts,
  type SourceCounts,
} from "@/providers";

export interface DayValidation {
  ok: boolean;
  issues: string[];
  counts: SourceCounts;
  sparseSources: string[];
}

export const DEFAULT_MIN_DAILY_ARTICLES = 1;

export const minDailyArticles = (): number => {
  const configured = Number(process.env.BACKFILL_MIN_DAILY_ARTICLES);
  return Number.isFinite(configured) && configured >= 0
    ? configured
    : DEFAULT_MIN_DAILY_ARTICLES;
};

export const dayArticleCounts = (date: string): SourceCounts => {
  const counts = emptySourceCounts();
  const sources = backfillProviderNames();
  const placeholders = sources.map(() => "?").join(", ");

  const rows = db
    .prepare(
      `SELECT source, COUNT(*) AS count
       FROM articles
       WHERE source IN (${placeholders})
         AND date(published_at) = ?
       GROUP BY source`,
    )
    .all(...sources, date) as { source: string; count: number }[];

  for (const row of rows) {
    if (row.source in counts) {
      counts[row.source] = row.count;
    }
  }

  return counts;
};

export const validateDay = (
  date: string,
  options: {
    requireCoverage?: Record<string, boolean>;
    minArticles?: number;
  } = {},
): DayValidation => {
  const counts = dayArticleCounts(date);
  const minArticles = options.minArticles ?? minDailyArticles();
  const issues: string[] = [];
  const sparseSources: string[] = [];

  for (const [source, count] of Object.entries(counts)) {
    if (
      options.requireCoverage?.[source] &&
      minArticles > 0 &&
      count < minArticles
    ) {
      issues.push(`${source} has ${count} articles (need ${minArticles})`);
      sparseSources.push(source);
    }
  }

  return {
    ok: issues.length === 0,
    issues,
    counts,
    sparseSources,
  };
};

export interface SparseDay {
  date: string;
  source: string;
  count: number;
}

export const sparseDaysInMonth = (
  month: string,
  options: {
    requireCoverage?: Record<string, boolean>;
    minArticles?: number;
  } = {},
): SparseDay[] => {
  const { startDate, endDate } = monthBounds(month);
  const sparseDays: SparseDay[] = [];

  for (const date of backfillDates(startDate, endDate)) {
    const validation = validateDay(date, options);
    for (const source of validation.sparseSources) {
      sparseDays.push({
        date,
        source,
        count: validation.counts[source] ?? 0,
      });
    }
  }

  return sparseDays;
};
