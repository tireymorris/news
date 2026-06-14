import type { Article } from "models/article";
import type { FetchText } from "../backfill/fetch";

export interface HslColor {
  h: number;
  s: number;
  l: number;
}

export interface ProviderStyle {
  color: HslColor;
  background: HslColor;
}

export interface LiveSourceConfig {
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

export interface BackfillProgress {
  processedUrls: number;
  totalUrls: number;
  matchedArticles: number;
}

export interface BackfillRequest {
  date: string;
  fetchText?: FetchText;
  sleepMs?: number;
  sleep?: (milliseconds: number) => Promise<void>;
  onProgress?: (progress: BackfillProgress) => void;
}

export interface BackfillCapabilities {
  fetchArticles: (request: BackfillRequest) => Promise<Article[]>;
  shouldAttempt?: (month: string) => Promise<boolean>;
  requireCoverage?: (month: string) => Promise<boolean>;
  fetchMonth?: (
    month: string,
    options: Omit<BackfillRequest, "date">,
  ) => Promise<Article[]>;
  progressLabel?: string;
  clearCaches?: () => void;
}

export interface NewsProvider {
  id: string;
  name: string;
  live?: LiveSourceConfig;
  style?: ProviderStyle;
  backfill?: BackfillCapabilities;
}

export type SourceCounts = Record<string, number>;

export type DayBackfillResult = Record<
  string,
  { inserted: number; attempted: boolean }
>;
