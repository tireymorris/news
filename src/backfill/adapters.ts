import { load } from "cheerio";
import { Article, isValidArticle } from "models/article";
import { extractPublishedAtFromHtml } from "util/publishedDate";

export type FetchText = (url: string) => Promise<string>;

export interface ApBackfillProgress {
  processedUrls: number;
  totalUrls: number;
  matchedArticles: number;
}

export interface BackfillRequest {
  date: string;
  fetchText?: FetchText;
  sleepMs?: number;
  sleep?: (milliseconds: number) => Promise<void>;
}

export interface BackfillAdapter {
  name: string;
  fetchArticles: (request: BackfillRequest) => Promise<Article[]>;
}

const FETCH_TIMEOUT_MS = 15000;

const defaultSleep = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

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
  fetchArticles: async ({
    date,
    fetchText = defaultFetchText,
    sleepMs = 0,
    sleep = defaultSleep,
  }) => {
    const html = await fetchText(nprArchiveUrl(date));
    const $ = load(html);
    const articles: Article[] = [];
    const archiveArticles = $("article").toArray();

    for (const [index, element] of archiveArticles.entries()) {
      const linkElement = $(element).find("h2.title a[href*='/20']").first();
      const title = linkElement.text().trim();
      const href = linkElement.attr("href");
      const archiveDate = $(element).find("time[datetime]").attr("datetime");

      if (!title || !href || !archiveDate?.startsWith(date)) {
        continue;
      }

      const link = new URL(href, "https://www.npr.org").href;
      let publishedAt: string | null = null;
      try {
        publishedAt = extractPublishedAtFromHtml(await fetchText(link));
      } catch (error) {
        console.error(`Skipping NPR backfill detail page ${link}: ${error}`);
        continue;
      }

      if (!publishedAt?.startsWith(date)) {
        continue;
      }

      const article = articleFrom(title, link, "NPR", publishedAt);

      if (article) {
        articles.push(article);
      }

      if (sleepMs > 0 && index < archiveArticles.length - 1) {
        await sleep(sleepMs);
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

const countApArticleUrls = (xml: string): number => {
  const $ = load(xml, { xmlMode: true });
  return $("url")
    .toArray()
    .filter((element) => $(element).find("loc").first().text().includes("/article/"))
    .length;
};

const reportApProgress = (
  progress: ApBackfillProgress,
  onProgress?: (progress: ApBackfillProgress) => void,
) => {
  if (
    progress.processedUrls === 1 ||
    progress.processedUrls % 50 === 0 ||
    progress.processedUrls === progress.totalUrls
  ) {
    onProgress?.(progress);
  }
};

const parseApSitemapArticles = async (
  xml: string,
  publishedOn: (publishedAt: string) => boolean,
  fetchText: FetchText,
  sleepMs: number,
  sleep: (milliseconds: number) => Promise<void>,
  progress?: ApBackfillProgress,
  onProgress?: (progress: ApBackfillProgress) => void,
): Promise<Article[]> => {
  const $ = load(xml, { xmlMode: true });
  const articles: Article[] = [];
  const sitemapArticles = $("url").toArray();

  for (const [index, element] of sitemapArticles.entries()) {
    const loc = $(element).find("loc").first().text().trim();
    const sitemapTitle = $(element)
      .find("news\\:title, title")
      .first()
      .text()
      .trim();

    if (!loc.includes("/article/")) {
      continue;
    }

    let publishedAt: string | null = null;
    try {
      publishedAt = extractPublishedAtFromHtml(await fetchText(loc));
    } catch (error) {
      if (progress) {
        progress.processedUrls += 1;
        reportApProgress(progress, onProgress);
      }
      console.error(`Skipping AP backfill detail page ${loc}: ${error}`);
      continue;
    }

    if (progress) {
      progress.processedUrls += 1;
    }

    if (!publishedAt || !publishedOn(publishedAt)) {
      if (progress) {
        reportApProgress(progress, onProgress);
      }
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
      if (progress) {
        progress.matchedArticles += 1;
      }
    }

    if (progress) {
      reportApProgress(progress, onProgress);
    }

    if (sleepMs > 0 && index < sitemapArticles.length - 1) {
      await sleep(sleepMs);
    }
  }

  return articles;
};

const parseApSitemap = async (
  xml: string,
  date: string,
  fetchText: FetchText,
  sleepMs: number,
  sleep: (milliseconds: number) => Promise<void>,
): Promise<Article[]> =>
  parseApSitemapArticles(
    xml,
    (publishedAt) => publishedAt.startsWith(date),
    fetchText,
    sleepMs,
    sleep,
  );

export const fetchApArticlesForMonth = async ({
  month,
  fetchText = defaultFetchText,
  sleepMs = 0,
  sleep = defaultSleep,
  onProgress,
}: {
  month: string;
  fetchText?: FetchText;
  sleepMs?: number;
  sleep?: (milliseconds: number) => Promise<void>;
  onProgress?: (progress: ApBackfillProgress) => void;
}): Promise<Article[]> => {
  const indexXml = await fetchText("https://apnews.com/sitemap.xml");
  const sitemapUrls = parseApSitemapIndex(indexXml, `${month}-01`);
  const sitemapXmls: string[] = [];

  for (const sitemapUrl of sitemapUrls) {
    sitemapXmls.push(await fetchText(sitemapUrl));
  }

  const progress: ApBackfillProgress = {
    processedUrls: 0,
    totalUrls: sitemapXmls.reduce(
      (total, xml) => total + countApArticleUrls(xml),
      0,
    ),
    matchedArticles: 0,
  };

  if (progress.totalUrls > 0) {
    onProgress?.(progress);
  }

  const articles: Article[] = [];

  for (const sitemapXml of sitemapXmls) {
    articles.push(
      ...(await parseApSitemapArticles(
        sitemapXml,
        (publishedAt) => publishedAt.startsWith(month),
        fetchText,
        sleepMs,
        sleep,
        progress,
        onProgress,
      )),
    );
  }

  return articles;
};

export const hasApSitemapForMonth = async (
  month: string,
  fetchText: FetchText = defaultFetchText,
): Promise<boolean> => {
  const indexXml = await fetchText("https://apnews.com/sitemap.xml");
  return parseApSitemapIndex(indexXml, `${month}-01`).length > 0;
};

export const apNewsBackfillAdapter: BackfillAdapter = {
  name: "AP News",
  fetchArticles: async ({
    date,
    fetchText = defaultFetchText,
    sleepMs = 0,
    sleep = defaultSleep,
  }) => {
    const indexXml = await fetchText("https://apnews.com/sitemap.xml");
    const sitemapUrls = parseApSitemapIndex(indexXml, date);
    const articles: Article[] = [];

    for (const sitemapUrl of sitemapUrls) {
      articles.push(
        ...(await parseApSitemap(
          await fetchText(sitemapUrl),
          date,
          fetchText,
          sleepMs,
          sleep,
        )),
      );
    }

    return articles;
  },
};

export const backfillAdapters = [nprBackfillAdapter, apNewsBackfillAdapter];
