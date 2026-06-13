import db from "@/db";
import type { Article } from "models/article";
import { extractPublishedAtFromHtml } from "util/publishedDate";

export type FetchText = (url: string) => Promise<string>;

export interface RepairPublishedAtOptions {
  fetchText: FetchText;
  updatePublishedAt: (id: string, publishedAt: string) => Promise<void> | void;
  sleepMs?: number;
  sleep?: (milliseconds: number) => Promise<void>;
}

const defaultSleep = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export const repairPublishedAtForArticles = async (
  articles: Article[],
  options: RepairPublishedAtOptions,
): Promise<number> => {
  let repaired = 0;
  const sleep = options.sleep || defaultSleep;
  const sleepMs = options.sleepMs || 0;

  for (const [index, article] of articles.entries()) {
    try {
      const publishedAt = extractPublishedAtFromHtml(
        await options.fetchText(article.link),
      );

      if (publishedAt) {
        await options.updatePublishedAt(article.id, publishedAt);
        repaired += 1;
      }
    } catch (error) {
      console.error(
        `Skipping published_at repair for ${article.link}: ${error}`,
      );
    }

    if (sleepMs > 0 && index < articles.length - 1) {
      await sleep(sleepMs);
    }
  }

  return repaired;
};

const defaultFetchText: FetchText = async (url) => {
  const response = await fetch(url, {
    headers: { "User-Agent": "hyperwave-published-at-repair/0.1" },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return response.text();
};

export const repairStoredPublishedAt = async ({
  source,
  sleepMs = 500,
}: {
  source?: string;
  sleepMs?: number;
} = {}): Promise<number> => {
  const sourceClause = source ? "WHERE source = ?" : "";
  const articles = db
    .prepare(`SELECT * FROM articles ${sourceClause} ORDER BY created_at ASC`)
    .all(...(source ? [source] : [])) as Article[];
  const update = db.prepare(
    "UPDATE articles SET published_at = ? WHERE id = ?",
  );

  return repairPublishedAtForArticles(articles, {
    fetchText: defaultFetchText,
    updatePublishedAt: (id, publishedAt) => update.run(publishedAt, id),
    sleepMs,
  });
};
