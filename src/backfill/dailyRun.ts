import "./providers";

import { backfillDates, storeBackfillDay } from "./backfill";
import { dayArticleCounts, minDailyArticles, validateDay } from "./validateDay";
import {
  resolveProviderPlans,
  type BackfillProgress,
  type BackfillProvider,
} from "./providers";
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

const logProviderProgress = (
  date: string,
  provider: BackfillProvider,
  progress: BackfillProgress,
) => {
  const label = provider.progressLabel ?? provider.name;
  if (progress.processedUrls === 0) {
    logDay(date, `${label} starting · ${progress.totalUrls} candidate URLs`);
    return;
  }

  const percent = ((progress.processedUrls / progress.totalUrls) * 100).toFixed(
    1,
  );
  logDay(
    date,
    `${label} ${progress.processedUrls}/${progress.totalUrls} (${percent}%) · ${progress.matchedArticles} matched`,
  );
};

const coverageRequirements = (
  plans: Awaited<ReturnType<typeof resolveProviderPlans>>,
) =>
  Object.fromEntries(
    plans.map((plan) => [plan.provider.name, plan.requireCoverage]),
  );

const attemptSources = (plans: Awaited<ReturnType<typeof resolveProviderPlans>>) =>
  plans.filter((plan) => plan.shouldAttempt).map((plan) => plan.provider.name);

type DayAttemptResult =
  | { status: "complete" }
  | { status: "retry"; issues: string[] };

const tryDayOnce = async (
  date: string,
  retryAttempt?: number,
): Promise<DayAttemptResult> => {
  const month = date.slice(0, 7);
  const plans = await resolveProviderPlans(month);
  const requireCoverage = coverageRequirements(plans);
  const counts = dayArticleCounts(date);
  const precheck = validateDay(date, { requireCoverage });
  const needsAttempt = plans.some(
    (plan) =>
      plan.shouldAttempt &&
      plan.requireCoverage &&
      (counts[plan.provider.name] ?? 0) === 0,
  );

  if (precheck.ok && !needsAttempt) {
    return { status: "complete" };
  }

  try {
    const attemptLabel =
      retryAttempt && retryAttempt > 1 ? ` · retry #${retryAttempt}` : "";
    logDay(
      date,
      `starting${attemptLabel} · unfetched sources · gaps: ${precheck.issues.join("; ")}`,
    );

    const ingestSources = [
      ...precheck.sparseSources,
      ...attemptSources(plans).filter(
        (source) => !precheck.sparseSources.includes(source),
      ),
    ];

    const uniqueSources = [...new Set(ingestSources)];
    const result = await storeBackfillDay(date, uniqueSources, {
      sleepMs: SLEEP_MS,
      onProviderProgress: (provider, progress) =>
        logProviderProgress(date, provider, progress),
    });

    for (const [source, outcome] of Object.entries(result)) {
      if (!outcome.attempted) {
        continue;
      }

      logDay(date, `${source} fetched`, {
        inserted: outcome.inserted,
        db: dayArticleCounts(date)[source],
      });
    }

    const refreshedCounts = dayArticleCounts(date);
    const minArticles = minDailyArticles();
    const allSatisfied = plans.every((plan) => {
      const count = refreshedCounts[plan.provider.name] ?? 0;
      const attempted = result[plan.provider.name]?.attempted ?? false;

      return (
        !plan.requireCoverage ||
        count >= minArticles ||
        (attempted && uniqueSources.includes(plan.provider.name))
      );
    });

    if (allSatisfied) {
      logDay(date, "complete", refreshedCounts);
      return { status: "complete" };
    }

    const validation = validateDay(date, { requireCoverage });
    logDay(date, "still unfetched", {
      ...refreshedCounts,
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
  const dates = backfillDates(FLOOR_DATE, END_DATE);

  for (const date of [...completed]) {
    const month = date.slice(0, 7);
    const plans = await resolveProviderPlans(month);
    const counts = dayArticleCounts(date);
    const stale = plans.some(
      (plan) =>
        plan.requireCoverage && (counts[plan.provider.name] ?? 0) === 0,
    );

    if (stale) {
      completed.delete(date);
    }
  }
  state.completed = [...completed].sort();
  saveState(state);

  console.log(
    `Backfill: ${dates.length} days from ${FLOOR_DATE} forward to ${END_DATE}`,
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
      state.completed = [...completed].sort();
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
    logDay(date, "queued for retry, continuing forward", entry);

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

  console.log(`Backfill complete through ${END_DATE}.`);
};

await run();
