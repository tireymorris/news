import { load } from "cheerio";
import { z } from "zod";
import db from "./db";
import { Article } from "../types";
import shuffle from "./shuffle";

const articleSchema = z.object({
  title: z
    .string()
    .refine((title) => title.split(" ").length >= 5, {
      message: "Title must contain at least 5 words",
    })
    .refine(
      (title) =>
        !["Video Duration", "play", "play-inverse"].some((prefix) =>
          title.startsWith(prefix),
        ),
    ),
  link: z.string().url(),
  source: z.string(),
});

type NewsSource = {
  name: string;
  url: string;
  listSelector: string;
  baseUrl?: string;
};

const newsSources: NewsSource[] = [
  {
    name: "NPR",
    url: `http://text.npr.org`,
    listSelector: "ul > li > a",
    baseUrl: "http://text.npr.org",
  },
  {
    name: "Al Jazeera",
    url: `https://www.aljazeera.com/us-canada`,
    listSelector: "article .gc__content a",
    baseUrl: "https://www.aljazeera.com",
  },
];

const isValidArticle = (article: { title: string; link: string }) => {
  try {
    articleSchema.parse(article);
    return true;
  } catch (e) {
    return false;
  }
};

const clearCacheIfNeeded = () => {
  const oldestArticle = db
    .prepare("SELECT created_at FROM articles ORDER BY created_at ASC LIMIT 1")
    .get() as { created_at: string } | undefined;

  if (oldestArticle) {
    const articleDate = new Date(oldestArticle.created_at);
    const now = new Date();
    const hoursDifference =
      (now.getTime() - articleDate.getTime()) / (1000 * 60 * 60);

    if (hoursDifference >= 8) {
      if (process.env["DEBUG"] === "true") {
        console.log("*** CLEARING CACHE");
      }
      db.prepare("DELETE FROM articles").run();
    }
  }
};

const fetchArticlesFromSource = async (
  source: NewsSource,
  clearCache: () => void = clearCacheIfNeeded,
): Promise<Article[]> => {
  clearCache();

  const cachedArticles = db
    .prepare("SELECT * FROM articles WHERE source = ?")
    .all(source.name) as Article[];

  if (cachedArticles.length > 0) {
    if (process.env["DEBUG"] === "true") {
      console.log(`*** CACHE HIT: ${source.name}`);
    }
    return cachedArticles;
  }

  const response = await fetch(source.url);
  const text = await response.text();

  if (process.env["DEBUG"] === "true") {
    console.log(`*** CACHE MISS: ${source.name}`);
  }
  const $ = load(text);
  const articles: Article[] = [];

  $(source.listSelector).each((_, element) => {
    const title = $(element).text().trim();
    const link = source.baseUrl
      ? `${source.baseUrl}${$(element).attr("href")}`
      : $(element).attr("href");

    if (title && link) {
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
      }
    }
  });

  return articles;
};

const fetchAllArticles = async () => {
  const allArticles: Article[] = [];

  for (const source of newsSources) {
    const fetchedArticles = await fetchArticlesFromSource(source);
    allArticles.push(...fetchedArticles);
  }

  shuffle(allArticles);

  const insert = db.prepare(
    "INSERT INTO articles (id, title, link, source, created_at) VALUES (?, ?, ?, ?, ?)",
  );

  allArticles.forEach((article) => {
    try {
      insert.run(
        article.id,
        article.title,
        article.link,
        article.source,
        article.created_at,
      );
    } catch (error) {
      if (process.env["DEBUG"] === "true") {
        console.log(`*** DUPLICATE: ${article.title}`);
      }
    }
  });
};

const getCachedArticles = (offset: number, limit: number): Article[] => {
  return db
    .prepare("SELECT * FROM articles ORDER BY created_at DESC LIMIT ? OFFSET ?")
    .all(limit, offset) as Article[];
};

export {
  fetchArticlesFromSource,
  fetchAllArticles,
  getCachedArticles,
  isValidArticle,
  newsSources,
  clearCacheIfNeeded,
};
