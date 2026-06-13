#!/usr/bin/env bash
set -euo pipefail

restart_delay="${BACKFILL_RESTART_DELAY:-30}"

while true; do
  if bun run src/backfill/dailyRun.ts; then
    break
  fi

  echo "backfill exited, restarting in ${restart_delay}s" >&2
  sleep "$restart_delay"
done
