export type {
  ApBackfillProgress,
  BackfillAdapter,
  BackfillRequest,
} from "./types";
export { nprBackfillAdapter } from "./npr";
export {
  apNewsBackfillAdapter,
  clearApMonthArticlesCache,
  clearApRequirementCache,
  fetchApArticlesForMonth,
  hasApSitemapForMonth,
  isApSyndicationArticle,
  parseApSitemapIndex,
  resolveApRequirement,
  titleFromApUrl,
} from "./ap";

import { apNewsBackfillAdapter } from "./ap";
import { nprBackfillAdapter } from "./npr";

export const backfillAdapters = [nprBackfillAdapter, apNewsBackfillAdapter];
