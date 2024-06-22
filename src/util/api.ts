import { load } from "cheerio";
import db from "./db";
import { Article } from "../types";
import shuffle from "./shuffle";
import { newsSources, NewsSource } from "./newsSources";
import {
  isValidArticle,
  insertArticle,
  clearCacheIfNeeded,
} from "./articleUtils";

const fetchArticlesFromSource = async (
  source: NewsSource,
  clearCache: () => void = clearCacheIfNeeded,
): Promise<Article[]> => {
  clearCache();

  if (process.env["DEBUG"] === "true") {
    console.log(`*** Fetching articles from: ${source.name}`);
  }

  const response = await fetch(source.url);
  const text = await response.text();

  if (process.env["DEBUG"] === "true") {
    console.log(`*** FETCHING: ${source.name}`);
  }
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
          id: title,
          title,
          link,
          source: source.name,
          created_at: new Date().toISOString(),
        };
        if (!isValidArticle(article)) {
          if (process.env["DEBUG"] === "true") {
            console.log(`*** INVALID: ${source.name}: ${title} ${link}`);
          }
        } else {
          articles.push(article);
          if (process.env["DEBUG"] === "true") {
            console.log(`*** VALID: ${source.name}: ${title} ${link}`);
          }
        }
      } else {
        if (process.env["DEBUG"] === "true") {
          console.log(
            `*** MISSING INFO: ${source.name}: ${title} ${relativeLink}`,
          );
        }
      }
    });

  if (process.env["DEBUG"] === "true") {
    console.log(`*** Fetched ${articles.length} articles from: ${source.name}`);
  }

  return articles;
};

// Fetch articles from all sources
const fetchAllArticles = async (): Promise<Article[]> => {
  const allArticles: Article[] = [];

  for (const source of newsSources) {
    if (process.env["DEBUG"] === "true") {
      console.log(`*** Fetching articles from all sources`);
    }
    const fetchedArticles = await fetchArticlesFromSource(source);
    allArticles.push(...fetchedArticles);
  }

  shuffle(allArticles);

  if (process.env["DEBUG"] === "true") {
    console.log(`*** Total articles fetched: ${allArticles.length}`);
  }

  return allArticles;
};

const insertArticles = (articles: Article[]) => {
  if (process.env["DEBUG"] === "true") {
    console.log(`*** Inserting ${articles.length} articles into the database`);
  }
  articles.forEach(insertArticle);
};

const getCachedArticles = (offset: number, limit: number): Article[] => {
  if (process.env["DEBUG"] === "true") {
    console.log(
      `*** Getting cached articles with offset: ${offset}, limit: ${limit}`,
    );
  }
  const articles = db
    .prepare("SELECT * FROM articles ORDER BY RANDOM() DESC LIMIT ? OFFSET ?")
    .all(limit, offset) as Article[];

  if (process.env["DEBUG"] === "true") {
    console.log(`*** Retrieved ${articles.length} cached articles`);
  }

  return articles;
};

const fetchAndStoreArticles = async () => {
  if (process.env["DEBUG"] === "true") {
    console.log(`*** Fetching and storing articles`);
  }
  const allArticles = await fetchAllArticles();
  insertArticles(allArticles);
  if (process.env["DEBUG"] === "true") {
    console.log(`*** Articles fetched and stored successfully`);
  }
};

const isCacheValid = (): boolean => {
  const oldestArticle = db
    .prepare("SELECT created_at FROM articles ORDER BY created_at ASC LIMIT 1")
    .get() as { created_at: string } | undefined;

  if (oldestArticle) {
    const articleDate = new Date(oldestArticle.created_at);
    const now = new Date();
    const hoursDifference =
      (now.getTime() - articleDate.getTime()) / (1000 * 60 * 60);

    if (process.env["DEBUG"] === "true") {
      console.log(
        `*** Cache validity checked. Hours difference: ${hoursDifference}`,
      );
    }

    return hoursDifference < 8;
  }

  if (process.env["DEBUG"] === "true") {
    console.log(`*** No articles in cache`);
  }

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
  clearCacheIfNeeded,
};
