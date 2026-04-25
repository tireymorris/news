import { Hono } from "hono";
import { getCachedArticles } from "models/article";
import { debug } from "util/log";
import { formatRelativeTime } from "util/time";
import { styles } from "@/styles";

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
        <div class={styles.articles.emptyState}>
          End of archive
        </div>,
      );
    }

    return c.html(
      <ul class={styles.articles.list}>
        {articles.map((article, index) => (
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
      </ul>,
    );
  });
}