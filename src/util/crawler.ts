import { load, type CheerioAPI, type Element } from "cheerio";
import { Article, isValidArticle } from "models/article";
import { log } from "util/log";
import {
  extractPublishedAtFromHtml,
  parsePublishedAt,
} from "util/publishedDate";
import { NewsSource } from "../models/newsSources";

export type FetchText = (url: string) => Promise<string>;

export interface FetchArticlesOptions {
  fetchText?: FetchText;
}

const defaultFetchText: FetchText = async (url) => {
  const response = await fetch(url);
  return response.text();
};

const listingPublishedAt = (
  $: CheerioAPI,
  element: Element,
  source: NewsSource,
): string | null => {
  if (!source.publishedAtSelector) {
    return null;
  }

  const dateElement = $(element).find(source.publishedAtSelector).first();
  const dateText = source.publishedAtAttribute
    ? dateElement.attr(source.publishedAtAttribute)
    : dateElement.text();

  return dateText ? parsePublishedAt(dateText) : null;
};

const detailPublishedAt = async (
  link: string,
  source: NewsSource,
  fetchText: FetchText,
): Promise<string | null> => {
  if (!source.detailPublishedAtSelector) {
    return null;
  }

  return extractPublishedAtFromHtml(await fetchText(link));
};

const buildArticle = async (
  $: CheerioAPI,
  element: Element,
  source: NewsSource,
  fetchText: FetchText,
): Promise<Article | null> => {
  const titleElement = source.titleSelector
    ? $(element).find(source.titleSelector)
    : $(element);
  const linkElement = source.linkSelector
    ? $(element).find(source.linkSelector).first()
    : $(element);
  const title = titleElement.text().trim();
  const relativeLink = linkElement.attr("href");

  if (!title || !relativeLink) {
    log(`*** MISSING INFO: ${source.name}: ${title} ${relativeLink}`);
    return null;
  }

  const link = new URL(relativeLink, source.baseUrl).href;
  const discoveredAt = new Date().toISOString();
  const publishedAt =
    listingPublishedAt($, element, source) ||
    (await detailPublishedAt(link, source, fetchText)) ||
    discoveredAt;

  const article: Article = {
    id: Bun.hash(title + link).toString(),
    title,
    link,
    source: source.name,
    created_at: discoveredAt,
    published_at: publishedAt,
  };

  if (!isValidArticle(article)) {
    log(`*** INVALID: ${source.name}: ${title} ${link}`);
    return null;
  }

  log(`*** NEW: ${source.name}: ${title} ${link}`);
  return article;
};

export const fetchArticlesFromSource = async (
  source: NewsSource,
  { fetchText = defaultFetchText }: FetchArticlesOptions = {},
): Promise<Article[]> => {
  log(`Fetching articles from: ${source.name}`);

  const text = await fetchText(source.url);

  log(`*** Fetched ${text.length} bytes from: ${source.name}`);
  const $ = load(text);

  const articles = (
    await Promise.all(
      $(source.listSelector)
        .slice(0, source.limit || 100)
        .toArray()
        .map((element) => buildArticle($, element, source, fetchText)),
    )
  ).filter((article): article is Article => Boolean(article));

  log(`*** Fetched ${articles.length} articles from: ${source.name}`);

  return articles;
};
