import { load } from "cheerio";
import { z } from "zod";
import db from "./db";
import { Article } from "../types";

const articleSchema = z.object({
  title: z.string().min(5),
  link: z.string().url(),
  source: z.string(),
});

type NewsSource = {
  name: string;
  url: (page: number) => string;
  listSelector: string;
  baseUrl?: string;
};

const newsSources: NewsSource[] = [
  {
    name: "NPR",
    url: (page: number) => `http://text.npr.org?page=${page}`,
    listSelector: "ul > li > a",
    baseUrl: "http://text.npr.org",
  },
  {
    name: "Al Jazeera",
    url: (page: number) => `https://www.aljazeera.com/us-canada?page=${page}`,
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
      db.prepare("DELETE FROM articles").run();
    }
  }
};

const fetchArticlesFromSource = async (
  source: NewsSource,
  page: number = 1,
  clearCache: () => void = clearCacheIfNeeded,
) => {
  clearCache();

  const cachedArticles = db
    .prepare("SELECT * FROM articles WHERE source = ? AND page = ?")
    .all(source.name, page) as Article[];

  if (cachedArticles.length > 0) {
    return cachedArticles;
  }

  const response = await fetch(source.url(page));
  const text = await response.text();

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
        page,
        created_at: new Date().toISOString(),
      };
      if (isValidArticle(article)) {
        const existingArticle = db
          .prepare("SELECT 1 FROM articles WHERE id = ?")
          .get(title);

        if (!existingArticle) {
          articles.push(article);
          db.prepare(
            "INSERT INTO articles (id, title, link, source, page, created_at) VALUES (?, ?, ?, ?, ?, ?)",
          ).run(
            article.id,
            article.title,
            article.link,
            article.source,
            article.page,
            article.created_at,
          );
        }
      }
    }
  });

  return articles;
};

export {
  fetchArticlesFromSource,
  isValidArticle,
  newsSources,
  clearCacheIfNeeded,
};
