#!/usr/bin/env bash
set -euo pipefail

timestamp="$(date +%Y%m%d_%H%M%S)"
log="${BACKFILL_LOG:-backfill-monthly-${timestamp}.log}"
pid_file="${BACKFILL_PID_FILE:-backfill-monthly-${timestamp}.pid}"

nohup bun run src/backfill/monthlyRun.ts >"$log" 2>&1 &
echo $! >"$pid_file"

echo "Started monthly backfill pid=$(cat "$pid_file")"
echo "Log: $log"
echo "State: ${BACKFILL_STATE_FILE:-backfill-monthly.state.json}"
