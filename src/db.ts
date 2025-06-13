import { Database } from "bun:sqlite";

const isTest = process.env.NODE_ENV === "test";
const dbPath = isTest ? "test_articles.db" : (process.env.NODE_ENV === "production" ? "/app/data/articles.db" : "articles.db");
const db = new Database(dbPath);

db.run(`
  CREATE TABLE IF NOT EXISTS articles (
    id TEXT PRIMARY KEY,
    title TEXT UNIQUE,
    link TEXT,
    source TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS source_hashes (
    source TEXT PRIMARY KEY,
    hash TEXT
  )
`);

export default db;
