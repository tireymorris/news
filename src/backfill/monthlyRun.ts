import { existsSync, readFileSync, writeFileSync } from "fs";
import { monthBounds, monthsBackward } from "./month";
import { storeBackfillMonth } from "./backfill";
import { validateMonth } from "./validateMonth";
import { hasApSitemapForMonth } from "./adapters";

const STATE_FILE = process.env.BACKFILL_STATE_FILE || "backfill-monthly.state.json";
const END_MONTH = process.env.BACKFILL_END_MONTH || "2026-06";
const FLOOR_MONTH = process.env.BACKFILL_FLOOR_MONTH || "2010-01";
const SLEEP_MS = Number(process.env.BACKFILL_SLEEP_MS || "500");
const MAX_RETRIES = Number(process.env.BACKFILL_MAX_RETRIES || "2");

interface MonthlyState {
  completed: string[];
  failed: Record<string, string[]>;
}

const loadState = (): MonthlyState => {
  if (!existsSync(STATE_FILE)) {
    return { completed: [], failed: {} };
  }

  return JSON.parse(readFileSync(STATE_FILE, "utf8")) as MonthlyState;
};

const saveState = (state: MonthlyState) => {
  writeFileSync(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`);
};

const logMonth = (
  month: string,
  message: string,
  extra?: Record<string, unknown>,
) => {
  const suffix = extra ? ` ${JSON.stringify(extra)}` : "";
  console.log(`[${month}] ${message}${suffix}`);
};

const backfillAndValidateMonth = async (
  month: string,
  attempt: number,
): Promise<{ ok: boolean; issues: string[] }> => {
  const bounds = monthBounds(month);
  logMonth(month, `backfill attempt ${attempt}`, bounds);

  const result = await storeBackfillMonth(month, {
    sleepMs: SLEEP_MS,
    onProgress: ({ date, processedDates, inserted, totalDates }) => {
      if (
        processedDates === 1 ||
        processedDates % 10 === 0 ||
        processedDates === totalDates
      ) {
        logMonth(month, `NPR day ${date}`, {
          processedDates,
          totalDates,
          inserted,
        });
      }
    },
  });

  logMonth(month, "backfill inserted", {
    nprInserted: result.nprInserted,
    apInserted: result.apInserted,
    requireAp: result.requireAp,
  });

  const validation = validateMonth(month, { requireAp: result.requireAp });
  logMonth(month, validation.ok ? "validation passed" : "validation failed", {
    counts: validation.counts,
    issues: validation.issues,
  });

  return { ok: validation.ok, issues: validation.issues };
};

const run = async () => {
  const state = loadState();
  const completed = new Set(state.completed);
  const months = monthsBackward(END_MONTH, FLOOR_MONTH);

  console.log(
    `Monthly backfill: ${months.length} months from ${END_MONTH} to ${FLOOR_MONTH}`,
  );

  for (const month of months) {
    if (completed.has(month)) {
      logMonth(month, "skip already completed");
      continue;
    }

    const requireAp = await hasApSitemapForMonth(month);
    const precheck = validateMonth(month, { requireAp });
    if (precheck.ok) {
      logMonth(month, "skip backfill, validation already passes", {
        counts: precheck.counts,
      });
      completed.add(month);
      state.completed = [...completed].sort().reverse();
      saveState(state);
      continue;
    }

    let ok = false;
    let issues: string[] = [];

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
      ({ ok, issues } = await backfillAndValidateMonth(month, attempt));
      if (ok) {
        break;
      }
    }

    if (!ok) {
      state.failed[month] = issues;
      saveState(state);
      console.error(`Stopping at ${month}: ${issues.join(", ")}`);
      process.exit(1);
    }

    completed.add(month);
    state.completed = [...completed].sort().reverse();
    delete state.failed[month];
    saveState(state);
    logMonth(month, "marked complete");
  }

  console.log(`Monthly backfill complete through ${FLOOR_MONTH}.`);
};

await run();
