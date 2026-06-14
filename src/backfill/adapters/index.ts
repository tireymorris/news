import "../../providers";

export type {
  ApBackfillProgress,
  BackfillAdapter,
  BackfillProgress,
  BackfillProvider,
  BackfillRequest,
  DayBackfillResult,
  SourceCounts,
} from "./types";
export { nprBackfillAdapter, createNprBackfill, nprProvider } from "./npr";
export {
  AP_EARLIEST_MONTH,
  apNewsBackfillAdapter,
  apNewsProvider,
  createApNewsBackfill,
  clearApMonthArticlesCache,
  clearApRequirementCache,
  fetchApArticlesForMonth,
  hasApSitemapForMonth,
  hasDedicatedApSitemapForMonth,
  isApStorySitemapUrl,
  isApSyndicationArticle,
  parseApSitemapIndex,
  parseApSitemapIndexForMonth,
  resolveApRequirement,
  shouldAttemptAp,
  titleFromApUrl,
} from "./ap";

import {
  backfillProviders,
  selectBackfillProviders,
} from "../../providers";

export const backfillAdapters = backfillProviders();
export { backfillProviders, selectBackfillProviders };
