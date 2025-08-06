import { Hono } from "hono";
import {
  getCachedArticles,
  searchArticles,
  getSearchResultCount,
  getTotalArticleCount,
} from "models/article";
import { debug } from "util/log";
import { formatRelativeTime } from "util/time";

export default function articlesRoutes(app: Hono) {
  app.get("/articles", async (c) => {
    debug("GET /articles - Start");

    const offset = parseInt(c.req.query("offset") || "0", 10);
    const limit = parseInt(c.req.query("limit") || "25", 10);

    debug("Offset:", offset);
    debug("Limit:", limit);

    const articles = getCachedArticles(offset, limit).map((article) => ({
      ...article,
      relativeDate: formatRelativeTime(new Date(article.created_at)),
    }));

    debug("Articles retrieved:", articles.length);

    if (articles.length === 0) {
      return c.html(
        <div class="py-8 text-center text-gray-500">
          No more articles to load
        </div>,
      );
    }

    return c.html(
      <ul class="m-0 list-none p-0">
        {articles.map((article) => (
          <li key={article.id} class="m-0 mb-1 list-none border-b p-0">
            <a
              href={article.link}
              class="decoration-none text-teal-500 visited:text-purple-600 hover:underline"
            >
              {article.title}
            </a>
            <div class="text-sm text-gray-500">
              {article.relativeDate} - {article.source}
            </div>
          </li>
        ))}
      </ul>,
    );
  });

  app.get("/search", async (c) => {
    debug("GET /search - Start");

    const query = c.req.query("q") || "";

    debug("Search query:", query);

    if (!query.trim()) {
      return c.html(
        <div class="py-8 text-center text-gray-500">
          Please enter a search term
        </div>,
      );
    }

    const articles = searchArticles(query, 0, 1000).map((article) => ({
      ...article,
      relativeDate: formatRelativeTime(new Date(article.created_at)),
    }));

    debug("Search results retrieved:", articles.length);

    if (articles.length === 0) {
      return c.html(
        <div class="py-8 text-center text-gray-500">
          No articles found for "{query}"
        </div>,
      );
    }

    return c.html(
      <ul class="m-0 list-none p-0">
        {articles.map((article) => (
          <li key={article.id} class="m-0 mb-1 list-none border-b p-0">
            <a
              href={article.link}
              class="decoration-none text-teal-500 visited:text-purple-600 hover:underline"
            >
              {article.title}
            </a>
            <div class="text-sm text-gray-500">
              {article.relativeDate} - {article.source}
            </div>
          </li>
        ))}
      </ul>,
    );
  });
}
