import db from "@/db";
import type { Article } from "models/article";
import { extractPublishedAtFromHtml } from "util/publishedDate";
import { logRepairProgress, repairArticles } from "./loop";

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

export const repairPublishedAtForArticles = async (
  articles: Article[],
  options: {
    fetchText?: (url: string) => Promise<string>;
    updatePublishedAt: (id: string, publishedAt: string) => Promise<void> | void;
    sleepMs?: number;
    onProgress?: (progress: import("./loop").RepairProgress) => void;
  },
): Promise<number> => {
  const update = options.updatePublishedAt;

  return repairArticles(articles, {
    ...options,
    onError: (article, error) => {
      console.error(
        `Skipping published_at repair for ${article.link}: ${error}`,
      );
    },
    repairOne: async (article, html) => {
      const publishedAt = extractPublishedAtFromHtml(html);
      if (!publishedAt) {
        return false;
      }

      await update(article.id, publishedAt);
      return true;
    },
  });
};

export const repairStoredPublishedAt = async ({
  source,
  sleepMs = 500,
  onProgress,
}: {
  source?: string;
  sleepMs?: number;
  onProgress?: (progress: import("./loop").RepairProgress) => void;
} = {}): Promise<number> => {
  const articles = getRepairableArticles(source);
  const update = db.prepare(
    "UPDATE articles SET published_at = ? WHERE id = ?",
  );

  return repairPublishedAtForArticles(articles, {
    updatePublishedAt: (id, publishedAt) => update.run(publishedAt, id),
    sleepMs,
    onProgress: (progress) => {
      onProgress?.(progress);
      logRepairProgress(
        `published_at repair${source ? ` for ${source}` : ""}`,
        progress,
      );
    },
  });
};
