import { load } from "cheerio";
import { Article, isValidArticle } from "models/article";
import {
  extractPublishedAtFromHtml,
  parsePublishedAt,
} from "util/publishedDate";

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
const FETCH_RETRY_ATTEMPTS = 3;

const defaultSleep = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

const retryDelayMs = (attempt: number): number =>
  Math.min(5000 * 2 ** Math.max(attempt - 1, 0), 30000);

const isTransientFetchError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("TimeoutError") ||
    message.includes("Unable to connect") ||
    message.includes("typo in the url") ||
    message.includes("ECONNRESET") ||
    message.includes("connection")
  );
};

const fetchTextWithRetry = async (
  fetchText: FetchText,
  url: string,
  sleep: (milliseconds: number) => Promise<void> = defaultSleep,
): Promise<string> => {
  let lastError: unknown;

  for (let attempt = 1; attempt <= FETCH_RETRY_ATTEMPTS; attempt++) {
    try {
      return await fetchText(url);
    } catch (error) {
      lastError = error;
      if (attempt < FETCH_RETRY_ATTEMPTS && isTransientFetchError(error)) {
        await sleep(retryDelayMs(attempt));
        continue;
      }

      throw error;
    }
  }

  throw lastError;
};

const archiveNeedsDetailDate = (archiveDate: string): boolean =>
  !archiveDate.includes("T");

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
    const html = await fetchTextWithRetry(
      fetchText,
      nprArchiveUrl(date),
      sleep,
    );
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
      let publishedAt = parsePublishedAt(archiveDate);
      let detailFetched = false;

      if (!publishedAt?.startsWith(date)) {
        continue;
      }

      if (archiveNeedsDetailDate(archiveDate)) {
        try {
          const detailPublishedAt = extractPublishedAtFromHtml(
            await fetchTextWithRetry(fetchText, link, sleep),
          );
          detailFetched = true;

          if (detailPublishedAt?.startsWith(date)) {
            publishedAt = detailPublishedAt;
          }
        } catch {
          // Keep the archive listing timestamp when detail pages are unavailable.
        }
      }

      const article = articleFrom(title, link, "NPR", publishedAt);

      if (article) {
        articles.push(article);
      }

      if (detailFetched && sleepMs > 0 && index < archiveArticles.length - 1) {
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
      publishedAt = extractPublishedAtFromHtml(
        await fetchTextWithRetry(fetchText, loc, sleep),
      );
    } catch {
      if (progress) {
        progress.processedUrls += 1;
        reportApProgress(progress, onProgress);
      }
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

type ApMonthCacheEntry =
  | { status: "resolved"; requireAp: boolean }
  | { status: "error"; failedAt: number };

const apMonthCache = new Map<string, ApMonthCacheEntry>();
const AP_SITEMAP_ERROR_RETRY_MS = 300000;

export const clearApRequirementCache = () => {
  apMonthCache.clear();
};

export const resolveApRequirement = async (
  month: string,
  fetchText: FetchText = defaultFetchText,
): Promise<boolean> => {
  const cached = apMonthCache.get(month);
  const now = Date.now();

  if (cached?.status === "resolved") {
    return cached.requireAp;
  }

  if (
    cached?.status === "error" &&
    now - cached.failedAt < AP_SITEMAP_ERROR_RETRY_MS
  ) {
    return false;
  }

  try {
    const requireAp = await hasApSitemapForMonth(month, fetchText);
    apMonthCache.set(month, { status: "resolved", requireAp });
    return requireAp;
  } catch {
    apMonthCache.set(month, { status: "error", failedAt: now });
    return false;
  }
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
