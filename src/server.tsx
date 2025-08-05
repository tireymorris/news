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
import { fetchAndStoreArticles, getCachedArticles } from "models/article";
import { debug } from "util/log";

const app = new Hono();

app.use("/styles/*", serveStatic({ root: "./public/" }));
app.use("/scripts/*", serveStatic({ root: "./public/" }));
app.use("*", logger());

app.get("/", async (c) => {
  const shouldFetch = shouldFetchArticles();
  const lastFetchTime = getLastFetchTime();

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

  const initialArticles = getCachedArticles(0, 100).map((article) => ({
    ...article,
    relativeDate: formatRelativeTime(new Date(article.created_at)),
  }));

  return c.html(
    <Layout title="hyperwave" lastUpdated={lastUpdated}>
      <div class="flex min-h-screen flex-col gap-2 p-4 text-base">
        <div class="w-full px-2">
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
          <div
            id="articles"
            method="GET"
            href="/articles"
            trigger="scroll"
            debounce="1"
            target="#articles"
            class="w-full"
            limit="25"
            data-total="1000"
            offset="100"
          ></div>
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
