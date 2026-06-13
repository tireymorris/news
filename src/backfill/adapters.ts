import { load } from "cheerio";
import { Article, isValidArticle } from "models/article";
import { extractPublishedAtFromHtml } from "util/publishedDate";

export type FetchText = (url: string) => Promise<string>;

export interface BackfillRequest {
  date: string;
  fetchText?: FetchText;
}

export interface BackfillAdapter {
  name: string;
  fetchArticles: (request: BackfillRequest) => Promise<Article[]>;
}

const FETCH_TIMEOUT_MS = 15000;

const defaultFetchText: FetchText = async (url) => {
  const response = await fetch(url, {
    headers: { "User-Agent": "hyperwave-backfill/0.1" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return response.text();
};

const articleId = (title: string, link: string) =>
  Bun.hash(title + link).toString();

const articleFrom = (
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

const nprArchiveUrl = (date: string) => {
  const [year, month, day] = date.split("-");
  return `https://www.npr.org/sections/news/archive?date=${Number(month)}-${Number(day)}-${year}`;
};

export const nprBackfillAdapter: BackfillAdapter = {
  name: "NPR",
  fetchArticles: async ({ date, fetchText = defaultFetchText }) => {
    const html = await fetchText(nprArchiveUrl(date));
    const $ = load(html);
    const articles: Article[] = [];

    for (const element of $("article").toArray()) {
      const linkElement = $(element).find("h2.title a[href*='/20']").first();
      const title = linkElement.text().trim();
      const href = linkElement.attr("href");
      const archiveDate = $(element).find("time[datetime]").attr("datetime");

      if (!title || !href || !archiveDate?.startsWith(date)) {
        continue;
      }

      const link = new URL(href, "https://www.npr.org").href;
      const publishedAt = extractPublishedAtFromHtml(await fetchText(link));
      if (!publishedAt?.startsWith(date)) {
        continue;
      }

      const article = articleFrom(title, link, "NPR", publishedAt);

      if (article) {
        articles.push(article);
      }
    }

    return articles;
  },
};

export const parseApSitemapIndex = (xml: string, date: string): string[] => {
  const monthKey = date.slice(0, 7).replace("-", "");
  const $ = load(xml, { xmlMode: true });

  return $("sitemap > loc")
    .map((_, element) => $(element).text().trim())
    .get()
    .filter((url) => url.includes(monthKey));
};

const titleFromApUrl = (url: string): string => {
  const slug = new URL(url).pathname.split("/").filter(Boolean).at(-1) || "";
  const words = slug.split("-").filter((word) => !/^[a-f0-9]{6,}$/i.test(word));

  return words
    .map((word) => {
      if (word.toLowerCase() === "ap") {
        return "AP";
      }

      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
};

const parseApSitemap = async (
  xml: string,
  date: string,
  fetchText: FetchText,
): Promise<Article[]> => {
  const $ = load(xml, { xmlMode: true });
  const articles: Article[] = [];

  for (const element of $("url").toArray()) {
    const loc = $(element).find("loc").first().text().trim();
    const sitemapDate = $(element).find("lastmod").first().text().trim();
    const sitemapTitle = $(element)
      .find("news\\:title, title")
      .first()
      .text()
      .trim();

    if (!loc.includes("/article/") || !sitemapDate.startsWith(date)) {
      continue;
    }

    const publishedAt = extractPublishedAtFromHtml(await fetchText(loc));
    if (!publishedAt?.startsWith(date)) {
      continue;
    }

    const article = articleFrom(
      sitemapTitle || titleFromApUrl(loc),
      loc,
      "AP News",
      publishedAt,
    );
    if (article) {
      articles.push(article);
    }
  }

  return articles;
};

export const apNewsBackfillAdapter: BackfillAdapter = {
  name: "AP News",
  fetchArticles: async ({ date, fetchText = defaultFetchText }) => {
    const indexXml = await fetchText("https://apnews.com/sitemap.xml");
    const sitemapUrls = parseApSitemapIndex(indexXml, date);
    const articles: Article[] = [];

    for (const sitemapUrl of sitemapUrls) {
      articles.push(
        ...(await parseApSitemap(await fetchText(sitemapUrl), date, fetchText)),
      );
    }

    return articles;
  },
};

export const backfillAdapters = [nprBackfillAdapter, apNewsBackfillAdapter];
