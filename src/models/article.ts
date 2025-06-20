import db from "@/db";
import { debug, log } from "util/log";
import { NewsSource, newsSources } from "models/newsSources";
import { z } from "zod";
import { fetchArticlesFromSource } from "util/crawler";
import { updateLastFetchTime } from "util/time";

export interface Article {
  id: string;
  title: string;
  link: string;
  source: NewsSource["name"];
  created_at: string;
}

export const articleSchema = z.object({
  title: z
    .string()
    .refine((title) => title.split(" ").length >= 5, {
      message: "Title must contain at least 4 words",
    })
    .refine(
      (title) =>
        !["Video Duration", "play", "play-inverse"].some((prefix) =>
          title.startsWith(prefix),
        ),
      {
        message: "Title starts with an invalid prefix",
      },
    ),
  link: z.string().url(),
  source: z.string(),
});

export const isValidArticle = (article: Article) => {
  try {
    articleSchema.parse(article);
    return true;
  } catch (e) {
    debug(`INVALID: ${article.source}: ${article.title} - ${e}`);
    return false;
  }
};

export const insertArticle = (article: Article): boolean => {
  const insert = db.prepare(
    "INSERT INTO articles (id, title, link, source, created_at) VALUES (?, ?, ?, ?, ?)",
  );

  const checkExistence = db.prepare(
    "SELECT COUNT(*) as count FROM articles WHERE link = ? OR title = ?",
  );

  const result = checkExistence.get(article.link, article.title) as {
    count: number;
  };
  if (result.count === 0) {
    try {
      insert.run(
        article.id,
        article.title,
        article.link,
        article.source,
        new Date().toISOString(),
      );
      return true;
    } catch (error) {
      debug(`ERROR: ${error}`);
      return false;
    }
  } else {
    debug(`DUPLICATE: ${article.link} or title: ${article.title}`);
    return false;
  }
};

export const getCachedArticles = (offset: number, limit: number): Article[] => {
  debug(`Getting cached articles with offset: ${offset}, limit: ${limit}`);

  const query = `
    SELECT * FROM articles 
    ORDER BY created_at DESC 
    LIMIT ? OFFSET ?`;

  const articles = db.prepare(query).all(limit, offset) as Article[];
  debug(`*** Retrieved ${articles.length} cached articles`);

  return articles;
};

export const fetchAndStoreArticles = async (): Promise<Article[]> => {
  const allArticles = await fetchAllArticles();

  updateLastFetchTime();

  const fetchedLinks = allArticles.map((article) => article.link);
  const fetchedTitles = allArticles.map((article) => article.title);

  if (fetchedLinks.length === 0) {
    return [];
  }

  const linkPlaceholders = fetchedLinks.map(() => "?").join(",");
  const titlePlaceholders = fetchedTitles.map(() => "?").join(",");

  const existingLinksResult = db
    .prepare(`SELECT link FROM articles WHERE link IN (${linkPlaceholders})`)
    .all(...fetchedLinks);

  const existingTitlesResult = db
    .prepare(`SELECT title FROM articles WHERE title IN (${titlePlaceholders})`)
    .all(...fetchedTitles);

  const existingLinks = new Set(
    existingLinksResult.map((row: any) => row.link),
  );

  const existingTitles = new Set(
    existingTitlesResult.map((row: any) => row.title),
  );

  const newArticles = allArticles.filter(
    (article) =>
      !existingLinks.has(article.link) && !existingTitles.has(article.title),
  );

  if (newArticles.length === 0) {
    debug(
      "All fetched articles already exist in the database. Skipping insertion.",
    );
    return [];
  }

  const insertedArticles = newArticles.filter(insertArticle);

  debug(`Inserted ${insertedArticles.length} new articles into the database.`);

  return insertedArticles;
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

export const insertArticles = (articles: Article[]) => {
  log(`*** Inserting ${articles.length} articles into the database`);
  articles.forEach(insertArticle);
};
