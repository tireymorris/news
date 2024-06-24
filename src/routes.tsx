import { Hono } from "hono";
import { getCachedArticles } from "./util/api.ts";
import { formatRelativeTime, getLastUpdatedTimestamp } from "./util/time.ts";
import Layout from "./components/Layout.tsx";
import { debug } from "./util/log.ts";

export const routes = (app: Hono) => {
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
            hx-get="/articles?page=1"
            hx-trigger="load"
            hx-swap="beforeend"
            class="w-full px-2"
          ></div>
        </div>
      </Layout>,
    );
  });

  app.get("/articles", async (c) => {
    debug("GET /articles - Start");

    const page = parseInt(c.req.query("page") || "1");
    const articlesPerPage = 15;
    const offset = (page - 1) * articlesPerPage;

    debug("Page:", page);

    const articles = getCachedArticles(offset, articlesPerPage).map(
      (article) => ({
        ...article,
        relativeDate: formatRelativeTime(new Date(article.created_at)),
      }),
    );
    debug("Articles retrieved:", articles.length);

    const nextPage = page + 1;

    return c.html(
      <ul class="list-none m-0 p-0">
        {articles.map((article) => (
          <li key={article.id} class="p-0 m-0 border-b list-none mb-1">
            <a
              href={article.link}
              class="text-teal-500 hover:underline visited:text-purple-600"
            >
              {article.title}
            </a>
            <div class="text-gray-500 text-sm">
              {article.relativeDate} - {article.source}
            </div>
          </li>
        ))}
        {articles.length > 0 && (
          <div
            hx-get={`/articles?page=${nextPage}`}
            hx-trigger="intersect once"
            hx-swap="beforeend"
          ></div>
        )}
      </ul>,
    );
  });
};
