export interface NewsSource {
  name: string;
  url: string;
  listSelector: string;
  titleSelector?: string;
  baseUrl?: string;
  limit?: number;
}

export const newsSources: NewsSource[] = [
  {
    name: "NPR",
    url: "https://text.npr.org/1001",
    listSelector: "ul > li > a",
    baseUrl: "https://text.npr.org",
  },
  {
    name: "AP News",
    url: "https://apnews.com/us-news",
    listSelector: "div.PagePromo-content a.Link",
    titleSelector: "span.PagePromoContentIcons-text",
    baseUrl: "https://apnews.com",
  },
];
