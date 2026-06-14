import { createApNewsBackfill } from "../backfill/adapters/ap";
import { createNprBackfill } from "../backfill/adapters/npr";
import { registerNewsProvider } from "./registry";

// Register providers here. To add a new source:
// 1. Implement backfill in backfill/adapters/<id>.ts (optional)
// 2. Add a registerNewsProvider({ id, name, live?, style?, backfill? }) entry below

registerNewsProvider({
  id: "npr",
  name: "NPR",
  live: {
    url: "https://text.npr.org/1001",
    listSelector: "ul > li > a",
    detailPublishedAtSelector: ".story-head p",
    baseUrl: "https://text.npr.org",
  },
  style: {
    color: { h: 200, s: 70, l: 45 },
    background: { h: 200, s: 70, l: 97 },
  },
  backfill: createNprBackfill("NPR"),
});

registerNewsProvider({
  id: "ap",
  name: "AP News",
  live: {
    url: "https://apnews.com/us-news",
    listSelector: "div.PagePromo",
    titleSelector: "h3 a.Link span.PagePromoContentIcons-text",
    linkSelector: "h3 a.Link",
    publishedAtSelector: "bsp-timestamp[data-timestamp]",
    publishedAtAttribute: "data-timestamp",
    baseUrl: "https://apnews.com",
  },
  style: {
    color: { h: 0, s: 85, l: 45 },
    background: { h: 0, s: 85, l: 97 },
  },
  backfill: createApNewsBackfill("AP News"),
});
