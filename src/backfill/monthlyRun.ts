import { existsSync, readFileSync, writeFileSync } from "fs";
import { monthsBackward } from "./month";
import { storeBackfillMonth } from "./backfill";
import { validateMonth, monthArticleCounts, minMonthlyArticles } from "./validateMonth";
import { hasApSitemapForMonth } from "./adapters";
import {
  enqueueRetry,
  normalizeMonthlyState,
  retryWaitMs,
  selectNextMonth,
  sleep,
  type MonthlyState,
} from "./monthlyScheduler";
import type { BackfillProgress } from "./backfill";
import type { ApBackfillProgress } from "./adapters";

const STATE_FILE = process.env.BACKFILL_STATE_FILE || "backfill.state.json";
const LEGACY_STATE_FILE = "backfill-monthly.state.json";
const END_MONTH = process.env.BACKFILL_END_MONTH || "2026-06";
const FLOOR_MONTH = process.env.BACKFILL_FLOOR_MONTH || "2010-01";
const SLEEP_MS = Number(process.env.BACKFILL_SLEEP_MS || "500");

const saveState = (state: MonthlyState) => {
  writeFileSync(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`);
};

const loadState = (): MonthlyState => {
  if (!existsSync(STATE_FILE) && existsSync(LEGACY_STATE_FILE)) {
    const state = normalizeMonthlyState(
      JSON.parse(readFileSync(LEGACY_STATE_FILE, "utf8")) as {
        completed?: string[];
        retry?: MonthlyState["retry"];
        failed?: Record<string, string[]>;
      },
    );
    saveState(state);
    return state;
  }

  if (!existsSync(STATE_FILE)) {
    return { completed: [], retry: {} };
  }

  return normalizeMonthlyState(
    JSON.parse(readFileSync(STATE_FILE, "utf8")) as {
      completed?: string[];
      retry?: MonthlyState["retry"];
      failed?: Record<string, string[]>;
    },
  );
};

const logMonth = (
  month: string,
  message: string,
  extra?: Record<string, unknown>,
) => {
  const suffix = extra ? ` ${JSON.stringify(extra)}` : "";
  console.log(`[${month}] ${message}${suffix}`);
};

const logNprDay = (month: string, progress: BackfillProgress) => {
  const counts = monthArticleCounts(month);
  const day = `${progress.processedDates}/${progress.totalDates}`;

  if (progress.skipped) {
    logMonth(
      month,
      `NPR ${day} ${progress.date} · skipped (${progress.error}) · db npr=${counts.npr}`,
    );
    return;
  }

  const found =
    progress.discovered === progress.inserted
      ? `${progress.discovered} found`
      : `${progress.discovered} found, ${progress.inserted} new`;
  logMonth(
    month,
    `NPR ${day} ${progress.date} · ${found} · run +${progress.monthInserted} · db npr=${counts.npr}`,
  );
};

const logApScan = (month: string, progress: ApBackfillProgress) => {
  if (progress.processedUrls === 0) {
    logMonth(
      month,
      `AP starting · ${progress.totalUrls} article URLs to scan`,
    );
    return;
  }

  const percent = ((progress.processedUrls / progress.totalUrls) * 100).toFixed(
    1,
  );
  logMonth(
    month,
    `AP ${progress.processedUrls}/${progress.totalUrls} (${percent}%) · ${progress.matchedArticles} matched`,
  );
};

type MonthAttemptResult =
  | { status: "complete" }
  | { status: "retry"; issues: string[] };

const tryMonthOnce = async (
  month: string,
  retryAttempt?: number,
): Promise<MonthAttemptResult> => {
  try {
    const requireAp = await hasApSitemapForMonth(month);
    const precheck = validateMonth(month, { requireAp });
    if (precheck.ok) {
      logMonth(month, "already complete", {
        npr: precheck.counts.npr,
        ap: precheck.counts.ap,
      });
      return { status: "complete" };
    }

    const attemptLabel =
      retryAttempt && retryAttempt > 1 ? ` · retry #${retryAttempt}` : "";
    logMonth(
      month,
      `starting${attemptLabel} · need ≥${minMonthlyArticles()} per source · gaps: ${precheck.issues.join("; ")}`,
    );

    const result = await storeBackfillMonth(month, {
      sleepMs: SLEEP_MS,
      onPhase: (phase, detail) => {
        if (phase === "npr-start") {
          logMonth(
            month,
            `NPR phase · ${detail?.startDate}..${detail?.endDate} (${detail?.days} days, sleep ${detail?.sleepMs}ms)`,
          );
          return;
        }

        if (phase === "npr-done") {
          logMonth(month, `NPR phase done · +${detail?.inserted} inserted this run`);
          return;
        }

        if (phase === "ap-start") {
          logMonth(month, "AP phase · loading monthly sitemaps");
          return;
        }

        if (phase === "ap-done") {
          logMonth(month, `AP phase done · +${detail?.inserted} inserted this run`);
          return;
        }

        if (phase === "ap-skip") {
          logMonth(month, "AP phase skipped · no sitemap for this month");
        }
      },
      onProgress: (progress) => logNprDay(month, progress),
      onApProgress: (progress) => logApScan(month, progress),
    });

    const validation = validateMonth(month, { requireAp: result.requireAp });
    if (validation.ok) {
      logMonth(month, "validation passed", {
        npr: validation.counts.npr,
        ap: validation.counts.ap,
      });
      return { status: "complete" };
    }

    logMonth(month, "validation failed", {
      npr: validation.counts.npr,
      ap: validation.counts.ap,
      issues: validation.issues,
    });
    return { status: "retry", issues: validation.issues };
  } catch (error) {
    const issue = error instanceof Error ? error.message : String(error);
    logMonth(month, "attempt failed · queued for retry", { issue });
    return { status: "retry", issues: [issue] };
  }
};

const run = async () => {
  const state = loadState();
  const completed = new Set(state.completed);
  const months = monthsBackward(END_MONTH, FLOOR_MONTH);

  console.log(
    `Backfill: ${months.length} months from ${END_MONTH} to ${FLOOR_MONTH}`,
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

    const result = await tryMonthOnce(
      month,
      state.retry[month]?.attempts,
    );
    if (result.status === "complete") {
      completed.add(month);
      state.completed = [...completed].sort().reverse();
      delete state.retry[month];
      saveState(state);
      logMonth(month, "marked complete");
      console.log(
        `Progress: ${completed.size}/${months.length} months complete · next: ${selectNextMonth(months, completed, state.retry) ?? "waiting on retry backoff"} · ${Object.keys(state.retry).length} queued for retry`,
      );
      continue;
    }

    const entry = enqueueRetry(state.retry, month, result.issues);
    saveState(state);
    logMonth(month, "queued for retry, continuing with other months", entry);
  }

  console.log(`Backfill complete through ${FLOOR_MONTH}.`);
};

await run();
