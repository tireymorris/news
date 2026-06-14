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
import type { ApBackfillProgress, BackfillAdapter } from "./types";

export const parseApSitemapIndex = (xml: string, date: string): string[] => {
  const monthKey = date.slice(0, 7).replace("-", "");
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
      const loc = $(element).find("loc").first().text();
      return loc.includes("/article/") && !isApSyndicationArticle(loc);
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
    if (!loc.includes("/article/") || isApSyndicationArticle(loc)) {
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

export const fetchApArticlesForMonth = async ({
  month,
  fetchText = backfillFetchText,
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
  fetchText: FetchText = backfillFetchText,
): Promise<boolean> => {
  const indexXml = await fetchText("https://apnews.com/sitemap.xml");
  return parseApSitemapIndex(indexXml, `${month}-01`).length > 0;
};

type ApMonthCacheEntry =
  | { status: "resolved"; requireAp: boolean }
  | { status: "error"; failedAt: number };

const apMonthCache = new Map<string, ApMonthCacheEntry>();
const AP_SITEMAP_ERROR_RETRY_MS = 300000;
const apMonthArticlesCache = new Map<string, Promise<Article[]>>();

export const clearApRequirementCache = () => {
  apMonthCache.clear();
};

export const clearApMonthArticlesCache = () => {
  apMonthArticlesCache.clear();
};

export const resolveApRequirement = async (
  month: string,
  fetchText: FetchText = backfillFetchText,
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

const editorialApArticlesForMonth = async ({
  month,
  fetchText = backfillFetchText,
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
  const articles = await fetchApArticlesForMonth({
    month,
    fetchText,
    sleepMs,
    sleep,
    onProgress,
  });

  return articles.filter((article) => !isApSyndicationArticle(article.link));
};

export const apNewsBackfillAdapter: BackfillAdapter = {
  name: "AP News",
  fetchArticles: async ({
    date,
    fetchText = backfillFetchText,
    sleepMs = 0,
    sleep = defaultSleep,
    onApProgress,
  }) => {
    const month = date.slice(0, 7);
    let monthArticles = apMonthArticlesCache.get(month);

    if (!monthArticles) {
      monthArticles = editorialApArticlesForMonth({
        month,
        fetchText,
        sleepMs,
        sleep,
        onProgress: onApProgress,
      });
      apMonthArticlesCache.set(month, monthArticles);
    }

    const articles = await monthArticles;
    return articles.filter((article) => article.published_at?.startsWith(date));
  },
};
