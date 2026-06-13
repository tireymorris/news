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

export const storeBackfillRange = async (
  startDate: string,
  endDate = startDate,
  adapters: BackfillAdapter[] = backfillAdapters,
): Promise<Article[]> => {
  const insertedArticles: Article[] = [];

  for (const date of backfillDates(startDate, endDate)) {
    insertedArticles.push(...(await storeBackfillArticles(date, adapters)));
  }

  return insertedArticles;
};
