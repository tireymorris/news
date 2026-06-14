import { load } from "cheerio";
import type { Article } from "models/article";
import {
  extractPublishedAtFromHtml,
  extractTitleFromHtml,
} from "util/publishedDate";
import {
  backfillFetchText,
  defaultSleep,
  fetchTextWithRetry,
  type FetchText,
} from "../fetch";
import { articleFrom } from "./article";
import type { BackfillCapabilities } from "../../providers/types";

export const AP_EARLIEST_MONTH = "2006-02";

const AP_NON_STORY_PATH_PREFIXES = new Set([
  "author",
  "hub",
  "video",
  "photo",
  "gallery",
  "podcast",
  "live",
  "topic",
  "search",
]);

export const isApStorySitemapUrl = (url: string): boolean => {
  let pathname: string;

  try {
    pathname = new URL(url).pathname;
  } catch {
    return false;
  }

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) {
    return false;
  }

  if (AP_NON_STORY_PATH_PREFIXES.has(segments[0])) {
    return false;
  }

  if (segments[0] === "article") {
    return segments.length >= 2 && !isApSyndicationArticle(url);
  }

  if (segments.length === 1) {
    return !isApSyndicationArticle(url);
  }

  return false;
};

const sitemapMonthKey = (url: string): string | null => {
  const match = url.match(/ap-sitemap-(\d{6})\.xml/);
  return match?.[1] ?? null;
};

export const parseApSitemapIndex = (xml: string, date: string): string[] => {
  const monthKey = date.slice(0, 7).replace("-", "");
  const yearKey = date.slice(0, 4);
  const $ = load(xml, { xmlMode: true });

  const sitemapUrls = $("sitemap > loc")
    .map((_, element) => $(element).text().trim())
    .get();

  const monthUrls = sitemapUrls.filter((url) => url.includes(monthKey));
  if (monthUrls.length > 0) {
    return monthUrls;
  }

  return sitemapUrls.filter((url) => {
    const key = sitemapMonthKey(url);
    return key?.startsWith(yearKey) ?? false;
  });
};

export const parseApSitemapIndexForMonth = (
  xml: string,
  month: string,
): string[] => {
  const monthKey = month.replace("-", "");
  const $ = load(xml, { xmlMode: true });

  return $("sitemap > loc")
    .map((_, element) => $(element).text().trim())
    .get()
    .filter((url) => url.includes(monthKey));
};

const AP_SYNDICATION_SLUG_MARKERS = [
  "mens-college-basketball",
  "womens-college-basketball",
  "college-sports",
  "college-football",
  "college-basketball",
  "high-school-football",
  "high-school-basketball",
  "state-wire",
  "premier-league",
  "serie-a",
  "bundesliga",
  "ligue-1",
  "champions-league",
  "formula-uno",
  "formula-one",
  "lpga-tour",
  "lpga-",
  "nfl-",
  "-nfl-",
  "nba-",
  "-nba-",
  "nhl-",
  "mlb-",
  "uefa-",
  "copa-libertadores",
  "copa-del-rey",
  "super-lig",
  "-score-",
  "-scores-",
];

export const isApSyndicationArticle = (url: string): boolean => {
  const slug =
    new URL(url).pathname.split("/").filter(Boolean).at(-1)?.toLowerCase() ??
    "";

  return AP_SYNDICATION_SLUG_MARKERS.some((marker) => slug.includes(marker));
};

export const titleFromApUrl = (url: string): string => {
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
    .filter((element) => {
      const loc = $(element).find("loc").first().text().trim();
      return isApStorySitemapUrl(loc);
    })
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
  sourceName: string,
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
    if (!isApStorySitemapUrl(loc)) {
      continue;
    }

    let publishedAt: string | null = null;
    let detailTitle: string | null = null;
    try {
      const html = await fetchTextWithRetry(fetchText, loc, sleep);
      publishedAt = extractPublishedAtFromHtml(html);
      detailTitle = extractTitleFromHtml(html);
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
      detailTitle || sitemapTitle || titleFromApUrl(loc),
      loc,
      sourceName,
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

export const fetchApArticlesForMonth = async ({
  month,
  fetchText = backfillFetchText,
  sleepMs = 0,
  sleep = defaultSleep,
  onProgress,
  sourceName = "AP News",
}: {
  month: string;
  fetchText?: FetchText;
  sleepMs?: number;
  sleep?: (milliseconds: number) => Promise<void>;
  onProgress?: (progress: ApBackfillProgress) => void;
  sourceName?: string;
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
        sourceName,
        progress,
        onProgress,
      )),
    );
  }

  return articles;
};

