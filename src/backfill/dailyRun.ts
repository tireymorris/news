import { existsSync, readFileSync, writeFileSync } from "fs";
import { datesBackward, storeBackfillDay } from "./backfill";
import { dayArticleCounts, minDailyArticles, validateDay } from "./validateDay";
import { hasApSitemapForMonth } from "./adapters";
import {
  enqueueRetry,
  normalizeMonthlyState,
  retryWaitMs,
  selectNextMonth,
  sleep,
  type MonthlyState,
} from "./monthlyScheduler";

const STATE_FILE = process.env.BACKFILL_STATE_FILE || "backfill.state.json";
const LEGACY_STATE_FILE = "backfill-monthly.state.json";
const END_DATE =
  process.env.BACKFILL_END_DATE || new Date().toISOString().slice(0, 10);
const FLOOR_DATE = process.env.BACKFILL_FLOOR_DATE || "2010-01-01";
const SLEEP_MS = Number(process.env.BACKFILL_SLEEP_MS || "500");
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const saveState = (state: MonthlyState) => {
  writeFileSync(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`);
};

const loadState = (): MonthlyState => {
  const readState = (path: string): MonthlyState => {
    if (!existsSync(path)) {
      return { completed: [], retry: {} };
    }

    return normalizeMonthlyState(
      JSON.parse(readFileSync(path, "utf8")) as {
        completed?: string[];
        retry?: MonthlyState["retry"];
        failed?: Record<string, string[]>;
      },
    );
  };

  if (!existsSync(STATE_FILE) && existsSync(LEGACY_STATE_FILE)) {
    const state = readState(LEGACY_STATE_FILE);
    saveState(state);
    return state;
  }

  return readState(STATE_FILE);
};

const dayOnlyState = (state: MonthlyState): MonthlyState => ({
  completed: state.completed.filter((entry) => DATE_KEY_PATTERN.test(entry)),
  retry: Object.fromEntries(
    Object.entries(state.retry).filter(([entry]) =>
      DATE_KEY_PATTERN.test(entry),
    ),
  ),
});

const logDay = (
  date: string,
  message: string,
  extra?: Record<string, unknown>,
) => {
  const suffix = extra ? ` ${JSON.stringify(extra)}` : "";
  console.log(`[${date}] ${message}${suffix}`);
};

type DayAttemptResult =
  | { status: "complete" }
  | { status: "retry"; issues: string[] };

const tryDayOnce = async (
  date: string,
  retryAttempt?: number,
): Promise<DayAttemptResult> => {
  try {
    const requireAp = await hasApSitemapForMonth(date.slice(0, 7));
    const precheck = validateDay(date, { requireAp });
    if (precheck.ok) {
      return { status: "complete" };
    }

    const attemptLabel =
      retryAttempt && retryAttempt > 1 ? ` · retry #${retryAttempt}` : "";
    logDay(
      date,
      `starting${attemptLabel} · need ≥${minDailyArticles()} per source · gaps: ${precheck.issues.join("; ")}`,
    );

    const result = await storeBackfillDay(date, precheck.sparseSources, {
      sleepMs: SLEEP_MS,
    });

    if (result.nprInserted > 0) {
      logDay(date, "NPR ingested", {
        inserted: result.nprInserted,
        db: dayArticleCounts(date).npr,
      });
    }

    if (result.apInserted > 0) {
      logDay(date, "AP ingested", {
        inserted: result.apInserted,
        db: dayArticleCounts(date).ap,
      });
    }

    const validation = validateDay(date, { requireAp });
    if (validation.ok) {
      logDay(date, "complete", {
        npr: validation.counts.npr,
        ap: validation.counts.ap,
      });
      return { status: "complete" };
    }

    logDay(date, "still sparse", {
      npr: validation.counts.npr,
      ap: validation.counts.ap,
      issues: validation.issues,
    });
    return { status: "retry", issues: validation.issues };
  } catch (error) {
    const issue = error instanceof Error ? error.message : String(error);
    logDay(date, "attempt failed · queued for retry", { issue });
    return { status: "retry", issues: [issue] };
  }
};

const run = async () => {
  const state = dayOnlyState(loadState());
  const completed = new Set(state.completed);
  const dates = datesBackward(END_DATE, FLOOR_DATE);

  console.log(
    `Backfill: ${dates.length} days from ${END_DATE} backward to ${FLOOR_DATE}`,
  );
  console.log(
    `Progress: ${completed.size}/${dates.length} days complete, ${Object.keys(state.retry).length} queued for retry`,
  );

  while (completed.size < dates.length) {
    const date = selectNextMonth(dates, completed, state.retry);
    if (!date) {
      const waitMs = retryWaitMs(dates, completed, state.retry);
      const queued = Object.keys(state.retry).filter((key) => !completed.has(key));
      console.log(
        `Waiting ${waitMs}ms for retry backoff (${queued.length} queued, ${completed.size}/${dates.length} complete)`,
      );
      await sleep(Math.max(waitMs, 1000));
      continue;
    }

    const result = await tryDayOnce(date, state.retry[date]?.attempts);
    if (result.status === "complete") {
      completed.add(date);
      state.completed = [...completed].sort().reverse();
      delete state.retry[date];
      saveState(state);

      if (completed.size % 25 === 0 || completed.size === dates.length) {
        console.log(
          `Progress: ${completed.size}/${dates.length} days complete · next: ${selectNextMonth(dates, completed, state.retry) ?? "waiting on retry backoff"} · ${Object.keys(state.retry).length} queued for retry`,
        );
      }
      continue;
    }

    const entry = enqueueRetry(state.retry, date, result.issues);
    saveState(state);
    logDay(date, "queued for retry, continuing backward", entry);
  }

  console.log(`Backfill complete through ${FLOOR_DATE}.`);
};

await run();
