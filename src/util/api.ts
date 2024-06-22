import { load } from "cheerio";
import { z } from "zod";

const articleSchema = z.object({
  title: z.string().min(5),
  link: z.string().url(),
  source: z.string(),
});

type NewsSource = {
  name: string;
  url: (page: number) => string;
  listSelector: string;
  baseUrl?: string;
};

const newsSources: NewsSource[] = [
  {
    name: "NPR",
    url: (page: number) => `http://text.npr.org?page=${page}`,
    listSelector: "ul > li > a",
    baseUrl: "http://text.npr.org",
  },
  {
    name: "Al Jazeera",
    url: (page: number) => `https://www.aljazeera.com/us-canada?page=${page}`,
    listSelector: "article .gc__content a",
    baseUrl: "https://www.aljazeera.com",
  },
];

const isValidArticle = (article: { title: string; link: string }) => {
  try {
    articleSchema.parse(article);
    return true;
  } catch (e) {
    return false;
  }
};

const fetchArticlesFromSource = async (
  source: NewsSource,
  page: number = 1,
) => {
  const response = await fetch(source.url(page));
  const text = await response.text();

  const $ = load(text);
  const articles: { title: string; link: string; source: string }[] = [];

  $(source.listSelector).each((_, element) => {
    const title = $(element).text().trim();
    const link = source.baseUrl
      ? `${source.baseUrl}${$(element).attr("href")}`
      : $(element).attr("href");

    if (title && link) {
      articles.push({
        title,
        link,
        source: source.name,
      });
    }
  });

  return articles.filter(isValidArticle);
};

export { fetchArticlesFromSource, isValidArticle, newsSources };