export const hasDedicatedApSitemapForMonth = async (
  month: string,
  fetchText: FetchText = backfillFetchText,
): Promise<boolean> => {
  const indexXml = await fetchText("https://apnews.com/sitemap.xml");
  return parseApSitemapIndexForMonth(indexXml, month).length > 0;
};

export const hasApSitemapForMonth = async (
  month: string,
  fetchText: FetchText = backfillFetchText,
): Promise<boolean> => {
  const indexXml = await fetchText("https://apnews.com/sitemap.xml");
  return parseApSitemapIndex(indexXml, `${month}-01`).length > 0;
};

type ApMonthCacheEntry =
  | { status: "resolved"; value: boolean }
  | { status: "error"; failedAt: number };

const apAttemptCache = new Map<string, ApMonthCacheEntry>();
const apRequirementCache = new Map<string, ApMonthCacheEntry>();
const AP_SITEMAP_ERROR_RETRY_MS = 300000;
const apMonthArticlesCache = new Map<string, Promise<Article[]>>();

export const clearApRequirementCache = () => {
  apAttemptCache.clear();
  apRequirementCache.clear();
};

export const clearApMonthArticlesCache = () => {
  apMonthArticlesCache.clear();
};

const readApMonthCache = (
  cache: Map<string, ApMonthCacheEntry>,
  month: string,
  now: number,
): boolean | null => {
  const cached = cache.get(month);

  if (cached?.status === "resolved") {
    return cached.value;
  }

  if (
    cached?.status === "error" &&
    now - cached.failedAt < AP_SITEMAP_ERROR_RETRY_MS
  ) {
    return false;
  }

  return null;
};

const resolveApMonthFlag = async (
  cache: Map<string, ApMonthCacheEntry>,
  month: string,
  resolve: (month: string, fetchText: FetchText) => Promise<boolean>,
  fetchText: FetchText,
): Promise<boolean> => {
  if (month < AP_EARLIEST_MONTH) {
    return false;
  }

  const now = Date.now();
  const cached = readApMonthCache(cache, month, now);
  if (cached !== null) {
    return cached;
  }

  try {
    const value = await resolve(month, fetchText);
    cache.set(month, { status: "resolved", value });
    return value;
  } catch {
    cache.set(month, { status: "error", failedAt: now });
    return false;
  }
};

export const shouldAttemptAp = async (
  month: string,
  fetchText: FetchText = backfillFetchText,
): Promise<boolean> =>
  resolveApMonthFlag(apAttemptCache, month, hasApSitemapForMonth, fetchText);

export const resolveApRequirement = async (
  month: string,
  fetchText: FetchText = backfillFetchText,
): Promise<boolean> =>
  resolveApMonthFlag(
    apRequirementCache,
    month,
    hasDedicatedApSitemapForMonth,
    fetchText,
  );

const editorialApArticlesForMonth = async ({
  month,
  fetchText = backfillFetchText,
  sleepMs = 0,
  sleep = defaultSleep,
  onProgress,
  sourceName = "AP News",
}: {
  month: string;
  fetchText?: FetchText;
  sleepMs?: number;
  sleep?: (milliseconds: number) => Promise<void>;
  onProgress?: (progress: ApBackfillProgress) => void;
  sourceName?: string;
}): Promise<Article[]> => {
  const articles = await fetchApArticlesForMonth({
    month,
    fetchText,
    sleepMs,
    sleep,
    onProgress,
    sourceName,
  });

  return articles.filter((article) => !isApSyndicationArticle(article.link));
};

export const createApNewsBackfill = (
  sourceName: string,
): BackfillCapabilities => ({
  progressLabel: "AP scan",
  shouldAttempt: shouldAttemptAp,
  requireCoverage: resolveApRequirement,
  clearCaches: () => {
    clearApRequirementCache();
    clearApMonthArticlesCache();
  },
  fetchMonth: async (month, options) =>
    editorialApArticlesForMonth({
      month,
      fetchText: options.fetchText,
      sleepMs: options.sleepMs,
      sleep: options.sleep,
      onProgress: options.onProgress,
      sourceName,
    }),
  fetchArticles: async ({
    date,
    fetchText = backfillFetchText,
    sleepMs = 0,
    sleep = defaultSleep,
    onProgress,
  }) => {
    const month = date.slice(0, 7);
    let monthArticles = apMonthArticlesCache.get(`${sourceName}:${month}`);

    if (!monthArticles) {
      monthArticles = editorialApArticlesForMonth({
        month,
        fetchText,
        sleepMs,
        sleep,
        onProgress,
        sourceName,
      });
      apMonthArticlesCache.set(`${sourceName}:${month}`, monthArticles);
    }

    const articles = await monthArticles;
    return articles.filter((article) => article.published_at?.startsWith(date));
  },
});

export const apNewsProvider = createApNewsBackfill("AP News");

export const apNewsBackfillAdapter = apNewsProvider;
