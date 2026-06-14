import { describe, expect, it } from "bun:test";
import { extractPublishedAtFromHtml, extractTitleFromHtml } from "../src/util/publishedDate";

describe("extractPublishedAtFromHtml", () => {
  it("reads JSON-LD datePublished", () => {
    const html = `<script type="application/ld+json">[{"@type":"NewsArticle","datePublished":"2010-01-01T14:08:00-05:00"}]</script>`;

    expect(extractPublishedAtFromHtml(html)).toBe("2010-01-01T19:08:00.000Z");
  });

  it("reads NPR full-site JSON-LD datePublished with timezone offsets", () => {
    const html = `<script type="application/ld+json">{"@type":"NewsArticle","datePublished":"2010-01-01T14:08:00-05:00","dateModified":"2020-01-01T00:00:00-05:00"}</script>`;

    expect(extractPublishedAtFromHtml(html)).toBe("2010-01-01T19:08:00.000Z");
  });

  it("reads AP article published meta tags", () => {
    const html = `<meta property="article:published_time" content="2026-06-13T11:33:27">`;

    expect(extractPublishedAtFromHtml(html)).toBe("2026-06-13T11:33:27.000Z");
  });

  it("treats AP timezone-less published meta tags as UTC", () => {
    const html = `<meta property="article:published_time" content="2026-06-13T11:33:27">`;

    expect(extractPublishedAtFromHtml(html)).toBe("2026-06-13T11:33:27.000Z");
  });

  it("reads NPR text article dates with bullet separators and timezone labels", () => {
    const html = `<div class="story-head"><p>By Someone</p><p>Saturday, June 13, 2026 • 8:00 AM EDT</p></div>`;

    expect(extractPublishedAtFromHtml(html)).toBe("2026-06-13T12:00:00.000Z");
  });
});

describe("extractTitleFromHtml", () => {
  it("reads JSON-LD headline", () => {
    const html = `<script type="application/ld+json">{"@type":"NewsArticle","headline":"Trump's Mideast trip dodges human rights concerns"}</script>`;

    expect(extractTitleFromHtml(html)).toBe(
      "Trump's Mideast trip dodges human rights concerns",
    );
  });

  it("reads og:title with HTML entities", () => {
    const html = `<meta property="og:title" content="Trump&#x27;s Mideast trip splashes out on deals and diplomacy but is quiet on human rights">`;

    expect(extractTitleFromHtml(html)).toBe(
      "Trump's Mideast trip splashes out on deals and diplomacy but is quiet on human rights",
    );
  });
});
