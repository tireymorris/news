import { load } from "cheerio";
import db from "./db.ts";
import { Article } from "../types.ts";
import { newsSources, NewsSource } from "./newsSources.ts";
import { isValidArticle, insertArticle } from "./articleUtils.ts";
import { debug, log } from "./log.ts";

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

  log(`Total articles fetched: ${allArticles.length}`);

  return allArticles;
};

const insertArticles = (articles: Article[]) => {
  log(`*** Inserting ${articles.length} articles into the database`);
  articles.forEach(insertArticle);
};

const getCachedArticles = (offset: number, limit: number): Article[] => {
  debug(`Getting cached articles with offset: ${offset}, limit: ${limit}`);

  const query = `
    SELECT * FROM articles 
    ORDER BY created_at DESC 
    LIMIT ? OFFSET ?`;

  const articles = db.prepare(query).all(limit, offset) as Article[];
  debug(`*** Retrieved ${articles.length} cached articles`);

  return articles;
};

const fetchAndStoreArticles = async (): Promise<Article[]> => {
  debug(`Fetching and storing articles`);
  const allArticles = await fetchAllArticles();

  const existingTitles = new Set(
    db
      .prepare("SELECT title FROM articles")
      .all()
      .map((row: any) => row.title),
  );

  const newArticles = allArticles.filter(
    (article) => !existingTitles.has(article.title),
  );

  if (newArticles.length === 0) {
    debug(
      "All fetched articles already exist in the database. Skipping insertion.",
    );
    return [];
  }

  const insertedArticles = newArticles.filter(insertArticle);

  return insertedArticles;
};

export {
  fetchArticlesFromSource,
  fetchAllArticles,
  insertArticles,
  getCachedArticles,
  fetchAndStoreArticles,
};
