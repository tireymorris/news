import db from "@/db";
import { providerById } from "@/providers";
import type { Article } from "models/article";
import { isValidArticle } from "models/article";
import { extractTitleFromHtml } from "util/publishedDate";
import { titleFromApUrl } from "../adapters";
import { logRepairProgress, repairArticles } from "./loop";

const apSourceName = () => providerById("ap")!.name;

export const isApSlugTitle = (
  article: Pick<Article, "title" | "link">,
): boolean => article.title === titleFromApUrl(article.link);

export const getApSlugTitleArticles = (): Article[] =>
  (
    db
      .prepare("SELECT * FROM articles WHERE source = ?")
      .all(apSourceName()) as Article[]
  ).filter(isApSlugTitle);

export const repairApTitlesForArticles = async (
  articles: Article[],
  options: {
    sleepMs?: number;
    onProgress?: (progress: import("./loop").RepairProgress) => void;
  } = {},
): Promise<number> => {
  const update = db.prepare("UPDATE articles SET title = ? WHERE id = ?");

  return repairArticles(articles, {
    ...options,
    onError: (article, error) => {
      console.error(`Skipping title repair for ${article.link}: ${error}`);
    },
    repairOne: async (article, html) => {
      const title = extractTitleFromHtml(html);
      const candidate = {
        ...article,
        title: title || article.title,
      };

      if (!title || title === article.title || !isValidArticle(candidate)) {
        return false;
      }

      update.run(title, article.id);
      return true;
    },
    onProgress: (progress) => {
      options.onProgress?.(progress);
      logRepairProgress("AP title repair", progress, 25);
    },
  });
};

export const repairStoredApTitles = async (
  options: {
    sleepMs?: number;
    onProgress?: (progress: import("./loop").RepairProgress) => void;
  } = {},
): Promise<number> =>
  repairApTitlesForArticles(getApSlugTitleArticles(), options);
