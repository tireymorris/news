import { existsSync, readFileSync, writeFileSync } from "fs";
import { monthBounds, monthsBackward } from "./month";
import { storeBackfillMonth } from "./backfill";
import { validateMonth } from "./validateMonth";
import { hasApSitemapForMonth } from "./adapters";
import { sleep } from "./retry";
import {
  enqueueRetry,
  normalizeMonthlyState,
  retryWaitMs,
  selectNextMonth,
  type MonthlyState,
} from "./monthlyScheduler";

const STATE_FILE = process.env.BACKFILL_STATE_FILE || "backfill.state.json";
const LEGACY_STATE_FILE = "backfill-monthly.state.json";
const END_MONTH = process.env.BACKFILL_END_MONTH || "2026-06";
const FLOOR_MONTH = process.env.BACKFILL_FLOOR_MONTH || "2010-01";
const SLEEP_MS = Number(process.env.BACKFILL_SLEEP_MS || "500");

const loadState = (): MonthlyState => {
  const stateFile = existsSync(STATE_FILE)
    ? STATE_FILE
    : existsSync(LEGACY_STATE_FILE)
      ? LEGACY_STATE_FILE
      : STATE_FILE;

  if (!existsSync(stateFile)) {
    return { completed: [], retry: {} };
  }

  return normalizeMonthlyState(
    JSON.parse(readFileSync(stateFile, "utf8")) as {
      completed?: string[];
      retry?: MonthlyState["retry"];
      failed?: Record<string, string[]>;
    },
  );
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

type MonthAttemptResult =
  | { status: "complete" }
  | { status: "retry"; issues: string[] };

const tryMonthOnce = async (month: string): Promise<MonthAttemptResult> => {
  try {
    const requireAp = await hasApSitemapForMonth(month);
    const precheck = validateMonth(month, { requireAp });
    if (precheck.ok) {
      logMonth(month, "validation already passes", { counts: precheck.counts });
      return { status: "complete" };
    }

    logMonth(month, "backfill attempt", monthBounds(month));

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
      onApProgress: ({ processedUrls, totalUrls, matchedArticles }) => {
        if (processedUrls === 0) {
          logMonth(month, "AP sitemap loaded", { totalUrls });
          return;
        }

        const percent = ((processedUrls / totalUrls) * 100).toFixed(1);
        logMonth(month, "AP article scan", {
          processedUrls,
          totalUrls,
          percent,
          matchedArticles,
        });
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

    if (validation.ok) {
      return { status: "complete" };
    }

    return { status: "retry", issues: validation.issues };
  } catch (error) {
    const issue = error instanceof Error ? error.message : String(error);
    logMonth(month, "attempt failed, queued for retry", { issue });
    return { status: "retry", issues: [issue] };
  }
};

const run = async () => {
  const state = loadState();
  const completed = new Set(state.completed);
  const months = monthsBackward(END_MONTH, FLOOR_MONTH);

  console.log(
    `Monthly backfill: ${months.length} months from ${END_MONTH} to ${FLOOR_MONTH}`,
  );
  console.log(
    `Progress: ${completed.size}/${months.length} months complete, ${Object.keys(state.retry).length} queued for retry`,
  );

  while (completed.size < months.length) {
    const month = selectNextMonth(months, completed, state.retry);
    if (!month) {
      const waitMs = retryWaitMs(months, completed, state.retry);
      const queued = Object.keys(state.retry).filter((key) => !completed.has(key));
      console.log(
        `Waiting ${waitMs}ms for retry backoff (${queued.length} queued, ${completed.size}/${months.length} complete)`,
      );
      await sleep(Math.max(waitMs, 1000));
      continue;
    }

    const result = await tryMonthOnce(month);
    if (result.status === "complete") {
      completed.add(month);
      state.completed = [...completed].sort().reverse();
      delete state.retry[month];
      saveState(state);
      logMonth(month, "marked complete");
      console.log(
        `Progress: ${completed.size}/${months.length} months complete, ${Object.keys(state.retry).length} queued for retry`,
      );
      continue;
    }

    const entry = enqueueRetry(state.retry, month, result.issues);
    saveState(state);
    logMonth(month, "queued for retry, continuing with other months", entry);
  }

  console.log(`Monthly backfill complete through ${FLOOR_MONTH}.`);
};

await run();
