import { insertArticle, Article } from "models/article";
import { backfillAdapters, BackfillAdapter } from "./adapters";

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
): Promise<Article[]> => {
  const articles: Article[] = [];

  for (const adapter of adapters) {
    articles.push(...(await adapter.fetchArticles({ date })));
  }

  return articles;
};

export const storeBackfillArticles = async (
  date: string,
  adapters: BackfillAdapter[] = backfillAdapters,
): Promise<Article[]> => {
  const articles = await fetchBackfillArticles(date, adapters);
  return articles.filter(insertArticle);
};

export interface BackfillProgress {
  date: string;
  processedDates: number;
  inserted: number;
  totalDates: number;
}

export interface BackfillRangeOptions {
  sleepMs?: number;
  sleep?: (milliseconds: number) => Promise<void>;
  onProgress?: (progress: BackfillProgress) => void;
}

const defaultSleep = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

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
    const insertedForDate = await storeBackfillArticles(date, adapters);
    insertedArticles.push(...insertedForDate);
    options.onProgress?.({
      date,
      processedDates: index + 1,
      inserted: insertedForDate.length,
      totalDates: dates.length,
    });

    if (sleepMs > 0 && index < dates.length - 1) {
      await sleep(sleepMs);
    }
  }

  return insertedArticles;
};
