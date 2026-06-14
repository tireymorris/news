import { existsSync, readFileSync, writeFileSync } from "fs";
import { normalizeState, type BackfillState } from "./scheduler";

export const STATE_FILE = process.env.BACKFILL_STATE_FILE || "backfill.state.json";
const LEGACY_STATE_FILE = "backfill-monthly.state.json";
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const saveState = (state: BackfillState) => {
  writeFileSync(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`);
};

const readState = (path: string): BackfillState => {
  if (!existsSync(path)) {
    return { completed: [], retry: {} };
  }

  return normalizeState(
    JSON.parse(readFileSync(path, "utf8")) as {
      completed?: string[];
      retry?: BackfillState["retry"];
      failed?: Record<string, string[]>;
    },
  );
};

export const loadState = (): BackfillState => {
  if (!existsSync(STATE_FILE) && existsSync(LEGACY_STATE_FILE)) {
    const state = readState(LEGACY_STATE_FILE);
    saveState(state);
    return state;
  }

  return readState(STATE_FILE);
};

export const dayOnlyState = (state: BackfillState): BackfillState => ({
  completed: state.completed.filter((entry) => DATE_KEY_PATTERN.test(entry)),
  retry: Object.fromEntries(
    Object.entries(state.retry).filter(([entry]) =>
      DATE_KEY_PATTERN.test(entry),
    ),
  ),
});
