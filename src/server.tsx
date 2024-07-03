import Layout from "components/Layout";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { serveStatic } from "hono/bun";
import articlesRoutes from "routes/articles";
import { formatRelativeTime, getLastUpdatedTimestamp } from "util/time";

const app = new Hono();

app.use("/styles/*", serveStatic({ root: "./public/" }));
app.use("/scripts/*", serveStatic({ root: "./public/" }));
app.use("*", logger());

app.get("/", async (c) => {
  const lastUpdatedDate = getLastUpdatedTimestamp();
  const lastUpdated = lastUpdatedDate
    ? formatRelativeTime(lastUpdatedDate)
    : null;

  return c.html(
    <Layout title="hyperwave" lastUpdated={lastUpdated}>
      <div class="flex flex-col items-center gap-2 p-4 min-h-screen text-base">
        <div
          id="articles"
          liteswap
          method="GET"
          href="/articles"
          trigger="DOMContentLoaded"
          target="#articles"
          limit="15"
          offset="0"
          class="w-full px-2"
        ></div>
        <div
          liteswap
          method="GET"
          href="/articles"
          trigger="scroll"
          target="#articles"
          limit="15"
          offset="15"
          debounce="200"
          class="w-full"
        ></div>
      </div>
    </Layout>,
  );
});

articlesRoutes(app);

export default {
  port: process.env.PORT || 1234,
  fetch: app.fetch,
};
