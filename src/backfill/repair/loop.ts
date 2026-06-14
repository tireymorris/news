import type { Article } from "models/article";
import { defaultSleep, repairFetchText, type FetchText } from "../fetch";

export interface RepairProgress {
  processed: number;
  repaired: number;
  total: number;
}

export interface RepairArticleOptions {
  fetchText?: FetchText;
  sleepMs?: number;
  sleep?: (milliseconds: number) => Promise<void>;
  onProgress?: (progress: RepairProgress) => void;
}

export const repairArticles = async (
  articles: Article[],
  {
    fetchText = repairFetchText,
    sleepMs = 500,
    sleep = defaultSleep,
    onProgress,
    repairOne,
    onError,
  }: RepairArticleOptions & {
    repairOne: (
      article: Article,
      html: string,
    ) => Promise<boolean> | boolean;
    onError?: (article: Article, error: unknown) => void;
  },
): Promise<number> => {
  let repaired = 0;

  for (const [index, article] of articles.entries()) {
    try {
      const html = await fetchText(article.link);
      if (await repairOne(article, html)) {
        repaired += 1;
      }
    } catch (error) {
      onError?.(article, error);
    }

    onProgress?.({
      processed: index + 1,
      repaired,
      total: articles.length,
    });

    if (sleepMs > 0 && index < articles.length - 1) {
      await sleep(sleepMs);
    }
  }

  return repaired;
};

export const logRepairProgress = (
  label: string,
  { processed, repaired, total }: RepairProgress,
  interval = 50,
) => {
  if (processed === 1 || processed % interval === 0 || processed === total) {
    const percent = ((processed / total) * 100).toFixed(1);
    console.log(
      `${label}: ${processed}/${total} processed (${percent}%), ${repaired} repaired`,
    );
  }
};
