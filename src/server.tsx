import Layout from "components/Layout";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { serveStatic } from "hono/bun";
import articlesRoutes from "routes/articles";
import {
  formatRelativeTime,
  getLastUpdatedTimestamp,
  shouldFetchArticles,
  getLastFetchTime,
} from "util/time";
import {
  fetchAndStoreArticles,
  getCachedArticles,
  getTotalArticleCount,
  searchArticles,
  getSearchResultCount,
} from "models/article";
import { debug } from "util/log";

const app = new Hono();

app.use("/styles/*", serveStatic({ root: "./public/" }));
app.use("/scripts/*", serveStatic({ root: "./public/" }));
app.use("*", logger());

app.get("/", async (c) => {
  const shouldFetch = shouldFetchArticles();
  const lastFetchTime = getLastFetchTime();
  const searchQuery = c.req.query("q") || "";

  debug(
    `Dashboard load - Should fetch: ${shouldFetch}, Last fetch: ${lastFetchTime ? lastFetchTime.toISOString() : "never"}`,
  );

  if (shouldFetch) {
    debug("Triggering article fetch on dashboard load...");
    fetchAndStoreArticles().catch((error) => {
      debug("Error fetching articles on dashboard load:", error);
    });
  }

  const lastUpdatedDate = getLastUpdatedTimestamp();
  const lastUpdated = lastUpdatedDate
    ? formatRelativeTime(lastUpdatedDate)
    : null;

  let initialArticles;
  let totalArticles;

  if (searchQuery.trim()) {
    initialArticles = searchArticles(searchQuery, 0, 1000).map((article) => ({
      ...article,
      relativeDate: formatRelativeTime(new Date(article.created_at)),
    }));
    totalArticles = getSearchResultCount(searchQuery);
  } else {
    initialArticles = getCachedArticles(0, 25).map((article) => ({
      ...article,
      relativeDate: formatRelativeTime(new Date(article.created_at)),
    }));
    totalArticles = getTotalArticleCount();
  }

  return c.html(
    <Layout title="hyperwave" lastUpdated={lastUpdated}>
      <div class="flex min-h-screen flex-col gap-2 p-4 text-base">
        <div class="w-full px-2">
          <div class="mb-4">
            <input
              type="text"
              name="q"
              value={searchQuery}
              placeholder="Search articles by title or source..."
              class="w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-white placeholder-gray-400 focus:border-teal-500 focus:outline-none"
              href="/"
              target="body"
              trigger="input"
              debounce="500"
              data-search-input="true"
              id="search-input"
            />
            {searchQuery && (
              <div class="mt-2">
                <div class="mb-2 text-sm text-gray-300">
                  Found {totalArticles} result{totalArticles !== 1 ? "s" : ""}{" "}
                  for "{searchQuery}"
                </div>
              </div>
            )}
          </div>
          <ul class="m-0 list-none p-0">
            {initialArticles.map((article) => (
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
          </ul>
          {!searchQuery && (
            <div
              id="articles"
              method="GET"
              href="/articles"
              trigger="scroll"
              debounce="1"
              target="#articles"
              class="w-full"
              limit="25"
              data-total={totalArticles.toString()}
            ></div>
          )}
        </div>
      </div>
    </Layout>,
  );
});

app.get("/status", async (c) => {
  const lastFetchTime = getLastFetchTime();
  const lastUpdatedDate = getLastUpdatedTimestamp();
  const shouldFetch = shouldFetchArticles();
  const now = new Date();

  return c.json({
    currentTime: now.toISOString(),
    lastFetchTime: lastFetchTime ? lastFetchTime.toISOString() : null,
    lastArticleTime: lastUpdatedDate ? lastUpdatedDate.toISOString() : null,
    shouldFetchArticles: shouldFetch,
    timeSinceLastFetch: lastFetchTime
      ? `${Math.floor((now.getTime() - lastFetchTime.getTime()) / (1000 * 60))} minutes ago`
      : "never",
    nextFetchAvailable: lastFetchTime
      ? new Date(lastFetchTime.getTime() + 10 * 60 * 1000).toISOString()
      : "now",
  });
});

articlesRoutes(app);

export default {
  port: process.env.PORT || 1234,
  fetch: app.fetch,
};
