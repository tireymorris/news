import { backfillAdapters } from "./adapters";
import { selectBackfillAdapters, storeBackfillRange } from "./backfill";
import { cleanupApBackfill } from "./repair/cleanupAp";
import { repairStoredApTitles } from "./repair/apTitles";
import { repairStoredPublishedAt } from "./repair/publishedAt";
import { saveState, STATE_FILE } from "./state";

const args = Bun.argv.slice(2);
const command = args[0] ?? "daily";
const commandArgs = args.slice(1);

const flagValue = (name: string, fallback: string) =>
  commandArgs
    .find((arg) => arg.startsWith(`${name}=`))
    ?.replace(`${name}=`, "") ?? fallback;

const runDaily = async () => {
  const restartDelay = Number(process.env.BACKFILL_RESTART_DELAY || "30");

  while (true) {
    const proc = Bun.spawn(["bun", "run", "src/backfill/dailyRun.ts"], {
      stdout: "inherit",
      stderr: "inherit",
    });
    const exitCode = await proc.exited;
    if (exitCode === 0) {
      break;
    }

    console.error(`backfill exited, restarting in ${restartDelay}s`);
    await Bun.sleep(restartDelay * 1000);
  }
};

const runRange = async () => {
  const positionalArgs = commandArgs.filter((arg) => !arg.startsWith("--"));
  const sourceArg = flagValue("--source", "");
  const sleepMs = Number(flagValue("--sleep-ms", "0"));
  const startDate = positionalArgs[0];
  const endDate = positionalArgs[1] || startDate;
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;

  if (!startDate || !datePattern.test(startDate) || !datePattern.test(endDate)) {
    console.error(
      "Usage: backfill range YYYY-MM-DD [YYYY-MM-DD] [--source=NPR|AP News] [--sleep-ms=250]",
    );
    process.exit(1);
  }

  const adapters = selectBackfillAdapters(
    backfillAdapters,
    sourceArg || undefined,
  );
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
      onProgress: ({ date, processedDates, inserted, totalDates }) => {
        if (
          processedDates === 1 ||
          processedDates % 10 === 0 ||
          processedDates === totalDates
        ) {
          const percent = ((processedDates / totalDates) * 100).toFixed(1);
          console.log(
            `backfill${sourceArg ? ` for ${sourceArg}` : ""}: ${date} (${processedDates}/${totalDates}, ${percent}%), inserted ${inserted}`,
          );
        }
      },
    },
  );

  console.log(
    `Inserted ${insertedArticles.length} backfilled articles${sourceArg ? ` for ${sourceArg}` : ""} from ${startDate} through ${endDate}.`,
  );
};

const runReset = () => {
  saveState({ completed: [], retry: {} });
  console.log(`Reset ${STATE_FILE}`);
};

const runRepairPublishedAt = async () => {
  const source = flagValue("--source", "") || undefined;
  const sleepMs = Number(flagValue("--sleep-ms", "500"));
  const repaired = await repairStoredPublishedAt({ source, sleepMs });
  console.log(
    `Repaired published_at for ${repaired} articles${source ? ` for ${source}` : ""}.`,
  );
};

const runRepairApTitles = async () => {
  const repaired = await repairStoredApTitles();
  console.log(`Repaired ${repaired} AP article titles.`);
};

const runCleanupAp = async () => {
  const result = await cleanupApBackfill();
  console.log(JSON.stringify(result));
};

const usage = () => {
  console.error(`Usage: bun run src/backfill/cli.ts <command>

Commands:
  daily                     Run daily backfill loop (default)
  range <start> [end]       Backfill a date range
  reset                     Reset backfill state
  repair-published-at       Repair published_at from detail pages
  repair-ap-titles          Repair AP titles from slug fallbacks
  cleanup-ap                Remove corrupt AP backfill data`);
  process.exit(1);
};

switch (command) {
  case "daily":
    await runDaily();
    break;
  case "range":
    await runRange();
    break;
  case "reset":
    runReset();
    break;
  case "repair-published-at":
    await runRepairPublishedAt();
    break;
  case "repair-ap-titles":
    await runRepairApTitles();
    break;
  case "cleanup-ap":
    await runCleanupAp();
    break;
  case "help":
  case "--help":
  case "-h":
    usage();
    break;
  default:
    console.error(`Unknown command: ${command}`);
    usage();
}
