import { backfillAdapters } from "./adapters";
import { selectBackfillAdapters, storeBackfillRange } from "./backfill";

const args = Bun.argv.slice(2);
const positionalArgs = args.filter((arg) => !arg.startsWith("--"));
const sourceArg = args
  .find((arg) => arg.startsWith("--source="))
  ?.replace("--source=", "");
const sleepMs = Number(
  args
    .find((arg) => arg.startsWith("--sleep-ms="))
    ?.replace("--sleep-ms=", "") || "0",
);
const startDate = positionalArgs[0];
const endDate = positionalArgs[1] || startDate;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

if (!startDate || !datePattern.test(startDate) || !datePattern.test(endDate)) {
  console.error(
    "Usage: bun run src/backfill/run.ts YYYY-MM-DD [YYYY-MM-DD] [--source=NPR|AP News] [--sleep-ms=250]",
  );
  process.exit(1);
}

const adapters = selectBackfillAdapters(backfillAdapters, sourceArg);
if (adapters.length === 0) {
  console.error(`No backfill adapter found for source: ${sourceArg}`);
  process.exit(1);
}

const insertedArticles = await storeBackfillRange(
  startDate,
  endDate,
  adapters,
  {
    sleepMs,
  },
);
const sourceDescription = sourceArg ? ` for ${sourceArg}` : "";
console.log(
  `Inserted ${insertedArticles.length} backfilled articles${sourceDescription} from ${startDate} through ${endDate}.`,
);
