import ArticleList from "components/ArticleList";
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
  ARTICLE_FETCH_INTERVAL_MS,
} from "util/time";
import {
  getCachedArticles,
  getTotalArticleCount,
  searchArticles,
  getSearchResultCount,
  toArticleListItem,
} from "models/article";
import { styles } from "@/styles";

const app = new Hono();

app.use("/styles/*", serveStatic({ root: "./public/" }));
app.use("/scripts/*", serveStatic({ root: "./public/" }));
app.use("*", logger());

app.get("/", async (c) => {
  const searchQuery = c.req.query("q") || "";

  const lastUpdatedDate = getLastUpdatedTimestamp();
  const lastUpdated = lastUpdatedDate
    ? formatRelativeTime(lastUpdatedDate)
    : null;

  let initialArticles;
  let totalArticles;

  if (searchQuery.trim()) {
    initialArticles = searchArticles(searchQuery, 0, 1000).map(toArticleListItem);
    totalArticles = getSearchResultCount(searchQuery);
  } else {
    initialArticles = getCachedArticles(0, 25).map(toArticleListItem);
    totalArticles = getTotalArticleCount();
  }

  return c.html(
    <Layout title="hyperwave" lastUpdated={lastUpdated}>
      <div class={styles.main.container}>
        <div class={styles.main.content}>
          <div class={styles.search.container}>
            <div class={styles.search.wrapper}>
              <span class={styles.search.prompt}>&gt;</span>
              <input
                type="text"
                name="q"
                value={searchQuery}
                placeholder="Search the archive..."
                class={styles.search.input}
                href="/"
                target="body"
                trigger="input"
                debounce="500"
                data-search-input="true"
                id="search-input"
              />
              <span class={styles.search.cursor}>_</span>
            </div>
            {searchQuery.trim() && (
              <div class={styles.search.resultsContainer}>
                <div class={styles.search.resultsText}>
                  {totalArticles} article{totalArticles !== 1 ? "s" : ""} matching "{searchQuery.trim()}"
                </div>
              </div>
            )}
          </div>
          <ArticleList items={initialArticles} />
          {!searchQuery.trim() && (
            <div
              id="articles"
              method="GET"
              href="/articles"
              trigger="scroll"
              debounce="1"
              target="#articles"
              class={styles.articles.infiniteScroll}
              limit="25"
              offset={initialArticles.length}
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
      ? new Date(
          lastFetchTime.getTime() + ARTICLE_FETCH_INTERVAL_MS,
        ).toISOString()
      : "now",
  });
});

articlesRoutes(app);

export default {
  port: process.env.PORT || 1234,
  fetch: app.fetch,
};
