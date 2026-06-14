import db from "@/db";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { isApSyndicationArticle, resolveApRequirement } from "./adapters";
import { validateDay } from "./validateDay";

const STATE_FILE = process.env.BACKFILL_STATE_FILE || "backfill.state.json";
const CORRUPT_INGEST_DATE =
  process.env.BACKFILL_CORRUPT_INGEST_DATE || "2026-06-14";

const run = async () => {
  const deletedByIngest = db
    .prepare(
      `DELETE FROM articles WHERE source = 'AP News' AND date(created_at) = ?`,
    )
    .run(CORRUPT_INGEST_DATE).changes;

  const apArticles = db
    .prepare(`SELECT id, link FROM articles WHERE source = 'AP News'`)
    .all() as { id: string; link: string }[];

  const deleteArticle = db.prepare(`DELETE FROM articles WHERE id = ?`);
  let deletedSyndication = 0;

  for (const article of apArticles) {
    if (!isApSyndicationArticle(article.link)) {
      continue;
    }

    deleteArticle.run(article.id);
    deletedSyndication += 1;
  }

  if (!existsSync(STATE_FILE)) {
    console.log(
      JSON.stringify({ deletedByIngest, deletedSyndication, stateRemoved: 0 }),
    );
    return;
  }

  const state = JSON.parse(readFileSync(STATE_FILE, "utf8")) as {
    completed?: string[];
    retry?: Record<string, unknown>;
  };
  const completed = state.completed ?? [];
  const kept: string[] = [];
  const removed: string[] = [];
  const apRequirementByMonth = new Map<string, boolean>();

  for (const date of completed) {
    const month = date.slice(0, 7);
    let requireAp = apRequirementByMonth.get(month);

    if (requireAp === undefined) {
      requireAp = await resolveApRequirement(month);
      apRequirementByMonth.set(month, requireAp);
    }

    if (validateDay(date, { requireAp }).ok) {
      kept.push(date);
      continue;
    }

    removed.push(date);
  }

  writeFileSync(
    STATE_FILE,
    `${JSON.stringify({ completed: kept, retry: state.retry ?? {} }, null, 2)}\n`,
  );

  console.log(
    JSON.stringify({
      deletedByIngest,
      deletedSyndication,
      stateKept: kept.length,
      stateRemoved: removed.length,
      oldestKept: kept.at(-1) ?? null,
      newestRemoved: removed[0] ?? null,
    }),
  );
};

run();
