import db from "@/db";
import { debug, log } from "util/log";
import { newsSources } from "util/newsSources";
import { z } from "zod";
import { Article } from "@/types";
import { fetchArticlesFromSource } from "util/crawler";

export const articleSchema = z.object({
  title: z
    .string()
    .refine((title) => title.split(" ").length >= 7, {
      message: "Title must contain at least 7 words",
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
    "SELECT COUNT(*) as count FROM articles WHERE title = ?",
  );

  const result = checkExistence.get(article.title) as { count: number };
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
    debug(`DUPLICATE: ${article.title}`);
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
  debug(`Fetching and storing articles`);
  const allArticles = await fetchAllArticles();

  const fetchedTitles = allArticles.map((article) => article.title);

  if (fetchedTitles.length === 0) {
    debug("No articles fetched.");
    return [];
  }

  const placeholders = fetchedTitles.map(() => "?").join(",");
  const existingTitlesResult = db
    .prepare(`SELECT title FROM articles WHERE title IN (${placeholders})`)
    .all(...fetchedTitles);

  const existingTitles = new Set(
    existingTitlesResult.map((row: any) => row.title),
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
