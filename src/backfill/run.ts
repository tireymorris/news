import { backfillAdapters } from "./adapters";
import { selectBackfillAdapters, storeBackfillRange } from "./backfill";

const positionalArgs = Bun.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const sourceArg = Bun.argv
  .slice(2)
  .find((arg) => arg.startsWith("--source="))
  ?.replace("--source=", "");
const startDate = positionalArgs[0];
const endDate = positionalArgs[1] || startDate;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

if (!startDate || !datePattern.test(startDate) || !datePattern.test(endDate)) {
  console.error(
    "Usage: bun run src/backfill/run.ts YYYY-MM-DD [YYYY-MM-DD] [--source=NPR|AP News]",
  );
  process.exit(1);
}

const adapters = selectBackfillAdapters(backfillAdapters, sourceArg);
if (adapters.length === 0) {
  console.error(`No backfill adapter found for source: ${sourceArg}`);
  process.exit(1);
}

const insertedArticles = await storeBackfillRange(startDate, endDate, adapters);
const sourceDescription = sourceArg ? ` for ${sourceArg}` : "";
console.log(
  `Inserted ${insertedArticles.length} backfilled articles${sourceDescription} from ${startDate} through ${endDate}.`,
);
