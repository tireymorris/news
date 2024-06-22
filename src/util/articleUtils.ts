import db from "./db";
import { Article } from "../types";
import articleSchema from "./articleSchema";

const isValidArticle = (article: Article) => {
  try {
    articleSchema.parse(article);
    return true;
  } catch (e) {
    if (process.env["DEBUG"] === "true") {
      console.log(
        `*** INVALID: ${article.source}: ${article.title} - ${e.errors.map((err: any) => err.message).join(", ")}`,
      );
    }
    return false;
  }
};

const insertArticle = (article: Article) => {
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
        article.created_at,
      );
    } catch (error) {
      if (process.env["DEBUG"] === "true") {
        console.log(`*** ERROR: ${error.message}`);
      }
    }
  } else {
    if (process.env["DEBUG"] === "true") {
      console.log(`*** DUPLICATE: ${article.title}`);
    }
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

export { isValidArticle, insertArticle, clearCacheIfNeeded };
