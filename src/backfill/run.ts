import { storeBackfillRange } from "./backfill";

const startDate = Bun.argv[2];
const endDate = Bun.argv[3] || startDate;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

if (!startDate || !datePattern.test(startDate) || !datePattern.test(endDate)) {
  console.error("Usage: bun run src/backfill/run.ts YYYY-MM-DD [YYYY-MM-DD]");
  process.exit(1);
}

const insertedArticles = await storeBackfillRange(startDate, endDate);
console.log(
  `Inserted ${insertedArticles.length} backfilled articles from ${startDate} through ${endDate}.`,
);
