import "./providers";

import { insertArticle, Article } from "models/article";
import {
  backfillProviders,
  emptyDayBackfillResult,
  selectBackfillProviders,
  type BackfillProvider,
  type DayBackfillResult,
} from "./providers";
import { defaultSleep } from "./fetch";
import { monthBounds } from "./month";

const ISO_DATE_LENGTH = 10;

const isoDate = (date: Date) => date.toISOString().slice(0, ISO_DATE_LENGTH);

export const backfillDates = (
  startDate: string,
  endDate = startDate,
): string[] => {
  const dates: string[] = [];
  const current = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);

  while (current <= end) {
    dates.push(isoDate(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
};

export const datesBackward = (
  endDate: string,
  floorDate: string,
): string[] => {
  const dates: string[] = [];
  const current = new Date(`${endDate}T00:00:00.000Z`);
  const floor = new Date(`${floorDate}T00:00:00.000Z`);

  while (current >= floor) {
    dates.push(isoDate(current));
    current.setUTCDate(current.getUTCDate() - 1);
  }

  return dates;
};

export const selectBackfillAdapters = selectBackfillProviders;

export interface BackfillRangeProgress {
  date: string;
  processedDates: number;
  inserted: number;
  discovered: number;
  totalDates: number;
  monthInserted: number;
  skipped: boolean;
  error?: string;
}

export interface BackfillRangeOptions {
  sleepMs?: number;
  sleep?: (milliseconds: number) => Promise<void>;
  onProgress?: (progress: BackfillRangeProgress) => void;
  onProviderProgress?: (
    provider: BackfillProvider,
    progress: import("./providers").BackfillProgress,
  ) => void;
  onPhase?: (
    phase: `${string}-start` | `${string}-done` | `${string}-skip`,
    detail?: Record<string, unknown>,
  ) => void;
}

export type BackfillProgress = BackfillRangeProgress;

export const fetchBackfillArticles = async (
  date: string,
  providers: BackfillProvider[] = backfillProviders(),
  options: BackfillRangeOptions = {},
): Promise<Article[]> => {
  const articles: Article[] = [];
  const errors: string[] = [];

  for (const provider of providers) {
    try {
      articles.push(
        ...(await provider.fetchArticles({
          date,
          sleepMs: options.sleepMs,
          sleep: options.sleep,
          onProgress: (progress) =>
            options.onProviderProgress?.(provider, progress),
        })),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${provider.name}: ${message}`);
    }
  }

  if (errors.length > 0 && articles.length === 0) {
    throw new Error(errors.join("; "));
  }

  return articles;
};

export const storeBackfillArticles = async (
  date: string,
  providers: BackfillProvider[] = backfillProviders(),
  options: BackfillRangeOptions = {},
): Promise<Article[]> => {
  const articles = await fetchBackfillArticles(date, providers, options);
  return articles.filter(insertArticle);
};

export const storeBackfillRange = async (
  startDate: string,
  endDate = startDate,
  providers: BackfillProvider[] = backfillProviders(),
  options: BackfillRangeOptions = {},
): Promise<Article[]> => {
  const insertedArticles: Article[] = [];
  const dates = backfillDates(startDate, endDate);
  const sleep = options.sleep || defaultSleep;
  const sleepMs = options.sleepMs || 0;

  for (const [index, date] of dates.entries()) {
    let discovered = 0;
    let insertedForDate: Article[] = [];
    let skipped = false;
    let error: string | undefined;

    try {
      const articles = await fetchBackfillArticles(date, providers, options);
      discovered = articles.length;
      insertedForDate = articles.filter(insertArticle);
    } catch (caught) {
      skipped = true;
      error = caught instanceof Error ? caught.message : String(caught);
    }

    insertedArticles.push(...insertedForDate);
    options.onProgress?.({
      date,
      processedDates: index + 1,
      inserted: insertedForDate.length,
      discovered,
      totalDates: dates.length,
      monthInserted: insertedArticles.length,
      skipped,
      error,
    });

    if (sleepMs > 0 && index < dates.length - 1) {
      await sleep(sleepMs);
    }
  }

  return insertedArticles;
};

export interface MonthBackfillResult {
  month: string;
  insertedByProvider: Record<string, number>;
}

export const storeBackfillMonth = async (
  month: string,
  options: BackfillRangeOptions = {},
): Promise<MonthBackfillResult> => {
  const { startDate, endDate } = monthBounds(month);
  const insertedByProvider: Record<string, number> = {};

  for (const provider of backfillProviders()) {
    const shouldAttempt = await (provider.shouldAttempt ?? (async () => true))(
      month,
    );

    if (!shouldAttempt) {
      options.onPhase?.(`${provider.name}-skip`, {
        month,
        reason: "no coverage for month",
      });
      insertedByProvider[provider.name] = 0;
      continue;
    }

    options.onPhase?.(`${provider.name}-start`, { month, startDate, endDate });

    let inserted = 0;
    if (provider.fetchMonth) {
      const articles = await provider.fetchMonth(month, {
        sleepMs: options.sleepMs,
        sleep: options.sleep,
        onProgress: (progress) =>
          options.onProviderProgress?.(provider, progress),
      });
      inserted = articles.filter(insertArticle).length;
    } else {
      inserted = (
        await storeBackfillRange(startDate, endDate, [provider], options)
      ).length;
    }

    insertedByProvider[provider.name] = inserted;
    options.onPhase?.(`${provider.name}-done`, { inserted });
  }

  return { month, insertedByProvider };
};

export const storeBackfillDay = async (
  date: string,
  sources: string[],
  options: BackfillRangeOptions & { providers?: BackfillProvider[] } = {},
): Promise<DayBackfillResult> => {
  const catalog = options.providers ?? backfillProviders();
  const result = emptyDayBackfillResult();

  for (const source of sources) {
    const providers = selectBackfillProviders(source, catalog);
    if (providers.length === 0) {
      continue;
    }

    const inserted = (
      await storeBackfillArticles(date, providers, options)
    ).length;

    result[source] = { inserted, attempted: true };
  }

  return result;
};
