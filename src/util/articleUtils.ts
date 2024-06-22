import db from "./db";
import { Article } from "../types";
import articleSchema from "./articleSchema";
import { debug, log } from "./log";

const isValidArticle = (article: Article) => {
  try {
    articleSchema.parse(article);
    return true;
  } catch (e) {
    if (process.env["DEBUG"] === "true") {
      debug(`INVALID: ${article.source}: ${article.title} - ${e}`);
    }
    return false;
  }
};

const insertArticle = (article: Article): boolean => {
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

export { isValidArticle, insertArticle };
