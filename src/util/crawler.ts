import { load } from "cheerio";
import { isValidArticle } from "models/article";
import { Article, NewsSource } from "@/types";
import { log, debug } from "util/log";

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
      const title = $(element).text().trim();
      const relativeLink = $(element).attr("href");

      if (title && relativeLink) {
        const link = new URL(relativeLink, source.baseUrl).href;
        const article: Article = {
          id: Bun.hash(title).toString(),
          title,
          link,
          source: source.name,
          created_at: new Date().toISOString(),
        };
        if (!isValidArticle(article)) {
          debug(`*** INVALID: ${source.name}: ${title} ${link}`);
        } else {
          articles.push(article);
          debug(`*** VALID: ${source.name}: ${title} ${link}`);
        }
      } else {
        debug(`*** MISSING INFO: ${source.name}: ${title} ${relativeLink}`);
      }
    });

  debug(`*** Fetched ${articles.length} articles from: ${source.name}`);

  return articles;
};
