import { Hono } from "hono";
import { getCachedArticles } from "models/article";
import { debug } from "util/log";
import { formatRelativeTime } from "util/time";
import { styles, providerBadge } from "@/styles";

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
            class={`${styles.articles.item} ${styles.animations.signalReveal} ${styles.animations.stagger(index + 1)}`}
          >
            <div class={`${styles.articles.card} ${index % 2 === 0 ? 'article-card-odd' : 'article-card-even'}`}>
              <a
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                class={styles.articles.link}
              >
                <h2 class={styles.articles.title}>
                  {article.title}
                </h2>
              </a>
              <div class={styles.articles.meta}>
                <span class={styles.util.timestamp}>{article.relativeDate}</span>
                <span class={styles.header.dividerSm}></span>
                <span class={providerBadge(article.source)}>{article.source}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>,
    );
  });
}
