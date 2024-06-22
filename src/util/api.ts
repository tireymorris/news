import { load } from "cheerio";
import db from "./db";
import { Article } from "../types";
import shuffle from "./shuffle";
import { newsSources, NewsSource } from "./newsSources";
import { isValidArticle, insertArticle } from "./articleUtils";
import { debug, log } from "./log";

const generateIdFromTitle = (title: string): string => {
  return Bun.hash(title).toString();
};

const fetchArticlesFromSource = async (
  source: NewsSource,
): Promise<Article[]> => {
  log(`Fetching articles from: ${source.name}`);

  const response = await fetch(source.url);
  const text = await response.text();

  debug(`FETCHING: ${source.name}`);
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
          id: generateIdFromTitle(title),
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

const fetchAllArticles = async (): Promise<Article[]> => {
  const allArticles: Article[] = [];

  for (const source of newsSources) {
    const fetchedArticles = await fetchArticlesFromSource(source);
    allArticles.push(...fetchedArticles);
  }

  shuffle(allArticles);

  log(`Total articles fetched: ${allArticles.length}`);

  return allArticles;
};

const insertArticles = (articles: Article[]) => {
  log(`*** Inserting ${articles.length} articles into the database`);
  articles.forEach(insertArticle);
};

const getCachedArticles = (
  offset: number,
  limit: number,
  excludedIds: string[] = [],
): Article[] => {
  debug(
    `Getting cached articles with offset: ${offset}, limit: ${limit}, excluding IDs: ${excludedIds.join(", ")}`,
  );
  const articles = db
    .prepare(
      "SELECT * FROM articles WHERE id NOT IN ('" +
        excludedIds.join("','") +
        "') ORDER BY created_at DESC LIMIT ? OFFSET ?",
    )
    .all(limit, offset) as Article[];

  debug(`*** Retrieved ${articles.length} cached articles`);

  return articles;
};

const fetchAndStoreArticles = async (): Promise<Article[]> => {
  debug(`Fetching and storing articles`);
  const allArticles = await fetchAllArticles();
  const insertedArticles = allArticles.filter(insertArticle);

  return insertedArticles;
};

const isCacheValid = (): boolean => {
  const newestArticle = db
    .prepare("SELECT created_at FROM articles ORDER BY created_at DESC LIMIT 1")
    .get() as { created_at: string } | undefined;

  if (newestArticle) {
    const articleDate = new Date(newestArticle.created_at);
    const now = new Date();
    const hoursDifference =
      (now.getTime() - articleDate.getTime()) / (1000 * 60 * 60);

    debug(`Cache validity checked. Hours difference: ${hoursDifference}`);

    return hoursDifference < 1;
  }

  debug(`No articles in cache`);

  return false;
};

export {
  fetchArticlesFromSource,
  fetchAllArticles,
  insertArticles,
  getCachedArticles,
  fetchAndStoreArticles,
  isCacheValid,
  newsSources,
};
