import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import server from "../src/server.tsx";
import { insertArticle } from "../src/models/article";
import { Article } from "../src/models/article";
import db from "../src/db";

let app: ReturnType<typeof Bun.serve>;

beforeAll(() => {
  app = Bun.serve({
    port: 3001,
    fetch: server.fetch,
  });

  // Ensure tables exist
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
    CREATE TABLE IF NOT EXISTS fetch_metadata (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insert test articles with different timestamps for testing relative time
  const testArticles: Article[] = [
    {
      id: "test-1",
      title: "Breaking News: Major Event Happened Today",
      link: "https://example.com/dash-article-1",
      source: "Test News",
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "test-2",
      title: "Technology Advances in Artificial Intelligence",
      link: "https://example.com/dash-article-2",
      source: "Tech Daily",
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "test-3",
      title: "Sports Championship Results Announced",
      link: "https://example.com/dash-article-3",
      source: "Sports Central",
      created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    },
  ];

  testArticles.forEach(insertArticle);
});

afterAll(() => {
  app.stop();
});

describe("Dashboard Route Integration", () => {
  it("should return HTML response with correct title and structure", async () => {
    const response = await fetch("http://localhost:3001/");
    expect(response.status).toBe(200);

    const html = await response.text();

    // Assert HTML contains title 'hyperwave'
    expect(html).toContain("<title>hyperwave</title>");

    expect(html).toMatch(/<ul class="m-0 list-none p-0/);

    expect(html).toContain("no-underline");

    // Assert relative time is present (should contain time-related text)
    expect(html).toMatch(
      /(a few seconds ago|\d+ (hour|minute|day)s? ago|yesterday)/,
    );
  });

  it("should handle search queries correctly", async () => {
    const response = await fetch("http://localhost:3001/?q=test");
    expect(response.status).toBe(200);

    const html = await response.text();

    expect(html).toContain("matching");
    expect(html).toMatch(/article(s)?/);

    expect(html).toContain("test");
  });

  it("should display articles with correct format and relative time", async () => {
    const response = await fetch("http://localhost:3001/");
    expect(response.status).toBe(200);

    const html = await response.text();

    // Check that articles are displayed with title, link, and source
    expect(html).toContain("Breaking News: Major Event Happened Today");
    expect(html).toContain("Test News");
    expect(html).toContain("Technology Advances in Artificial Intelligence");
    expect(html).toContain("Tech Daily");

    // Check that relative time is formatted correctly
    expect(html).toMatch(
      /(a few seconds ago|\d+ (hour|minute|day)s? ago|yesterday)/,
    );
  });
});
