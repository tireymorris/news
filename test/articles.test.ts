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

  // Clear existing articles and insert test articles for pagination testing
  db.prepare("DELETE FROM articles").run();
  const testArticles: Article[] = [
    {
      id: "pagination-test-1",
      title: "First Article for Pagination Testing",
      link: "https://example.com/article1",
      source: "Test Source 1",
      created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
    },
    {
      id: "pagination-test-2",
      title: "Second Article for Pagination Testing",
      link: "https://example.com/article2",
      source: "Test Source 2",
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    },
    {
      id: "pagination-test-3",
      title: "Third Article for Pagination Testing",
      link: "https://example.com/article3",
      source: "Test Source 3",
      created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
    },
    {
      id: "pagination-test-4",
      title: "Fourth Article for Pagination Testing",
      link: "https://example.com/article4",
      source: "Test Source 4",
      created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
    },
    {
      id: "pagination-test-5",
      title: "Fifth Article for Pagination Testing",
      link: "https://example.com/article5",
      source: "Test Source 5",
      created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
    },
  ];

  testArticles.forEach(insertArticle);
});

afterAll(() => {
  app.stop();
});

describe("Articles Route Integration", () => {
  it("should validate offset and limit query parameters", async () => {
    const response = await fetch(
      "http://localhost:3001/articles?offset=0&limit=10",
    );
    expect(response.status).toBe(200);

    const html = await response.text();

    // Assert HTML contains ul with li elements
    expect(html).toContain('<ul class="m-0 list-none p-0">');
    expect(html).toContain('<li class="m-0 mb-1 list-none border-b p-0">');
  });

  it("should return correct article list structure with offset and limit", async () => {
    const response = await fetch(
      "http://localhost:3001/articles?offset=0&limit=2",
    );
    expect(response.status).toBe(200);

    const html = await response.text();

    // Should contain exactly 2 articles
    const articleCount = (html.match(/<li /g) || []).length;
    expect(articleCount).toBe(2);

    // Verify each article has title link, relative date, and source
    expect(html).toContain("First Article for Pagination Testing");
    expect(html).toContain("Second Article for Pagination Testing");
    expect(html).toContain("Test Source 1");
    expect(html).toContain("Test Source 2");

    // Check for relative time (should be hours ago)
    expect(html).toMatch(/\d+ hours? ago/);
  });

  it("should handle pagination correctly with different offsets", async () => {
    // First page: offset 0, limit 2
    const response1 = await fetch(
      "http://localhost:3001/articles?offset=0&limit=2",
    );
    expect(response1.status).toBe(200);
    const html1 = await response1.text();
    expect(html1).toContain("First Article for Pagination Testing");
    expect(html1).toContain("Second Article for Pagination Testing");
    expect(html1).not.toContain("Third Article for Pagination Testing");

    // Second page: offset 2, limit 2
    const response2 = await fetch(
      "http://localhost:3001/articles?offset=2&limit=2",
    );
    expect(response2.status).toBe(200);
    const html2 = await response2.text();
    expect(html2).toContain("Third Article for Pagination Testing");
    expect(html2).toContain("Fourth Article for Pagination Testing");
    expect(html2).not.toContain("First Article for Pagination Testing");
  });

  it("should handle empty response when no more articles", async () => {
    const response = await fetch(
      "http://localhost:3001/articles?offset=1000&limit=10",
    );
    expect(response.status).toBe(200);

    const html = await response.text();

    // Assert 'No more articles' message appears
    expect(html).toContain("No more articles to load");
    expect(html).not.toContain('<ul class="m-0 list-none p-0">');
  });

  it("should format articles with relative dates and sources", async () => {
    const response = await fetch(
      "http://localhost:3001/articles?offset=0&limit=5",
    );
    expect(response.status).toBe(200);

    const html = await response.text();

    // All articles should be present
    expect(html).toContain("First Article for Pagination Testing");
    expect(html).toContain("Second Article for Pagination Testing");
    expect(html).toContain("Third Article for Pagination Testing");
    expect(html).toContain("Fourth Article for Pagination Testing");
    expect(html).toContain("Fifth Article for Pagination Testing");

    // Sources
    expect(html).toContain("Test Source 1");
    expect(html).toContain("Test Source 2");
    expect(html).toContain("Test Source 3");
    expect(html).toContain("Test Source 4");
    expect(html).toContain("Test Source 5");

    // Relative dates (hours ago)
    expect(html).toMatch(/\d+ hours? ago/);
  });
});
