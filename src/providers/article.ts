import { Article, isValidArticle } from "models/article";

export const articleId = (title: string, link: string) =>
  Bun.hash(title + link).toString();

export const articleFrom = (
  title: string,
  link: string,
  source: string,
  publishedAt: string,
): Article | null => {
  const date = new Date(publishedAt);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const article = {
    id: articleId(title, link),
    title,
    link,
    source,
    created_at: new Date().toISOString(),
    published_at: date.toISOString(),
  };

  return isValidArticle(article) ? article : null;
};
