import { load } from "cheerio";

const parseDate = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const timestamp = Number(trimmed);
  const date = new Date(
    Number.isFinite(timestamp) && trimmed.length >= 10
      ? timestamp
      : trimmed.replace("•", ""),
  );

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
};

const decodeHtml = (value: string): string =>
  load(`<textarea>${value}</textarea>`)("textarea").text();

const textFromJsonLd = (value: unknown, field: string): string | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const text = textFromJsonLd(item, field);
      if (text) {
        return text;
      }
    }
    return null;
  }

  const record = value as Record<string, unknown>;
  const direct = record[field];
  if (typeof direct === "string" && direct.trim()) {
    return decodeHtml(direct.trim());
  }

  for (const nested of Object.values(record)) {
    const text = textFromJsonLd(nested, field);
    if (text) {
      return text;
    }
  }

  return null;
};

const dateFromJsonLd = (value: unknown): string | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const date = dateFromJsonLd(item);
      if (date) {
        return date;
      }
    }
    return null;
  }

  const record = value as Record<string, unknown>;
  const datePublished = record.datePublished;
  if (typeof datePublished === "string") {
    return parseDate(datePublished);
  }

  for (const nested of Object.values(record)) {
    const date = dateFromJsonLd(nested);
    if (date) {
      return date;
    }
  }

  return null;
};

export const parsePublishedAt = parseDate;

export const extractPublishedAtFromHtml = (html: string): string | null => {
  const $ = load(html);

  for (const element of $('script[type="application/ld+json"]').toArray()) {
    try {
      const date = dateFromJsonLd(JSON.parse($(element).text()));
      if (date) {
        return date;
      }
    } catch {
      // Ignore invalid JSON-LD blocks.
    }
  }

  const metaDate =
    $('meta[property="article:published_time"]').attr("content") ||
    $('meta[name="article:published_time"]').attr("content");
  if (metaDate) {
    return parseDate(metaDate);
  }

  const timeDate = $("time[datetime]").first().attr("datetime");
  if (timeDate) {
    return parseDate(timeDate);
  }

  for (const element of $(".story-head p").toArray()) {
    const date = parseDate($(element).text());
    if (date) {
      return date;
    }
  }

  return null;
};

export const extractTitleFromHtml = (html: string): string | null => {
  const $ = load(html);

  for (const element of $('script[type="application/ld+json"]').toArray()) {
    try {
      const headline = textFromJsonLd(JSON.parse($(element).text()), "headline");
      if (headline) {
        return headline;
      }
    } catch {
      // Ignore invalid JSON-LD blocks.
    }
  }

  const metaTitle =
    $('meta[property="og:title"]').attr("content") ||
    $('meta[name="twitter:title"]').attr("content");
  if (metaTitle?.trim()) {
    return decodeHtml(metaTitle.trim());
  }

  const pageTitle = $("h1").first().text().trim();
  if (pageTitle) {
    return pageTitle;
  }

  return null;
};
