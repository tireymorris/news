import { Database } from "bun:sqlite";

const isTest = process.env.NODE_ENV === "test";
const db = new Database(isTest ? "test_articles.db" : "articles.db");

db.run(`
  CREATE TABLE IF NOT EXISTS articles (
    id TEXT PRIMARY KEY,
    title TEXT,
    link TEXT,
    source TEXT,
    page INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

export default db;
