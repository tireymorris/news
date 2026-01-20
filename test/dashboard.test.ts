import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import server from "../src/server.tsx";
import { insertArticles } from "../src/models/article";
import { Article } from "../src/models/article";
import db from "../src/db";

let app: ReturnType<typeof Bun.serve>;

beforeAll(() => {
  app = Bun.serve({
    port: 3001,
    fetch: server.fetch,
  });

  // Insert test articles with different timestamps for testing relative time
  const testArticles: Article[] = [
    {
      id: "test-1",
      title: "Breaking News: Major Event Happened Today",
      link: "https://example.com/article1",
      source: "Test News",
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    },
    {
      id: "test-2",
      title: "Technology Advances in Artificial Intelligence",
      link: "https://example.com/article2",
      source: "Tech Daily",
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    },
    {
      id: "test-3",
      title: "Sports Championship Results Announced",
      link: "https://example.com/article3",
      source: "Sports Central",
      created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
    },
  ];

  insertArticles(testArticles);
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

    // Assert articles list is present
    expect(html).toContain('<ul class="m-0 list-none p-0">');

    // Assert at least one article with correct CSS classes
    expect(html).toContain(
      'class="decoration-none text-teal-500 visited:text-purple-600 hover:underline"',
    );

    // Assert relative time is present (should contain time-related text)
    expect(html).toMatch(
      /(a few seconds ago|\d+ (hour|minute|day)s? ago|yesterday)/,
    );
  });

  it("should handle search queries correctly", async () => {
    const response = await fetch("http://localhost:3001/?q=test");
    expect(response.status).toBe(200);

    const html = await response.text();

    // Assert search results are displayed
    expect(html).toContain("Found");
    expect(html).toContain("result");

    // Should contain the search query in the results text
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
