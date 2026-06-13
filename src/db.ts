import { Database } from "bun:sqlite";
import { mkdirSync, existsSync } from "fs";

const isTest = process.env.NODE_ENV === "test";
const dbPath =
  process.env.DATABASE_PATH ||
  (isTest
    ? "test_articles.db"
    : process.env.NODE_ENV === "production"
      ? "/app/data/articles.db"
      : "articles.db");

// Ensure the directory exists for production
if (process.env.NODE_ENV === "production") {
  const dataDir = "/app/data";
  if (!existsSync(dataDir)) {
    console.log("Creating /app/data directory...");
    mkdirSync(dataDir, { recursive: true });
  }
  console.log(`Using production database path: ${dbPath}`);
} else {
  console.log(`Using development database path: ${dbPath}`);
}

const db = new Database(dbPath);
db.run("PRAGMA busy_timeout = 5000");

db.run(`
  CREATE TABLE IF NOT EXISTS articles (
    id TEXT PRIMARY KEY,
    title TEXT UNIQUE,
    link TEXT,
    source TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    published_at DATETIME
  )
`);

const articleColumns = db.prepare("PRAGMA table_info(articles)").all() as {
  name: string;
}[];
if (!articleColumns.some((column) => column.name === "published_at")) {
  db.run("ALTER TABLE articles ADD COLUMN published_at DATETIME");
  db.run(
    "UPDATE articles SET published_at = created_at WHERE published_at IS NULL",
  );
}

db.run(`
  CREATE TABLE IF NOT EXISTS fetch_metadata (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

export default db;
