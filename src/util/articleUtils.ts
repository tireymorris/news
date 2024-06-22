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
        new Date().toISOString(),
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

export { isValidArticle, insertArticle };
