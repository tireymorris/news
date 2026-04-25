import { styles, providerBadge } from "@/styles";

export type ArticleListItem = {
  id: string;
  title: string;
  link: string;
  source: string;
  relativeDate: string;
};

type ArticleListProps = {
  items: ArticleListItem[];
  /** Base index for stagger animation (e.g. pagination offset). */
  staggerOffset?: number;
};

export default function ArticleList({
  items,
  staggerOffset = 0,
}: ArticleListProps) {
  return (
    <ul class={styles.articles.list}>
      {items.map((article, index) => (
        <li
          key={article.id}
          class={`${styles.articles.item} ${styles.animations.signalReveal} ${styles.animations.stagger(staggerOffset + index + 1)}`}
        >
          <div
            class={`${styles.articles.card} ${(staggerOffset + index) % 2 === 0 ? "article-card-odd" : "article-card-even"}`}
          >
            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              class={styles.articles.link}
            >
              <h2 class={styles.articles.title}>{article.title}</h2>
            </a>
            <div class={styles.articles.meta}>
              <span class={styles.util.timestamp}>{article.relativeDate}</span>
              <span class={styles.header.dividerSm}></span>
              <span class={providerBadge(article.source)}>{article.source}</span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
