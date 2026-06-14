import type { FetchText } from "../fetch";

export interface ApBackfillProgress {
  processedUrls: number;
  totalUrls: number;
  matchedArticles: number;
}

export interface BackfillRequest {
  date: string;
  fetchText?: FetchText;
  sleepMs?: number;
  sleep?: (milliseconds: number) => Promise<void>;
  onApProgress?: (progress: ApBackfillProgress) => void;
}

export interface BackfillAdapter {
  name: string;
  fetchArticles: (request: BackfillRequest) => Promise<import("models/article").Article[]>;
}
