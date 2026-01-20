import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import server from "../src/server.tsx";
import { insertArticles, searchArticles } from "../src/models/article";
import { Article } from "../src/models/article";
import db from "../src/db";

let app: ReturnType<typeof Bun.serve>;

beforeAll(() => {
  app = Bun.serve({
    port: 3001,
    fetch: server.fetch,
  });

  // Ensure table exists
  db.run(`
    CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY,
      title TEXT UNIQUE,
      link TEXT,
      source TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Clear existing articles and insert test articles for search testing
  db.prepare("DELETE FROM articles").run();
  const testArticles: Article[] = [
    {
      id: "search-test-1",
      title: "Test Article About Technology",
      link: "https://example.com/test1",
      source: "Test News",
      created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
    },
    {
      id: "search-test-2",
      title: "Breaking News: Major Event",
      link: "https://example.com/test2",
      source: "Test Source",
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    },
    {
      id: "search-test-3",
      title: "Another Article Without Matching Keyword",
      link: "https://example.com/test3",
      source: "Regular News",
      created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
    },
  ];

  insertArticles(testArticles);
});

afterAll(() => {
  app.stop();
});

describe("Search Route Integration", () => {
  it("should require search query parameter", async () => {
    const response = await fetch("http://localhost:3001/search");
    expect(response.status).toBe(200);

    const html = await response.text();

    // Assert response contains 'Please enter a search term'
    expect(html).toContain("Please enter a search term");
  });

  it("should return matching articles for valid search query", async () => {
    const response = await fetch("http://localhost:3001/search?q=test");
    expect(response.status).toBe(200);

    const html = await response.text();

    // Should contain article list structure
    expect(html).toContain('<ul class="m-0 list-none p-0">');
    expect(html).toContain('<li class="m-0 mb-1 list-none border-b p-0">');

    // Should contain matching articles (searching for "test" should match title "Test Article..." and sources "Test News", "Test Source")
    expect(html).toContain("Test Article About Technology");
    expect(html).toContain("Test News");
    expect(html).toContain("Breaking News: Major Event");
    expect(html).toContain("Test Source");

    // Should not contain non-matching article
    expect(html).not.toContain("Another Article Without Matching Keyword");
  });

  it("should show 'No articles found' message when no results", async () => {
    const response = await fetch("http://localhost:3001/search?q=nonexistent");
    expect(response.status).toBe(200);

    const html = await response.text();

    // Assert 'No articles found' message appears (note: HTML encoded quotes)
    expect(html).toContain("No articles found for &quot;nonexistent&quot;");
    expect(html).not.toContain('<ul class="m-0 list-none p-0">');
  });

  it("should maintain proper HTML structure for search results", async () => {
    const response = await fetch("http://localhost:3001/search?q=test");
    expect(response.status).toBe(200);

    const html = await response.text();

    // Check that results have proper HTML structure
    expect(html).toContain('<ul class="m-0 list-none p-0">');

    // Each article should have title as link, relative date, and source
    expect(html).toContain(
      'class="decoration-none text-teal-500 visited:text-purple-600 hover:underline"',
    );
    expect(html).toContain("Test Article About Technology");
    expect(html).toContain("Test News");
    expect(html).toContain("Test Source");

    // Check for relative time (should be hours ago)
    expect(html).toMatch(/\d+ hours? ago/);
  });

  it("should search by title or source", async () => {
    // Search by source
    const response1 = await fetch("http://localhost:3001/search?q=Test%20News");
    expect(response1.status).toBe(200);
    const html1 = await response1.text();
    expect(html1).toContain("Test Article About Technology");
    expect(html1).toContain("Test News");

    // Search by title
    const response2 = await fetch("http://localhost:3001/search?q=Technology");
    expect(response2.status).toBe(200);
    const html2 = await response2.text();
    expect(html2).toContain("Test Article About Technology");
  });
});
