import db from "@/db";
import { providerById } from "@/providers";
import { existsSync } from "fs";
import { isApSyndicationArticle } from "../adapters";
import { loadState, saveState } from "../state";
import { validateDay } from "../validateDay";

const apSourceName = () => providerById("ap")!.name;

const CORRUPT_INGEST_DATE =
  process.env.BACKFILL_CORRUPT_INGEST_DATE || "2026-06-14";

export const cleanupApBackfill = async () => {
  const sourceName = apSourceName();
  const deletedByIngest = db
    .prepare(
      `DELETE FROM articles WHERE source = ? AND date(created_at) = ?`,
    )
    .run(sourceName, CORRUPT_INGEST_DATE).changes;

  const apArticles = db
    .prepare(`SELECT id, link FROM articles WHERE source = ?`)
    .all(sourceName) as { id: string; link: string }[];

  const deleteArticle = db.prepare(`DELETE FROM articles WHERE id = ?`);
  let deletedSyndication = 0;

  for (const article of apArticles) {
    if (!isApSyndicationArticle(article.link)) {
      continue;
    }

    deleteArticle.run(article.id);
    deletedSyndication += 1;
  }

  if (!existsSync(process.env.BACKFILL_STATE_FILE || "backfill.state.json")) {
    return { deletedByIngest, deletedSyndication, stateKept: 0, stateRemoved: 0 };
  }

  const state = loadState();
  const kept: string[] = [];
  const removed: string[] = [];
  const apRequirementByMonth = new Map<string, boolean>();

  for (const date of state.completed) {
    const month = date.slice(0, 7);
    let requireAp = apRequirementByMonth.get(month);

    if (requireAp === undefined) {
      const apProvider = providerById("ap");
      requireAp = apProvider?.backfill?.requireCoverage
        ? await apProvider.backfill.requireCoverage(month)
        : false;
      apRequirementByMonth.set(month, requireAp);
    }

    if (validateDay(date, { requireCoverage: { [sourceName]: requireAp } }).ok) {
      kept.push(date);
      continue;
    }

    removed.push(date);
  }

  saveState({ completed: kept, retry: state.retry ?? {} });

  return {
    deletedByIngest,
    deletedSyndication,
    stateKept: kept.length,
    stateRemoved: removed.length,
    oldestKept: kept.at(-1) ?? null,
    newestRemoved: removed[0] ?? null,
  };
};
