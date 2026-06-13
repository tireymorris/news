import ArticleList from "components/ArticleList";
import { Hono } from "hono";
import { getCachedArticles, toArticleListItem } from "models/article";
import { debug } from "util/log";
import { styles } from "@/styles";

export default function articlesRoutes(app: Hono) {
  app.get("/articles", async (c) => {
    debug("GET /articles - Start");

    const offset = parseInt(c.req.query("offset") || "0", 10);
    const limit = parseInt(c.req.query("limit") || "25", 10);

    debug("Offset:", offset);
    debug("Limit:", limit);

    const articles = getCachedArticles(offset, limit).map(toArticleListItem);

    debug("Articles retrieved:", articles.length);

    if (articles.length === 0) {
      return c.html(
        <div class={styles.articles.emptyState}>End of archive</div>,
      );
    }

    return c.html(<ArticleList items={articles} staggerOffset={offset} />);
  });
}
