import db from "@/db";
import { backfillDates } from "./backfill";
import { monthBounds } from "./month";
import type { MonthCounts } from "./validateMonth";

export interface DayValidation {
  ok: boolean;
  issues: string[];
  counts: MonthCounts;
  sparseSources: string[];
}

export const DEFAULT_MIN_DAILY_ARTICLES = 6;

export const minDailyArticles = (): number => {
  const configured = Number(process.env.BACKFILL_MIN_DAILY_ARTICLES);
  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_MIN_DAILY_ARTICLES;
};

export const dayArticleCounts = (date: string): MonthCounts => {
  const rows = db
    .prepare(
      `SELECT source, COUNT(*) AS count
       FROM articles
       WHERE source IN ('NPR', 'AP News')
         AND date(published_at) = ?
       GROUP BY source`,
    )
    .all(date) as { source: string; count: number }[];

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

export const validateDay = (
  date: string,
  options: { requireAp?: boolean; minArticles?: number } = {},
): DayValidation => {
  const counts = dayArticleCounts(date);
  const minArticles = options.minArticles ?? minDailyArticles();
  const issues: string[] = [];
  const sparseSources: string[] = [];

  if (minArticles > 0 && counts.npr < minArticles) {
    issues.push(`NPR has ${counts.npr} articles (minimum ${minArticles})`);
    sparseSources.push("NPR");
  }

  if (options.requireAp && minArticles > 0 && counts.ap < minArticles) {
    issues.push(`AP News has ${counts.ap} articles (minimum ${minArticles})`);
    sparseSources.push("AP News");
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
  options: { requireAp?: boolean; minArticles?: number } = {},
): SparseDay[] => {
  const { startDate, endDate } = monthBounds(month);
  const sparseDays: SparseDay[] = [];

  for (const date of backfillDates(startDate, endDate)) {
    const validation = validateDay(date, options);
    for (const source of validation.sparseSources) {
      sparseDays.push({
        date,
        source,
        count: source === "NPR" ? validation.counts.npr : validation.counts.ap,
      });
    }
  }

  return sparseDays;
};
