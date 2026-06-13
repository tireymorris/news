export interface NewsSource {
  name: string;
  url: string;
  listSelector: string;
  titleSelector?: string;
  linkSelector?: string;
  publishedAtSelector?: string;
  publishedAtAttribute?: string;
  detailPublishedAtSelector?: string;
  baseUrl?: string;
  limit?: number;
}

export const newsSources: NewsSource[] = [
  {
    name: "NPR",
    url: "https://text.npr.org/1001",
    listSelector: "ul > li > a",
    detailPublishedAtSelector: ".story-head p",
    baseUrl: "https://text.npr.org",
  },
  {
    name: "AP News",
    url: "https://apnews.com/us-news",
    listSelector: "div.PagePromo",
    titleSelector: "h3 a.Link span.PagePromoContentIcons-text",
    linkSelector: "h3 a.Link",
    publishedAtSelector: "bsp-timestamp[data-timestamp]",
    publishedAtAttribute: "data-timestamp",
    baseUrl: "https://apnews.com",
  },
];
