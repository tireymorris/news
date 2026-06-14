import { datesBackward, storeBackfillDay } from "./backfill";
import { dayArticleCounts, minDailyArticles, validateDay } from "./validateDay";
import { resolveApRequirement, type ApBackfillProgress } from "./adapters";
import {
  enqueueRetry,
  retryWaitMs,
  selectNextPending,
  sleep,
} from "./scheduler";
import { dayOnlyState, loadState, saveState } from "./state";

const END_DATE =
  process.env.BACKFILL_END_DATE || new Date().toISOString().slice(0, 10);
const FLOOR_DATE = process.env.BACKFILL_FLOOR_DATE || "2010-01-01";
const SLEEP_MS = Number(process.env.BACKFILL_SLEEP_MS || "500");
const NETWORK_STREAK_PAUSE_THRESHOLD = 3;

const isNetworkIssue = (message: string): boolean =>
  message.includes("TimeoutError") ||
  message.includes("Unable to connect") ||
  message.includes("typo in the url") ||
  message.includes("ECONNRESET") ||
  message.includes("connection");

const networkPauseMs = (streak: number): number =>
  Math.min(5000 * 2 ** Math.max(streak - NETWORK_STREAK_PAUSE_THRESHOLD, 0), 60000);

const logDay = (
  date: string,
  message: string,
  extra?: Record<string, unknown>,
) => {
  const suffix = extra ? ` ${JSON.stringify(extra)}` : "";
  console.log(`[${date}] ${message}${suffix}`);
};

const logApScan = (date: string, progress: ApBackfillProgress) => {
  if (progress.processedUrls === 0) {
    logDay(date, `AP scan starting · ${progress.totalUrls} candidate URLs`);
    return;
  }

  const percent = ((progress.processedUrls / progress.totalUrls) * 100).toFixed(
    1,
  );
  logDay(
    date,
    `AP scan ${progress.processedUrls}/${progress.totalUrls} (${percent}%) · ${progress.matchedArticles} matched`,
  );
};

type DayAttemptResult =
  | { status: "complete" }
  | { status: "retry"; issues: string[] };

const tryDayOnce = async (
  date: string,
  retryAttempt?: number,
): Promise<DayAttemptResult> => {
  const month = date.slice(0, 7);
  const requireAp = await resolveApRequirement(month);
  const precheck = validateDay(date, { requireAp });

  if (precheck.ok) {
    return { status: "complete" };
  }

  try {
    const attemptLabel =
      retryAttempt && retryAttempt > 1 ? ` · retry #${retryAttempt}` : "";
    logDay(
      date,
      `starting${attemptLabel} · unfetched sources · gaps: ${precheck.issues.join("; ")}`,
    );

    const ingestSources = precheck.sparseSources.filter(
      (source) => source !== "AP News" || requireAp,
    );

    const result = await storeBackfillDay(date, ingestSources, {
      sleepMs: SLEEP_MS,
      onApProgress: (progress) => logApScan(date, progress),
    });

    if (result.nprAttempted) {
      logDay(date, "NPR fetched", {
        inserted: result.nprInserted,
        db: dayArticleCounts(date).npr,
      });
    }

    if (result.apAttempted) {
      logDay(date, "AP fetched", {
        inserted: result.apInserted,
        db: dayArticleCounts(date).ap,
      });
    }

    const counts = dayArticleCounts(date);
    const minArticles = minDailyArticles();
    const nprSatisfied =
      counts.npr >= minArticles || (result.nprAttempted && ingestSources.includes("NPR"));
    const apSatisfied =
      !requireAp ||
      counts.ap >= minArticles ||
      (result.apAttempted && ingestSources.includes("AP News"));

    if (nprSatisfied && apSatisfied) {
      logDay(date, "complete", {
        npr: counts.npr,
        ap: counts.ap,
      });
      return { status: "complete" };
    }

    const validation = validateDay(date, { requireAp });
    logDay(date, "still unfetched", {
      npr: counts.npr,
      ap: counts.ap,
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

  let consecutiveNetworkFailures = 0;

  while (completed.size < dates.length) {
    const date = selectNextPending(dates, completed, state.retry);
    if (!date) {
      const waitMs = retryWaitMs(dates, completed, state.retry);
      const queued = Object.keys(state.retry).filter((key) => !completed.has(key));
      console.log(
        `Waiting ${waitMs}ms for retry backoff (${queued.length} queued, ${completed.size}/${dates.length} complete)`,
      );
      await sleep(Math.max(waitMs, 1000));
      consecutiveNetworkFailures = 0;
      continue;
    }

    const result = await tryDayOnce(date, state.retry[date]?.attempts);
    if (result.status === "complete") {
      completed.add(date);
      state.completed = [...completed].sort().reverse();
      delete state.retry[date];
      saveState(state);
      consecutiveNetworkFailures = 0;

      if (completed.size % 25 === 0 || completed.size === dates.length) {
        console.log(
          `Progress: ${completed.size}/${dates.length} days complete · next: ${selectNextPending(dates, completed, state.retry) ?? "waiting on retry backoff"} · ${Object.keys(state.retry).length} queued for retry`,
        );
      }
      continue;
    }

    const entry = enqueueRetry(state.retry, date, result.issues);
    saveState(state);
    logDay(date, "queued for retry, continuing backward", entry);

    if (result.issues.some(isNetworkIssue)) {
      consecutiveNetworkFailures += 1;
      if (consecutiveNetworkFailures >= NETWORK_STREAK_PAUSE_THRESHOLD) {
        const pauseMs = networkPauseMs(consecutiveNetworkFailures);
        console.log(
          `Network errors on ${consecutiveNetworkFailures} consecutive days, pausing ${pauseMs}ms before continuing`,
        );
        await sleep(pauseMs);
      }
    } else {
      consecutiveNetworkFailures = 0;
    }
  }

  console.log(`Backfill complete through ${FLOOR_DATE}.`);
};

await run();
