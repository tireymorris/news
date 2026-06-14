import { load } from "cheerio";
import {
  backfillFetchText,
  defaultSleep,
  fetchTextWithRetry,
} from "../fetch";
import {
  extractPublishedAtFromHtml,
  parsePublishedAt,
} from "util/publishedDate";
import { articleFrom } from "./article";
import type { BackfillCapabilities } from "../../providers/types";

const archiveNeedsDetailDate = (archiveDate: string): boolean =>
  !archiveDate.includes("T");

const nprArchiveUrl = (date: string) => {
  const [year, month, day] = date.split("-");
  return `https://www.npr.org/sections/news/archive?date=${Number(month)}-${Number(day)}-${year}`;
};

export const createNprBackfill = (
  sourceName: string,
): BackfillCapabilities => ({
  fetchArticles: fetchNprArticles(sourceName),
});

const fetchNprArticles =
  (sourceName: string): BackfillCapabilities["fetchArticles"] =>
  async ({
  date,
  fetchText = backfillFetchText,
  sleepMs = 0,
  sleep = defaultSleep,
}) => {
    const html = await fetchTextWithRetry(
      fetchText,
      nprArchiveUrl(date),
      sleep,
    );
    const $ = load(html);
    const articles = [];
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

      const article = articleFrom(title, link, sourceName, publishedAt);

      if (article) {
        articles.push(article);
      }

      if (detailFetched && sleepMs > 0 && index < archiveArticles.length - 1) {
        await sleep(sleepMs);
      }
    }

    return articles;
  };

export const nprProvider = createNprBackfill("NPR");

export const nprBackfillAdapter = nprProvider;
