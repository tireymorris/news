import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { logger } from "hono/logger";
import Layout from "./components/Layout.tsx";
import {
  fetchAndStoreArticles,
  getCachedArticles,
  isCacheValid,
} from "./util/api";

const app = new Hono();

app.use("/styles/*", serveStatic({ root: "./public/" }));
app.use("*", logger());

app.get("/", async (c) => {
  if (!isCacheValid()) {
    await fetchAndStoreArticles();
  }

  return c.html(
    <Layout title="hyperwave">
      <div class="flex flex-col items-center gap-2 p-4 min-h-screen text-base">
        <header class="w-full h-1/4 flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            class="w-16 h-16 mr-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 6h16M4 10h16M4 14h10M4 18h10M2 4v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4"
            />
          </svg>
          <h1 class="text-3xl font-serif italic">Top Stories</h1>
        </header>

        <div
          id="articles"
          hx-get="/articles?page=1"
          hx-trigger="load"
          hx-swap="beforeend"
          hx-indicator="#loading-indicator"
          class="w-full px-2"
        ></div>
        <div id="loading-indicator" class="text-center hidden">
          <svg
            class="animate-spin h-5 w-5 text-blue-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zM12 16a4 4 0 100-8 4 4 0 000 8z"
            ></path>
          </svg>
        </div>
      </div>
    </Layout>,
  );
});

app.get("/articles", async (c) => {
  const page = parseInt(c.req.query("page") || "1");
  const articlesPerPage = 15;
  const offset = (page - 1) * articlesPerPage;

  if (!isCacheValid()) {
    await fetchAndStoreArticles();
  }

  const articles = getCachedArticles(offset, articlesPerPage);

  const nextPage = page + 1;

  return c.html(
    <ul class="list-none m-0 p-0">
      {articles.map((article) => (
        <li key={article.id} class="p-0 m-0 border-b list-none mb-3">
          <a
            href={article.link}
            class="text-blue-500 hover:underline visited:text-purple-600"
          >
            {article.title} [{article.source}]
          </a>
        </li>
      ))}
      {articles.length > 0 && (
        <div
          hx-get={`/articles?page=${nextPage}`}
          hx-trigger="intersect once"
          hx-swap="beforeend"
          hx-indicator="#loading-indicator"
        ></div>
      )}
    </ul>,
  );
});

export default {
  port: process.env.PORT || 1234,
  fetch: app.fetch,
};
