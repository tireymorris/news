import { load } from "cheerio";
import { Article, isValidArticle } from "models/article";
import { log, debug } from "util/log";
import db from "@/db";
import { NewsSource } from "../models/newsSources";

export const fetchArticlesFromSource = async (
  source: NewsSource,
): Promise<Article[]> => {
  log(`Fetching articles from: ${source.name}`);

  const response = await fetch(source.url);
  const text = await response.text();

  debug(`*** Fetched ${text.length} bytes from: ${source.name}`);
  const $ = load(text);
  const articles: Article[] = [];

  $(source.listSelector)
    .slice(0, source.limit || 100)
    .each((_, element) => {
      const titleElement = source.titleSelector
        ? $(element).find(source.titleSelector)
        : $(element);
      const title = titleElement.text().trim();
      const relativeLink = $(element).attr("href");

      if (title && relativeLink) {
        const link = new URL(relativeLink, source.baseUrl).href;

        // Skip articles we've already seen
        const existingArticle = db
          .prepare(
            "SELECT created_at FROM articles WHERE link = ? OR title = ?",
          )
          .get(link, title) as { created_at: string } | undefined;

        if (existingArticle) {
          debug(`*** SKIPPING EXISTING: ${source.name}: ${title}`);
          return; // Skip this article entirely
        }

        const article: Article = {
          id: Bun.hash(title + link).toString(),
          title,
          link,
          source: source.name,
          created_at: new Date().toISOString(),
        };

        if (!isValidArticle(article)) {
          debug(`*** INVALID: ${source.name}: ${title} ${link}`);
        } else {
          articles.push(article);
          debug(`*** NEW: ${source.name}: ${title} ${link}`);
        }
      } else {
        debug(`*** MISSING INFO: ${source.name}: ${title} ${relativeLink}`);
      }
    });

  debug(`*** Fetched ${articles.length} articles from: ${source.name}`);

  return articles;
};
