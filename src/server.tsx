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
import { styles } from "@/styles";

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
      <div class={styles.main.container}>
        <div class={styles.main.content}>
          <div class={styles.search.container}>
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
            {searchQuery && (
              <div class={styles.search.resultsContainer}>
                <div class={styles.search.resultsText}>
                  {totalArticles} article{totalArticles !== 1 ? "s" : ""} matching "{searchQuery}"
                </div>
              </div>
            )}
          </div>
          <ul class={styles.articles.list}>
            {initialArticles.map((article, index) => (
              <li 
                key={article.id} 
                class={`${styles.articles.item} article-reveal stagger-${Math.min(index + 1, 10)}`}
              >
                <div class={styles.articles.card}>
                  <a
                    href={article.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    class={styles.articles.link}
                  >
                    <h2 class="text-xl md:text-2xl font-serif font-bold leading-tight group-hover:text-primary transition-colors duration-300">
                      {article.title}
                    </h2>
                  </a>
                  <div class={styles.articles.meta}>
                    <span class="date-stamp">{article.relativeDate}</span>
                    <span class="w-px h-3 bg-border"></span>
                    <span class="source-tag">{article.source}</span>
                  </div>
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
      ? new Date(lastFetchTime.getTime() + 10 * 60 * 1000).toISOString()
      : "now",
  });
});

articlesRoutes(app);

export default {
  port: process.env.PORT || 1234,
  fetch: app.fetch,
};
