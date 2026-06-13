import db from "@/db";
import type { Article } from "models/article";
import { extractPublishedAtFromHtml } from "util/publishedDate";

export type FetchText = (url: string) => Promise<string>;

export interface RepairProgress {
  processed: number;
  repaired: number;
  total: number;
}

export interface RepairPublishedAtOptions {
  fetchText: FetchText;
  updatePublishedAt: (id: string, publishedAt: string) => Promise<void> | void;
  sleepMs?: number;
  sleep?: (milliseconds: number) => Promise<void>;
  onProgress?: (progress: RepairProgress) => void;
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

    options.onProgress?.({
      processed: index + 1,
      repaired,
      total: articles.length,
    });

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

export const getRepairableArticles = (source?: string): Article[] => {
  const sourceClause = source ? "AND source = ?" : "";
  return db
    .prepare(
      `SELECT * FROM articles
       WHERE (published_at IS NULL OR published_at = created_at)
       ${sourceClause}
       ORDER BY created_at ASC`,
    )
    .all(...(source ? [source] : [])) as Article[];
};

export const repairStoredPublishedAt = async ({
  source,
  sleepMs = 500,
  onProgress,
}: {
  source?: string;
  sleepMs?: number;
  onProgress?: (progress: RepairProgress) => void;
} = {}): Promise<number> => {
  const articles = getRepairableArticles(source);
  const update = db.prepare(
    "UPDATE articles SET published_at = ? WHERE id = ?",
  );

  return repairPublishedAtForArticles(articles, {
    fetchText: defaultFetchText,
    updatePublishedAt: (id, publishedAt) => update.run(publishedAt, id),
    sleepMs,
    onProgress,
  });
};
