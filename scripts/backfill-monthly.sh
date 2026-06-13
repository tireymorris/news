#!/usr/bin/env bash
set -euo pipefail

log="${BACKFILL_LOG:-backfill-monthly.log}"
pid_file="${BACKFILL_PID_FILE:-backfill-monthly.pid}"
restart_delay="${BACKFILL_RESTART_DELAY:-30}"
state_file="${BACKFILL_STATE_FILE:-backfill-monthly.state.json}"

if [[ -f "$pid_file" ]]; then
  existing_pid="$(cat "$pid_file")"
  if kill -0 "$existing_pid" 2>/dev/null; then
    echo "Monthly backfill already running pid=$existing_pid"
    echo "Log: $log"
    echo "State: $state_file"
    exit 0
  fi
fi

(
  echo "$(date -Is) supervisor started"
  while true; do
    echo "$(date -Is) launching monthly backfill"
    if bun run src/backfill/monthlyRun.ts; then
      echo "$(date -Is) monthly backfill finished"
      break
    fi

    echo "$(date -Is) monthly backfill exited, restarting in ${restart_delay}s"
    sleep "$restart_delay"
  done
) >>"$log" 2>&1 &

supervisor_pid=$!
echo "$supervisor_pid" >"$pid_file"

echo "Started monthly backfill supervisor pid=$supervisor_pid"
echo "Log: $log"
echo "State: $state_file"
