import { insertArticle, Article } from "models/article";
import {
  backfillAdapters,
  BackfillAdapter,
  fetchApArticlesForMonth,
  hasApSitemapForMonth,
  nprBackfillAdapter,
  type ApBackfillProgress,
} from "./adapters";
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

export const selectBackfillAdapters = (
  adapters: BackfillAdapter[],
  source?: string,
): BackfillAdapter[] => {
  if (!source) {
    return adapters;
  }

  const normalizedSource = source.toLowerCase();
  return adapters.filter(
    (adapter) => adapter.name.toLowerCase() === normalizedSource,
  );
};

export const fetchBackfillArticles = async (
  date: string,
  adapters: BackfillAdapter[] = backfillAdapters,
  options: BackfillRangeOptions = {},
): Promise<Article[]> => {
  const articles: Article[] = [];
  const errors: string[] = [];

  for (const adapter of adapters) {
    try {
      articles.push(
        ...(await adapter.fetchArticles({
          date,
          sleepMs: options.sleepMs,
          sleep: options.sleep,
          onApProgress: options.onApProgress,
        })),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${adapter.name}: ${message}`);
    }
  }

  if (errors.length > 0 && articles.length === 0) {
    throw new Error(errors.join("; "));
  }

  return articles;
};

export const storeBackfillArticles = async (
  date: string,
  adapters: BackfillAdapter[] = backfillAdapters,
  options: BackfillRangeOptions = {},
): Promise<Article[]> => {
  const articles = await fetchBackfillArticles(date, adapters, options);
  return articles.filter(insertArticle);
};

export interface BackfillProgress {
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
  onProgress?: (progress: BackfillProgress) => void;
  onApProgress?: (progress: ApBackfillProgress) => void;
  onPhase?: (
    phase: "npr-start" | "npr-done" | "ap-start" | "ap-done" | "ap-skip",
    detail?: Record<string, unknown>,
  ) => void;
}

export const storeBackfillRange = async (
  startDate: string,
  endDate = startDate,
  adapters: BackfillAdapter[] = backfillAdapters,
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
      const articles = await fetchBackfillArticles(date, adapters, options);
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
  nprInserted: number;
  apInserted: number;
  requireAp: boolean;
}

export const storeBackfillMonth = async (
  month: string,
  options: BackfillRangeOptions = {},
): Promise<MonthBackfillResult> => {
  const { startDate, endDate } = monthBounds(month);
  const nprDates = backfillDates(startDate, endDate);
  options.onPhase?.("npr-start", {
    startDate,
    endDate,
    days: nprDates.length,
    sleepMs: options.sleepMs ?? 0,
  });

  const nprInserted = (
    await storeBackfillRange(startDate, endDate, [nprBackfillAdapter], options)
  ).length;
  options.onPhase?.("npr-done", { inserted: nprInserted });

  const requireAp = await hasApSitemapForMonth(month);
  let apInserted = 0;

  if (requireAp) {
    options.onPhase?.("ap-start", { month });
    const apArticles = await fetchApArticlesForMonth({
      month,
      sleepMs: options.sleepMs,
      sleep: options.sleep,
      onProgress: options.onApProgress,
    });
    apInserted = apArticles.filter(insertArticle).length;
    options.onPhase?.("ap-done", { inserted: apInserted });
  } else {
    options.onPhase?.("ap-skip", { month, reason: "no sitemap for month" });
  }

  return { month, nprInserted, apInserted, requireAp };
};

export const storeBackfillDay = async (
  date: string,
  sources: string[],
  options: BackfillRangeOptions & { adapters?: BackfillAdapter[] } = {},
): Promise<{
  nprInserted: number;
  apInserted: number;
  nprAttempted: boolean;
  apAttempted: boolean;
}> => {
  const catalog = options.adapters ?? backfillAdapters;
  let nprInserted = 0;
  let apInserted = 0;
  let nprAttempted = false;
  let apAttempted = false;

  for (const source of sources) {
    const adapters = selectBackfillAdapters(catalog, source);
    if (adapters.length === 0) {
      continue;
    }

    const inserted = (
      await storeBackfillArticles(date, adapters, options)
    ).length;

    if (source === "NPR") {
      nprAttempted = true;
      nprInserted = inserted;
    }

    if (source === "AP News") {
      apAttempted = true;
      apInserted = inserted;
    }
  }

  return { nprInserted, apInserted, nprAttempted, apAttempted };
};
